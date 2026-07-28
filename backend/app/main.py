from __future__ import annotations

import io
import json
import zipfile

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .analysis import (
    classify_pixel,
    classify_roi,
    closest_mapping_entry_by_thickness,
    compute_contrast,
    compute_substrate_intensity,
    grayscale_intensity,
    load_rgb_image,
)
from .ml_model import model_status, predict_thickness, train_linear_model
from .models import AnalyzeResponse, MaterialMapping, ModelEstimation, PixelEstimation, Roi
from .storage import get_mapping, list_materials, mapping_exists, save_uploaded_mapping

app = FastAPI(title="Nanomaterial Thickness API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/materials")
def materials() -> dict[str, list[str]]:
    return {"materials": list_materials()}


@app.get("/materials/{material}/mapping/status")
def material_mapping_status(material: str) -> dict[str, object]:
    exists = mapping_exists(material)
    if not exists:
        return {"material": material, "exists": False}

    mapping = get_mapping(material)
    return {
        "material": material,
        "exists": True,
        "source": mapping.source,
        "version": mapping.version,
        "entries": len(mapping.entries),
    }


@app.get("/materials/{material}/mapping")
def material_mapping(material: str) -> dict[str, object]:
    if not mapping_exists(material):
        raise HTTPException(status_code=404, detail=f"No mapping for material '{material}'")
    mapping = get_mapping(material)
    return mapping.model_dump()


@app.get("/materials/{material}/model/status")
def material_model_status(material: str) -> dict[str, object]:
    return model_status(material)


@app.post("/materials/{material}/model/train")
async def train_model(material: str, dataset_file: UploadFile = File(...)) -> dict[str, object]:
    if not dataset_file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Dataset must be a .csv file")

    data = await dataset_file.read()
    try:
        trained = train_linear_model(material, data)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {
        "message": f"Model trained for material '{material}'",
        "rows": trained["rows"],
        "model_type": trained["model_type"],
        "degree": trained["degree"],
        "alpha": trained["alpha"],
        "mae": trained["mae"],
        "rmse": trained["rmse"],
        "r2": trained["r2"],
        "validation_mae": trained["validation_mae"],
    }


@app.post("/materials/{material}/mapping/upload")
async def upload_mapping(material: str, mapping_file: UploadFile = File(...)) -> dict[str, str]:
    if not mapping_file.filename.endswith(".json"):
        raise HTTPException(status_code=400, detail="Mapping must be a .json file")

    raw = await mapping_file.read()
    try:
        payload = json.loads(raw.decode("utf-8"))
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid JSON: {exc.msg}") from exc

    payload["material"] = material
    payload["source"] = "uploaded"

    try:
        mapping = MaterialMapping.model_validate(payload)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"Invalid mapping schema: {exc}") from exc

    save_uploaded_mapping(mapping)
    return {"message": f"Mapping uploaded for material '{material}'"}


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_image(
    image: UploadFile = File(...),
    material: str = Form(...),
    x: int = Form(...),
    y: int = Form(...),
    roi_json: str | None = Form(default=None),
    substrate_roi_json: str | None = Form(default=None),
) -> AnalyzeResponse:
    if not mapping_exists(material):
        raise HTTPException(
            status_code=404,
            detail=f"No mapping for material '{material}'. Upload mapping first.",
        )

    mapping = get_mapping(material)
    image_bytes = await image.read()
    rgb_image = load_rgb_image(image_bytes)
    intensity = grayscale_intensity(rgb_image)

    height, width, _ = rgb_image.shape
    if x < 0 or y < 0 or x >= width or y >= height:
        raise HTTPException(status_code=400, detail="Requested pixel is outside image bounds")

    substrate_roi = Roi.model_validate_json(substrate_roi_json) if substrate_roi_json else None
    substrate_intensity = compute_substrate_intensity(intensity, substrate_roi)

    px_rgb = tuple(int(v) for v in rgb_image[y, x, :])
    px_intensity = float(intensity[y, x])
    px_contrast = compute_contrast(px_intensity, substrate_intensity)
    best_entry, confidence = classify_pixel(px_rgb, px_contrast, mapping)
    model_pred = predict_thickness(material, px_rgb[0], px_rgb[1], px_rgb[2], px_contrast)

    pixel_result = PixelEstimation(
        x=x,
        y=y,
        rgb=[px_rgb[0], px_rgb[1], px_rgb[2]],
        contrast=px_contrast,
        label=best_entry.label,
        color_group=best_entry.color_group,
        thickness_nm=best_entry.thickness_nm,
        confidence=confidence,
    )

    model_group = None
    if model_pred:
        model_group = closest_mapping_entry_by_thickness(mapping, model_pred[0]).color_group

    roi_mean_intensity = None
    roi_mean_thickness = None
    roi_label_breakdown = None
    if roi_json:
        roi = Roi.model_validate_json(roi_json)
        roi_mean_intensity, roi_mean_thickness, roi_label_breakdown = classify_roi(
            rgb_image,
            intensity,
            roi,
            substrate_intensity,
            mapping,
        )

    return AnalyzeResponse(
        material=material,
        mapping_source=mapping.source,
        image_size={"width": width, "height": height},
        substrate_intensity=substrate_intensity,
        pixel_result=pixel_result,
        model_result=ModelEstimation(
            enabled=model_pred is not None,
            thickness_nm=model_pred[0] if model_pred else None,
            confidence=model_pred[1] if model_pred else None,
            color_group=model_group,
        ),
        roi_mean_intensity=roi_mean_intensity,
        roi_mean_thickness_nm=roi_mean_thickness,
        roi_label_breakdown=roi_label_breakdown,
    )


