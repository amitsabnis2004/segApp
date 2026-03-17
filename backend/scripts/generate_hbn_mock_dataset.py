from __future__ import annotations

import csv
import json
from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "sample_data" / "mock_hbn"
CSV_PATH = OUT_DIR / "hbn_mock_train_10000.csv"
NPZ_PATH = OUT_DIR / "hbn_mock_images_10000.npz"
MANIFEST_PATH = OUT_DIR / "manifest.json"
PREVIEW_DIR = OUT_DIR / "preview_images"


GROUPS = [
    {"label": "Monolayer", "color_group": "Light Blue", "thickness": 0.33, "rgb": (190, 205, 238), "contrast": -0.05},
    {"label": "Bilayer", "color_group": "Blue", "thickness": 0.66, "rgb": (155, 180, 220), "contrast": -0.10},
    {"label": "Trilayer", "color_group": "Purple-Blue", "thickness": 1.00, "rgb": (128, 148, 210), "contrast": -0.16},
    {"label": "Few Layers", "color_group": "Green", "thickness": 2.20, "rgb": (115, 170, 150), "contrast": -0.24},
    {"label": "Bulk", "color_group": "Yellow", "thickness": 5.00, "rgb": (188, 166, 122), "contrast": -0.32},
]


def make_patch(base_rgb: tuple[int, int, int], rng: np.random.Generator, size: int = 32) -> np.ndarray:
    noise = rng.normal(0, 8, (size, size, 3))
    patch = np.array(base_rgb, dtype=np.float32).reshape(1, 1, 3) + noise

    # Add weak illumination gradient to make synthetic image less uniform.
    gx = np.linspace(-5, 5, size, dtype=np.float32)
    gy = np.linspace(-5, 5, size, dtype=np.float32)
    grad = (gx.reshape(1, size, 1) + gy.reshape(size, 1, 1)) * 0.3
    patch += grad

    return np.clip(patch, 0, 255).astype(np.uint8)


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)

    rng = np.random.default_rng(20260318)
    n_samples = 10_000

    images = np.zeros((n_samples, 32, 32, 3), dtype=np.uint8)
    rows: list[dict[str, object]] = []

    probs = np.array([0.24, 0.22, 0.20, 0.20, 0.14], dtype=np.float64)

    for i in range(n_samples):
        cls = GROUPS[int(rng.choice(len(GROUPS), p=probs))]
        patch = make_patch(cls["rgb"], rng)
        images[i] = patch

        r = float(np.mean(patch[..., 0]))
        g = float(np.mean(patch[..., 1]))
        b = float(np.mean(patch[..., 2]))
        contrast = float(cls["contrast"] + rng.normal(0, 0.015))
        thickness = float(max(0.0, cls["thickness"] + rng.normal(0, 0.08)))

        row = {
            "image_id": f"mock_{i:05d}",
            "label": cls["label"],
            "color_group": cls["color_group"],
            "r": round(r, 4),
            "g": round(g, 4),
            "b": round(b, 4),
            "contrast": round(contrast, 6),
            "thickness_nm": round(thickness, 6),
        }
        rows.append(row)

        if i < 120:
            Image.fromarray(patch).save(PREVIEW_DIR / f"{row['image_id']}.png")

    with CSV_PATH.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=["image_id", "label", "color_group", "r", "g", "b", "contrast", "thickness_nm"],
        )
        writer.writeheader()
        writer.writerows(rows)

    np.savez_compressed(NPZ_PATH, images=images)

    manifest = {
        "samples": n_samples,
        "image_shape": [32, 32, 3],
        "csv": str(CSV_PATH.relative_to(ROOT).as_posix()),
        "npz": str(NPZ_PATH.relative_to(ROOT).as_posix()),
        "preview_images": str(PREVIEW_DIR.relative_to(ROOT).as_posix()),
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    print(f"Generated dataset with {n_samples} mock images")
    print(f"CSV: {CSV_PATH}")
    print(f"NPZ: {NPZ_PATH}")


if __name__ == "__main__":
    main()
