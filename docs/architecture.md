# Nanoflake Thickness Platform Architecture

## Goal
A production-oriented structure for optical image based thickness estimation where each material has its own color and contrast calibration profile.

## High-level Components

1. Frontend (Next.js)
- Provides researcher workflow: material selection, mapping check, mapping upload, image upload, probe point and ROI setup, and result visualization.
- Calls backend through HTTP APIs.

2. Backend (FastAPI + NumPy + Pillow)
- Loads material mappings from defaults or uploaded overrides.
- Computes grayscale intensity from RGB and optional substrate normalization.
- Uses color range + optical contrast scoring for thickness classification.
- Supports pixel-level and ROI-level estimates.

3. Data Layer (JSON calibration)
- Default mock mappings in backend/data/defaults.
- User/lab uploads in backend/data/uploaded.
- Mapping upload can override defaults per material.

4. Desktop App (Electron shell)
- Wraps web UI for lab desktop usage.
- Loads Next.js UI URL in development.
- Can be extended to ship a packaged web build and managed Python runtime.

## API Flow

1. Frontend loads materials: GET /materials.
2. User picks material: GET /materials/{material}/mapping/status.
3. If missing mapping, user uploads JSON: POST /materials/{material}/mapping/upload.
4. User uploads image and analysis params: POST /analyze.
5. Backend returns pixel thickness + confidence + optional ROI summary.

## Core Estimation Pipeline

1. Decode image to RGB array.
2. Compute grayscale intensity:
I = 0.299R + 0.587G + 0.114B
3. Estimate substrate intensity from optional substrate ROI, else edge-median heuristic.
4. Compute optical contrast:
C = (If - Is) / Is
5. Score each mapping entry by RGB channel compatibility and contrast range compatibility.
6. Choose best entry and compute confidence.
7. If ROI is provided, aggregate per-pixel labels and mean ROI thickness.

## Calibration Model

Each mapping entry stores:
- layer label
- thickness in nm
- confidence hint
- RGB bounds
- optical contrast range

This keeps logic explainable and lets labs replace mock values with measured calibration tables.

## Deployment Options

1. Web-first
- Deploy FastAPI (container or VM) + Next.js.
- Good for multi-user labs.

2. Desktop-first
- Electron shell for single-station microscope setup.
- Good where internet/network access is constrained.

## Why this structure

- Material-specific and extensible beyond hBN.
- Clear migration path from heuristic rules to ML models.
- Strong separation between UI and scientific computation.
- Supports both experimentation and productization.
