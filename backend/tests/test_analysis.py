from __future__ import annotations

import io
import json
from pathlib import Path

from fastapi.testclient import TestClient
from PIL import Image

from backend.app.main import app
from backend.app.storage import UPLOADED_MAPPINGS_DIR


client = TestClient(app)
ROOT = Path(__file__).resolve().parents[2]
SAMPLES = ROOT / "sample_data" / "images"


def test_materials_exposes_hbn() -> None:
    response = client.get("/materials")
    assert response.status_code == 200
    assert "hbn" in response.json()["materials"]


def test_mapping_status_exists() -> None:
    response = client.get("/materials/hbn/mapping/status")
    assert response.status_code == 200
    payload = response.json()
    assert payload["exists"] is True
    assert payload["entries"] >= 3


def test_analyze_sample_pixel() -> None:
    sample = SAMPLES / "hbn_mock_01.png"
    assert sample.exists(), "Run backend/scripts/generate_mock_samples.py first"

    with sample.open("rb") as f:
        response = client.post(
            "/analyze",
            data={"material": "hbn", "x": 200, "y": 170},
            files={"image": (sample.name, f, "image/png")},
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["material"] == "hbn"
    assert payload["pixel_result"]["thickness_nm"] > 0


def test_analyze_with_roi() -> None:
    sample = SAMPLES / "hbn_mock_03.png"
    assert sample.exists(), "Run backend/scripts/generate_mock_samples.py first"

    with sample.open("rb") as f:
        response = client.post(
            "/analyze",
            data={
                "material": "hbn",
                "x": 260,
                "y": 180,
                "roi_json": '{"x": 190, "y": 120, "width": 250, "height": 130}',
            },
            files={"image": (sample.name, f, "image/png")},
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["roi_mean_thickness_nm"] is not None
    assert isinstance(payload["roi_label_breakdown"], dict)


def test_train_model_and_use_in_analyze() -> None:
    rows = ["r,g,b,contrast,thickness_nm"]
    seeds = [
        (190, 205, 238, -0.045, 0.33),
        (155, 180, 220, -0.100, 0.66),
        (120, 145, 200, -0.160, 1.00),
        (95, 130, 180, -0.250, 2.20),
        (180, 165, 125, -0.320, 5.00),
    ]
    for _ in range(5):
        for r, g, b, c, t in seeds:
            rows.append(f"{r},{g},{b},{c},{t}")

    csv_content = "\n".join(rows) + "\n"

    train_resp = client.post(
        "/materials/hbn/model/train",
        files={"dataset_file": ("hbn_train.csv", csv_content.encode("utf-8"), "text/csv")},
    )
    assert train_resp.status_code == 200

    sample = SAMPLES / "hbn_mock_01.png"
    with sample.open("rb") as f:
        analyze_resp = client.post(
            "/analyze",
            data={"material": "hbn", "x": 200, "y": 170},
            files={"image": (sample.name, f, "image/png")},
        )

    assert analyze_resp.status_code == 200
    payload = analyze_resp.json()
    assert payload["model_result"]["enabled"] is True
    assert payload["model_result"]["thickness_nm"] is not None


def test_dataset_from_images_endpoint_generates_rows() -> None:
    material = "hbn-dataset-endpoint"
    mapping_path = UPLOADED_MAPPINGS_DIR / f"{material}.json"

    mapping = {
        "material": material,
        "version": "1.0",
        "source": "uploaded",
        "notes": "test mapping",
        "entries": [
            {
                "label": "Monolayer",
                "color_group": "Light Blue",
                "thickness_nm": 0.8,
                "confidence_hint": 0.9,
                "color_range": {
                    "r_min": 20,
                    "r_max": 240,
                    "g_min": 20,
                    "g_max": 240,
                    "b_min": 20,
                    "b_max": 240,
                },
                "contrast_range": {"min": -0.9, "max": 0.9},
            }
        ],
    }
    mapping_path.write_text(json.dumps(mapping), encoding="utf-8")

    try:
        image_bytes = io.BytesIO()
        Image.new("RGB", (32, 32), (120, 130, 140)).save(image_bytes, format="PNG")
        image_bytes.seek(0)

        response = client.post(
            f"/materials/{material}/dataset/from-images",
            files=[("images", ("flake.png", image_bytes.getvalue(), "image/png"))],
        )

        assert response.status_code == 200
        payload = response.json()
        assert payload["count"] == 1
        assert len(payload["rows"]) == 1
        assert payload["rows"][0]["label"] == "Monolayer"
        assert "image_id,file_name,label,color_group,r,g,b,contrast,thickness_nm" in payload["csv"]
    finally:
        if mapping_path.exists():
            mapping_path.unlink()
