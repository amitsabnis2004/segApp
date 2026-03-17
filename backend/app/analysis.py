from __future__ import annotations

from io import BytesIO

import numpy as np
from PIL import Image

from .models import MaterialMapping, MappingEntry, Roi


def load_rgb_image(image_bytes: bytes) -> np.ndarray:
    image = Image.open(BytesIO(image_bytes)).convert("RGB")
    return np.array(image, dtype=np.uint8)


def grayscale_intensity(rgb: np.ndarray) -> np.ndarray:
    r = rgb[..., 0].astype(np.float32)
    g = rgb[..., 1].astype(np.float32)
    b = rgb[..., 2].astype(np.float32)
    return 0.299 * r + 0.587 * g + 0.114 * b


def clamp_roi(roi: Roi, width: int, height: int) -> Roi:
    x = min(max(roi.x, 0), width - 1)
    y = min(max(roi.y, 0), height - 1)
    w = min(roi.width, width - x)
    h = min(roi.height, height - y)
    return Roi(x=x, y=y, width=max(1, w), height=max(1, h))


def compute_substrate_intensity(intensity: np.ndarray, substrate_roi: Roi | None) -> float:
    height, width = intensity.shape
    if substrate_roi:
        sroi = clamp_roi(substrate_roi, width, height)
        patch = intensity[sroi.y : sroi.y + sroi.height, sroi.x : sroi.x + sroi.width]
        return float(np.mean(patch))

    edge_strip = max(2, min(width, height) // 20)
    top = intensity[:edge_strip, :]
    bottom = intensity[-edge_strip:, :]
    left = intensity[:, :edge_strip]
    right = intensity[:, -edge_strip:]
    combined = np.concatenate([top.flatten(), bottom.flatten(), left.flatten(), right.flatten()])
    return float(np.median(combined))


def compute_contrast(flake_intensity: float, substrate_intensity: float) -> float:
    eps = 1e-6
    return float((flake_intensity - substrate_intensity) / max(substrate_intensity, eps))


def _score_channel(v: int, lo: int, hi: int) -> float:
    if lo <= v <= hi:
        center = (lo + hi) / 2
        half = max(1.0, (hi - lo) / 2)
        return max(0.0, 1.0 - abs(v - center) / half)
    dist = min(abs(v - lo), abs(v - hi))
    return max(0.0, 1.0 - dist / 255)


def score_entry(rgb: tuple[int, int, int], contrast: float, entry: MappingEntry) -> float:
    r, g, b = rgb
    color = entry.color_range
    contrast_span = max(1e-6, entry.contrast_range.max - entry.contrast_range.min)

    sr = _score_channel(r, color.r_min, color.r_max)
    sg = _score_channel(g, color.g_min, color.g_max)
    sb = _score_channel(b, color.b_min, color.b_max)
    color_score = (sr + sg + sb) / 3

    if entry.contrast_range.min <= contrast <= entry.contrast_range.max:
        c_center = (entry.contrast_range.min + entry.contrast_range.max) / 2
        c_score = max(0.0, 1.0 - abs(contrast - c_center) / (contrast_span / 2 + 1e-6))
    else:
        c_dist = min(abs(contrast - entry.contrast_range.min), abs(contrast - entry.contrast_range.max))
        c_score = max(0.0, 1.0 - c_dist / max(contrast_span, 0.05))

    return float(0.6 * color_score + 0.4 * c_score)


def classify_pixel(rgb: tuple[int, int, int], contrast: float, mapping: MaterialMapping) -> tuple[MappingEntry, float]:
    best = mapping.entries[0]
    best_score = -1.0
    for entry in mapping.entries:
        score = score_entry(rgb, contrast, entry)
        if score > best_score:
            best = entry
            best_score = score
    confidence = float(min(1.0, max(0.0, best_score * best.confidence_hint)))
    return best, confidence


def classify_roi(
    rgb_image: np.ndarray,
    intensity: np.ndarray,
    roi: Roi,
    substrate_intensity: float,
    mapping: MaterialMapping,
) -> tuple[float, float, dict[str, int]]:
    height, width, _ = rgb_image.shape
    r = clamp_roi(roi, width, height)

    patch_rgb = rgb_image[r.y : r.y + r.height, r.x : r.x + r.width, :]
    patch_intensity = intensity[r.y : r.y + r.height, r.x : r.x + r.width]

    mean_intensity = float(np.mean(patch_intensity))
    contrast = compute_contrast(mean_intensity, substrate_intensity)

    thicknesses: list[float] = []
    labels: dict[str, int] = {}

    flat_rgb = patch_rgb.reshape(-1, 3)
    flat_i = patch_intensity.reshape(-1)
    for px, px_i in zip(flat_rgb, flat_i, strict=False):
        px_contrast = compute_contrast(float(px_i), substrate_intensity)
        best, _ = classify_pixel((int(px[0]), int(px[1]), int(px[2])), px_contrast, mapping)
        thicknesses.append(best.thickness_nm)
        labels[best.label] = labels.get(best.label, 0) + 1

    return mean_intensity, float(np.mean(thicknesses)), labels
