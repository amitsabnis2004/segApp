from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from backend.app.main import app


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
