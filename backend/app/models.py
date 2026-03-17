from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator


class Roi(BaseModel):
    x: int = Field(ge=0)
    y: int = Field(ge=0)
    width: int = Field(gt=0)
    height: int = Field(gt=0)


class ColorRange(BaseModel):
    r_min: int = Field(ge=0, le=255)
    r_max: int = Field(ge=0, le=255)
    g_min: int = Field(ge=0, le=255)
    g_max: int = Field(ge=0, le=255)
    b_min: int = Field(ge=0, le=255)
    b_max: int = Field(ge=0, le=255)


class ContrastRange(BaseModel):
    min: float
    max: float


class MappingEntry(BaseModel):
    label: str
    color_group: str = "Unknown"
    thickness_nm: float = Field(ge=0)
    confidence_hint: float = Field(ge=0, le=1)
    color_range: ColorRange
    contrast_range: ContrastRange


class MaterialMapping(BaseModel):
    material: str
    version: str
    source: Literal["mock", "uploaded", "calibrated"]
    notes: str = ""
    entries: list[MappingEntry] = Field(default_factory=list)

    @field_validator("entries")
    @classmethod
    def ensure_entries(cls, value: list[MappingEntry]) -> list[MappingEntry]:
        if not value:
            raise ValueError("entries must contain at least one mapping row")
        return value


class PixelEstimation(BaseModel):
    x: int
    y: int
    rgb: list[int]
    contrast: float
    label: str
    color_group: str
    thickness_nm: float
    confidence: float


class ModelEstimation(BaseModel):
    enabled: bool
    thickness_nm: float | None = None
    confidence: float | None = None
    color_group: str | None = None


class AnalyzeResponse(BaseModel):
    material: str
    mapping_source: str
    image_size: dict[str, int]
    substrate_intensity: float
    pixel_result: PixelEstimation
    model_result: ModelEstimation | None = None
    roi_mean_intensity: float | None = None
    roi_mean_thickness_nm: float | None = None
    roi_label_breakdown: dict[str, int] | None = None
