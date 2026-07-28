from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.app.ml_model import train_linear_model

DATASET = ROOT / "sample_data" / "mock_hbn" / "hbn_mock_train_10000.csv"


def main() -> None:
    if not DATASET.exists():
        raise FileNotFoundError(f"Dataset not found: {DATASET}")

    payload = train_linear_model("hbn", DATASET.read_bytes())
    print("Trained model for hbn")
    print(f"Rows: {payload['rows']}")
    print(f"Model: {payload['model_type']} degree={payload['degree']} alpha={payload['alpha']}")
    print(f"Train MAE: {payload['mae']:.5f} | RMSE: {payload['rmse']:.5f} | R2: {payload['r2']:.5f}")
    print(f"Val MAE: {payload['validation_mae']:.5f} | Val RMSE: {payload['validation_rmse']:.5f} | Val R2: {payload['validation_r2']:.5f}")


if __name__ == "__main__":
    main()
