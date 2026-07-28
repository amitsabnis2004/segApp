from __future__ import annotations

import json
from pathlib import Path

from .models import MaterialMapping


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MAPPINGS_DIR = ROOT / "data" / "defaults"
UPLOADED_MAPPINGS_DIR = ROOT / "data" / "uploaded"


def ensure_dirs() -> None:
    UPLOADED_MAPPINGS_DIR.mkdir(parents=True, exist_ok=True)


def _read_mapping_file(path: Path) -> MaterialMapping:
    raw = json.loads(path.read_text(encoding="utf-8"))
    return MaterialMapping.model_validate(raw)


def list_materials() -> list[str]:
    ensure_dirs()
    names = {p.stem for p in DEFAULT_MAPPINGS_DIR.glob("*.json")}
    names.update({p.stem for p in UPLOADED_MAPPINGS_DIR.glob("*.json")})
    return sorted(names)


def mapping_exists(material: str) -> bool:
    ensure_dirs()
    upload = UPLOADED_MAPPINGS_DIR / f"{material}.json"
    default = DEFAULT_MAPPINGS_DIR / f"{material}.json"
    return upload.exists() or default.exists()


def get_mapping(material: str) -> MaterialMapping:
    ensure_dirs()
    upload = UPLOADED_MAPPINGS_DIR / f"{material}.json"
    default = DEFAULT_MAPPINGS_DIR / f"{material}.json"

    if upload.exists():
        return _read_mapping_file(upload)
    if default.exists():
        return _read_mapping_file(default)
    raise FileNotFoundError(f"No mapping found for material '{material}'")


def save_uploaded_mapping(mapping: MaterialMapping) -> None:
    ensure_dirs()
    path = UPLOADED_MAPPINGS_DIR / f"{mapping.material}.json"
    path.write_text(mapping.model_dump_json(indent=2), encoding="utf-8")
