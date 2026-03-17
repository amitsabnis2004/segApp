from __future__ import annotations

import json

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .analysis import (
    classify_pixel,
    classify_roi,
    compute_contrast,
    compute_substrate_intensity,
    grayscale_intensity,
    load_rgb_image,
)
from .models import AnalyzeResponse, MaterialMapping, PixelEstimation, Roi
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

    pixel_result = PixelEstimation(
        x=x,
        y=y,
        rgb=[px_rgb[0], px_rgb[1], px_rgb[2]],
        contrast=px_contrast,
        label=best_entry.label,
        thickness_nm=best_entry.thickness_nm,
        confidence=confidence,
    )

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
        roi_mean_intensity=roi_mean_intensity,
        roi_mean_thickness_nm=roi_mean_thickness,
        roi_label_breakdown=roi_label_breakdown,
    )
