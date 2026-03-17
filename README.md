# Nanoflake Thickness Platform

A reworked full-stack application for thickness estimation of 2D nanomaterial flakes from optical microscope images.

Current focus material: hBN (hexagonal boron nitride).

## What this version delivers

1. Next.js frontend for end-user workflow.
2. FastAPI backend for image analysis and mapping lifecycle.
3. Material-aware mapping check and upload flow.
4. Mock hBN mapping to unblock prototyping.
5. Synthetic sample image generation for tests/demos.
6. Electron desktop shell support.

## Repository structure

- frontend: Next.js application.
- backend: FastAPI service, analysis logic, and tests.
- sample_data: mapping template and generated sample images.
- docs: architecture and implementation plan markdown.
- src: Electron main/preload and legacy static app files.

## Scientific method grounding

This implementation follows the common optical contrast idea used in 2D material layer identification:

1. Extract grayscale intensity from RGB.
2. Estimate substrate intensity.
3. Compute optical contrast ratio between flake and substrate.
4. Match color and contrast against material-specific calibration mapping.

References provided by project owner were reviewed at high level. Access limitations prevented full-text extraction for some sources, but the implemented pipeline aligns with the color/contrast calibration approach and is designed to be replaced by lab-calibrated mappings.

## Backend API

Base URL: http://127.0.0.1:8000

1. GET /health
2. GET /materials
3. GET /materials/{material}/mapping/status
4. POST /materials/{material}/mapping/upload
5. POST /analyze

Analyze endpoint inputs:
- image: multipart file
- material: string
- x, y: probe pixel
- roi_json: optional ROI
- substrate_roi_json: optional substrate ROI

Analyze response includes:
- pixel classification and thickness
- confidence and contrast
- optional ROI mean thickness and class breakdown

## Mapping format

See sample_data/mappings/hbn_mapping_template.json.

Required top-level fields:
- material
- version
- source
- entries

Each entry contains:
- label
- thickness_nm
- confidence_hint
- color_range (r/g/b min/max)
- contrast_range (min/max)

## Quick start

### 1) Backend setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python scripts/generate_mock_samples.py
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 2) Frontend setup

```bash
cd frontend
npm install
copy .env.example .env.local
npm run dev
```

### 3) Combined dev orchestration (from repo root)

```bash
npm install
npm run dev
```

This starts backend, frontend, and Electron shell that loads the Next.js UI.

## Testing

```bash
cd backend
python -m pytest tests
```

Tests include:
- material listing
- mapping status
- pixel analysis
- ROI analysis

## Desktop app note

Electron is currently used as a shell around the web app in development.

Recommended production options:
1. Keep Electron and package frontend build + managed backend runtime.
2. Use Tauri for smaller binaries if Rust integration is acceptable.

Given your existing codebase and team familiarity, Electron is the fastest path now.

## Current limitations and next steps

1. Mapping values are mock defaults and must be replaced with calibrated lab data.
2. Color normalization across camera/illumination setups is basic; stronger reconstruction/calibration can be added.
3. No ML model training yet; current pipeline is explainable and deterministic.
4. Add export, batch processing, and model-assisted mode in next phase.

## Related documents

- docs/architecture.md
- docs/implementation-plan.md
