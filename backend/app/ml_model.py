from __future__ import annotations

import csv
import json
from pathlib import Path

import numpy as np


ROOT = Path(__file__).resolve().parents[1]
MODELS_DIR = ROOT / "data" / "models"


def _model_path(material: str) -> Path:
    return MODELS_DIR / f"{material}.json"


def model_exists(material: str) -> bool:
    return _model_path(material).exists()


def model_status(material: str) -> dict[str, object]:
    if not model_exists(material):
        return {"exists": False}

    payload = json.loads(_model_path(material).read_text(encoding="utf-8"))
    return {
        "exists": True,
        "material": payload.get("material", material),
        "rows": payload.get("rows", 0),
        "model_type": payload.get("model_type", "linear"),
        "degree": payload.get("degree", 1),
        "alpha": payload.get("alpha", 0.0),
        "features": payload.get("features", ["r", "g", "b", "contrast"]),
        "target": payload.get("target", "thickness_nm"),
        "mae": payload.get("mae"),
        "rmse": payload.get("rmse"),
        "r2": payload.get("r2"),
        "validation_mae": payload.get("validation_mae"),
    }


def _as_float(value: str, column: str) -> float:
    try:
        return float(value)
    except ValueError as exc:
        raise ValueError(f"Invalid numeric value in column '{column}': {value}") from exc


def _poly_features(x: np.ndarray, degree: int) -> np.ndarray:
    r = x[:, 0]
    g = x[:, 1]
    b = x[:, 2]
    c = x[:, 3]

    feats = [r, g, b, c]
    if degree >= 2:
        feats.extend([r * r, g * g, b * b, c * c, r * g, r * b, g * b, r * c, g * c, b * c])
    if degree >= 3:
        feats.extend([r * r * c, g * g * c, b * b * c, r * g * b, c * c * r, c * c * g, c * c * b])

    return np.stack(feats, axis=1)


def _fit_ridge(x: np.ndarray, y: np.ndarray, alpha: float) -> np.ndarray:
    x_aug = np.concatenate([np.ones((x.shape[0], 1)), x], axis=1)
    n = x_aug.shape[1]
    eye = np.eye(n)
    eye[0, 0] = 0.0
    return np.linalg.pinv(x_aug.T @ x_aug + alpha * eye) @ x_aug.T @ y


def _predict(coeff: np.ndarray, x: np.ndarray) -> np.ndarray:
    x_aug = np.concatenate([np.ones((x.shape[0], 1)), x], axis=1)
    return x_aug @ coeff


def _metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict[str, float]:
    err = y_pred - y_true
    mae = float(np.mean(np.abs(err)))
    rmse = float(np.sqrt(np.mean(err * err)))
    denom = float(np.sum((y_true - np.mean(y_true)) ** 2))
    r2 = float(1.0 - (np.sum(err * err) / denom)) if denom > 0 else 0.0
    return {"mae": mae, "rmse": rmse, "r2": r2}


def train_linear_model(material: str, csv_bytes: bytes) -> dict[str, object]:
    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    rows = list(csv.DictReader(csv_bytes.decode("utf-8").splitlines()))
    if not rows:
        raise ValueError("CSV is empty")

    expected_cols = ["r", "g", "b", "contrast", "thickness_nm"]
    for col in expected_cols:
        if col not in rows[0]:
            raise ValueError(f"CSV missing required column: {col}")

    x_vals: list[list[float]] = []
    y_vals: list[float] = []
    for row in rows:
        x_vals.append([
            _as_float(row["r"], "r"),
            _as_float(row["g"], "g"),
            _as_float(row["b"], "b"),
            _as_float(row["contrast"], "contrast"),
        ])
        y_vals.append(_as_float(row["thickness_nm"], "thickness_nm"))

    x_raw = np.array(x_vals, dtype=np.float64)
    y = np.array(y_vals, dtype=np.float64)

    if x_raw.shape[0] < 20:
        raise ValueError("Dataset too small. Provide at least 20 rows for robust training.")

    # Deterministic shuffled split for reproducibility.
    rng = np.random.default_rng(42)
    idx = np.arange(x_raw.shape[0])
    rng.shuffle(idx)

    split = max(1, int(0.8 * len(idx)))
    train_idx = idx[:split]
    val_idx = idx[split:]

    best: dict[str, object] | None = None
    for degree in (1, 2, 3):
        x_poly = _poly_features(x_raw, degree)

        mean = np.mean(x_poly[train_idx], axis=0)
        std = np.std(x_poly[train_idx], axis=0)
        std[std < 1e-9] = 1.0

        x_scaled = (x_poly - mean) / std
        x_tr = x_scaled[train_idx]
        y_tr = y[train_idx]
        x_va = x_scaled[val_idx] if len(val_idx) else x_scaled[train_idx]
        y_va = y[val_idx] if len(val_idx) else y[train_idx]

        for alpha in (0.0, 0.01, 0.1, 1.0):
            coeff = _fit_ridge(x_tr, y_tr, alpha)
            preds = _predict(coeff, x_va)
            met = _metrics(y_va, preds)
            score = met["mae"]

            if best is None or score < best["score"]:
                best = {
                    "score": score,
                    "degree": degree,
                    "alpha": alpha,
                    "coefficients": coeff,
                    "feature_mean": mean,
                    "feature_std": std,
                    "validation": met,
                }

    assert best is not None

    # Refit best config on full dataset.
    x_poly_full = _poly_features(x_raw, int(best["degree"]))
    full_mean = np.mean(x_poly_full, axis=0)
    full_std = np.std(x_poly_full, axis=0)
    full_std[full_std < 1e-9] = 1.0
    x_full_scaled = (x_poly_full - full_mean) / full_std
    coeff = _fit_ridge(x_full_scaled, y, float(best["alpha"]))
    full_preds = _predict(coeff, x_full_scaled)
    train_metrics = _metrics(y, full_preds)

    payload = {
        "material": material,
        "rows": int(x_raw.shape[0]),
        "features": ["r", "g", "b", "contrast"],
        "target": "thickness_nm",
        "model_type": "poly_ridge",
        "degree": int(best["degree"]),
        "alpha": float(best["alpha"]),
        "coefficients": coeff.tolist(),
        "feature_mean": full_mean.tolist(),
        "feature_std": full_std.tolist(),
        "mae": train_metrics["mae"],
        "rmse": train_metrics["rmse"],
        "r2": train_metrics["r2"],
        "validation_mae": float(best["validation"]["mae"]),
        "validation_rmse": float(best["validation"]["rmse"]),
        "validation_r2": float(best["validation"]["r2"]),
    }

    _model_path(material).write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return payload


def predict_thickness(material: str, r: int, g: int, b: int, contrast: float) -> tuple[float, float] | None:
    if not model_exists(material):
        return None

    payload = json.loads(_model_path(material).read_text(encoding="utf-8"))
    coeff = np.array(payload["coefficients"], dtype=np.float64)
    degree = int(payload.get("degree", 1))
    mean = np.array(payload.get("feature_mean"), dtype=np.float64)
    std = np.array(payload.get("feature_std"), dtype=np.float64)

    x_raw = np.array([[float(r), float(g), float(b), float(contrast)]], dtype=np.float64)
    x_poly = _poly_features(x_raw, degree)
    x_scaled = (x_poly - mean) / std
    pred = float(_predict(coeff, x_scaled)[0])

    mae = float(payload.get("validation_mae", payload.get("mae", 1.0)))
    confidence = float(max(0.0, min(1.0, 1.0 - (mae / 10.0))))
    return max(0.0, pred), confidence