@app.post("/materials/{material}/dataset/from-images")
async def dataset_from_images(
    material: str,
    images: list[UploadFile] = File(...),
) -> dict[str, object]:
    if not mapping_exists(material):
        raise HTTPException(status_code=404, detail=f"No mapping for material '{material}'")

    mapping = get_mapping(material)

    image_items: list[tuple[str, bytes]] = []
    for upload in images:
        raw = await upload.read()
        name = upload.filename or "image"

        if name.lower().endswith(".zip"):
            try:
                with zipfile.ZipFile(io.BytesIO(raw)) as zf:
                    for member in zf.namelist():
                        if member.endswith("/"):
                            continue
                        if not member.lower().endswith((".png", ".jpg", ".jpeg", ".bmp", ".tif", ".tiff", ".webp")):
                            continue
                        image_items.append((member, zf.read(member)))
            except zipfile.BadZipFile as exc:
                raise HTTPException(status_code=400, detail=f"Invalid zip file: {name}") from exc
        else:
            if name.lower().endswith((".png", ".jpg", ".jpeg", ".bmp", ".tif", ".tiff", ".webp")):
                image_items.append((name, raw))

    if not image_items:
        raise HTTPException(status_code=400, detail="No supported image files were provided")

    rows: list[dict[str, object]] = []
    for idx, (name, data) in enumerate(image_items, start=1):
        rgb_image = load_rgb_image(data)
        intensity = grayscale_intensity(rgb_image)
        substrate_intensity = compute_substrate_intensity(intensity, None)

        mean_r = float(rgb_image[..., 0].mean())
        mean_g = float(rgb_image[..., 1].mean())
        mean_b = float(rgb_image[..., 2].mean())
        mean_i = float(intensity.mean())
        contrast = compute_contrast(mean_i, substrate_intensity)

        best_entry, confidence = classify_pixel((int(round(mean_r)), int(round(mean_g)), int(round(mean_b))), contrast, mapping)

        rows.append(
            {
                "image_id": f"img_{idx:05d}",
                "file_name": name,
                "label": best_entry.label,
                "color_group": best_entry.color_group,
                "r": round(mean_r, 4),
                "g": round(mean_g, 4),
                "b": round(mean_b, 4),
                "contrast": round(contrast, 6),
                "thickness_nm": round(float(best_entry.thickness_nm), 6),
                "confidence": round(float(confidence), 6),
            }
        )

    header = ["image_id", "file_name", "label", "color_group", "r", "g", "b", "contrast", "thickness_nm"]
    lines = [",".join(header)]
    for row in rows:
        lines.append(
            ",".join(
                [
                    str(row["image_id"]),
                    str(row["file_name"]).replace(",", "_"),
                    str(row["label"]),
                    str(row["color_group"]),
                    str(row["r"]),
                    str(row["g"]),
                    str(row["b"]),
                    str(row["contrast"]),
                    str(row["thickness_nm"]),
                ]
            )
        )

    return {
        "material": material,
        "count": len(rows),
        "rows": rows,
        "csv": "\n".join(lines) + "\n",
    }
