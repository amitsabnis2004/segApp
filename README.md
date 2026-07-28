# HBN Thickness Analyzer

![Material Science](https://img.shields.io/badge/Material-Science-blue) ![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white) ![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat&logo=nextdotjs&logoColor=white) ![Electron](https://img.shields.io/badge/Electron-47848F?style=flat&logo=electron&logoColor=white) ![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat&logo=docker&logoColor=white)

HBN Thickness Analyzer is a full-stack application for estimating the thickness of 2D nanomaterial flakes from optical microscope images.

The current implementation is focused on hexagonal boron nitride, commonly written as hBN or h-BN. It combines an explainable optical contrast pipeline, material-specific calibration mappings, optional trained regression models, a Next.js web interface, a FastAPI backend, and an Electron shell for desktop development.

## Features

### Accurate hBN Thickness Estimation

- Pixel-level thickness classification from microscope image RGB values.
- Optical contrast calculation against an estimated substrate intensity.
- Material-aware mapping lookup for hBN layer classes.
- ROI analysis for mean thickness and class distribution over a selected region.
- Optional model-assisted thickness prediction after training with CSV data.

### Mapping-Based Scientific Workflow

- Built-in default hBN mapping in `backend/data/defaults/hbn.json`.
- Upload flow for replacing mock/default mappings with lab-calibrated JSON data.
- Mapping status endpoints for checking whether a material has usable calibration data.
- Template mapping file in `sample_data/mappings/hbn_mapping_template.json`.

### Dataset and Model Tools

- Generate synthetic hBN sample data for demos, testing, and early model experiments.
- Convert uploaded images or ZIP archives into dataset rows.
- Train a deterministic polynomial ridge regression model from CSV data.
- Persist trained model files under backend data storage.

### Modern Application Stack

- FastAPI service for image analysis, mappings, datasets, and model training.
- Next.js frontend for browser-based workflows.
- Electron Forge desktop shell for local desktop usage during development.
- Docker and Docker Compose setup for easier deployment.

## Scientific Background

Optical microscopy can be used to identify approximate 2D material thickness because flake thickness changes the observed color and contrast against the substrate. This project follows a practical calibration-driven approach:

1. Load the microscope image and normalize it into RGB data.
2. Convert each pixel to grayscale intensity.
3. Estimate substrate intensity from the whole image or a user-provided substrate ROI.
4. Compute optical contrast between the target pixel or ROI and the substrate.
5. Compare RGB and contrast values against material-specific mapping entries.
6. Optionally combine mapping output with a trained regression model.

### hBN Layer Reference

These values are practical guideposts and should be replaced or validated with lab-specific calibration data for production scientific use.

| Layer Type | Approx. Thickness | Typical Optical Appearance | Notes |
| --- | ---: | --- | --- |
| Monolayer | ~0.33 nm | Very light blue or nearly transparent | Weak optical contrast |
| Bilayer | ~0.66 nm | Light blue | Moderate optical contrast |
| Trilayer | ~1.0 nm | Blue | Stronger contrast |
| Few layers | ~1.3-3.3 nm | Blue to green transition | Depends heavily on substrate and illumination |
| Bulk / thick flake | >3.3 nm | Yellow, white, or high-density regions | Highest optical density in this simplified guide |

## System Architecture

```text
segApp/
|-- backend/
|   |-- app/
|   |   |-- main.py          # FastAPI routes
|   |   |-- analysis.py      # RGB, intensity, contrast, ROI, and mapping classification
|   |   |-- ml_model.py      # CSV training and model prediction
|   |   |-- models.py        # Pydantic schemas
|   |   `-- storage.py       # Mapping storage helpers
|   |-- data/
|   |   |-- defaults/        # Built-in mapping JSON files
|   |   |-- uploaded/        # Runtime uploaded mappings
|   |   `-- models/          # Runtime trained models
|   |-- scripts/             # Sample data generation scripts
|   |-- tests/               # Backend tests
|   `-- Dockerfile
|-- frontend/
|   |-- app/
|   |   |-- analyze/         # Image analysis workflow
|   |   |-- mappings/        # Mapping upload and model training workflow
|   |   |-- dataset-tools/   # Dataset generation workflow
|   |   |-- page.js          # Home page
|   |   `-- globals.css      # Shared styling
|   |-- public/
|   |-- next.config.js
|   `-- Dockerfile
|-- sample_data/
|   |-- images/              # Small generated demo images
|   |-- mappings/            # Mapping template
|   `-- mock_hbn/            # Larger mock training assets
|-- docs/
|   |-- architecture.md
|   `-- implementation-plan.md
|-- src/                     # Electron main/preload and legacy static app files
|-- docker-compose.yml
|-- package.json
`-- README.md
```

## Docker Deployment

Docker is the recommended path when you want the project to run the same way across machines or prepare it for server deployment.

### Prerequisites

- Docker Desktop or Docker Engine
- Docker Compose v2

### Start the Full Application

From the repository root:

```bash
docker compose up --build
```

Then open:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- Backend health check: `http://localhost:8000/health`
- API docs: `http://localhost:8000/docs`

The same command can be run through npm:

```bash
npm run docker:up
```

### Stop Containers

```bash
docker compose down
```

or:

```bash
npm run docker:down
```

### Build Images Only

```bash
docker compose build
```

or:

```bash
npm run docker:build
```

### Docker Volumes

Compose creates persistent volumes for runtime backend data:

- `backend-uploaded-mappings` stores uploaded mapping JSON files.
- `backend-trained-models` stores trained model JSON files.

This keeps uploaded calibration files and trained models available after container restarts.

To remove containers and volumes:

```bash
docker compose down -v
```

### Changing the Frontend API URL

The frontend uses `NEXT_PUBLIC_API_BASE` for browser requests. Because this is a public Next.js environment variable, it is baked into the frontend image at build time.

For local Docker Compose, the default is:

```bash
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

For deployment, set it to the public backend URL before building:

```bash
NEXT_PUBLIC_API_BASE=https://api.example.com docker compose build frontend
docker compose up -d
```

On PowerShell:

```powershell
$env:NEXT_PUBLIC_API_BASE="https://api.example.com"
docker compose build frontend
docker compose up -d
```

## Local Development

Use local development when you want hot reload, Electron desktop mode, or direct backend testing.

### Prerequisites

- Node.js 20 or newer recommended
- npm
- Python 3.12 recommended

### Backend Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

On macOS or Linux, activate the virtual environment with:

```bash
source .venv/bin/activate
```

### Frontend Setup

```bash
cd frontend
npm install
copy .env.example .env.local
npm run dev
```

On macOS or Linux:

```bash
cp .env.example .env.local
```

The frontend development server runs on `http://localhost:3000`.

### Combined Development Mode

From the repository root:

```bash
npm install
npm run dev
```

This starts:

- FastAPI backend on `127.0.0.1:8000`
- Next.js frontend on `127.0.0.1:3000`
- Electron desktop shell loading the Next.js UI

## Usage Guide

### 1. Analyze an Image

1. Start the backend and frontend.
2. Open `http://localhost:3000/analyze`.
3. Select a material such as `hbn`.
4. Upload a microscope image.
5. Choose or enter the target pixel coordinates.
6. Optionally define an ROI and substrate ROI.
7. Submit the image for analysis.

The response includes pixel classification, thickness estimate, confidence, optical contrast, substrate intensity, optional ROI mean thickness, and optional model output.

### 2. Manage Material Mappings

1. Open `http://localhost:3000/mappings`.
2. Select the material.
3. Check mapping and model status.
4. Upload a calibrated JSON mapping if needed.

Uploaded mappings override default mappings for the same material.

### 3. Generate Datasets from Images

1. Open `http://localhost:3000/dataset-tools`.
2. Select the material.
3. Upload individual images or a ZIP file of supported images.
4. Generate CSV rows containing mean RGB, contrast, labels, and thickness values.

Supported image formats include PNG, JPG, JPEG, BMP, TIFF, TIF, and WEBP.

### 4. Train a Model

Upload a CSV file with at least these columns:

```csv
r,g,b,contrast,thickness_nm
```

The model trainer requires at least 20 rows. It evaluates polynomial feature degrees and ridge regularization settings, then stores the best model for later predictions.

## Backend API

Base URL in local development: `http://127.0.0.1:8000`

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/health` | Service health check |
| GET | `/materials` | List materials with default or uploaded mappings |
| GET | `/materials/{material}/mapping/status` | Check mapping availability and metadata |
| GET | `/materials/{material}/mapping` | Fetch active mapping JSON |
| POST | `/materials/{material}/mapping/upload` | Upload mapping JSON |
| GET | `/materials/{material}/model/status` | Check trained model status |
| POST | `/materials/{material}/model/train` | Train model from CSV |
| POST | `/materials/{material}/dataset/from-images` | Generate dataset rows from images or ZIP files |
| POST | `/analyze` | Analyze a target image pixel and optional ROI |

### Analyze Request

`POST /analyze` accepts multipart form data:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `image` | File | Yes | Microscope image |
| `material` | String | Yes | Material key, for example `hbn` |
| `x` | Integer | Yes | Target pixel x coordinate |
| `y` | Integer | Yes | Target pixel y coordinate |
| `roi_json` | JSON string | No | ROI for mean thickness analysis |
| `substrate_roi_json` | JSON string | No | ROI used to estimate substrate intensity |

Example ROI JSON:

```json
{
  "x": 10,
  "y": 20,
  "width": 100,
  "height": 80
}
```

### Analyze Response Includes

- Material and active mapping source.
- Image width and height.
- Estimated substrate intensity.
- Pixel RGB, contrast, label, color group, thickness, and confidence.
- Optional model prediction and confidence.
- Optional ROI mean intensity, mean thickness, and label breakdown.

## Mapping Format

Use `sample_data/mappings/hbn_mapping_template.json` as the starting point for calibrated mappings.

Required top-level fields:

- `material`
- `version`
- `source`
- `entries`

Each entry should include:

- `label`
- `color_group`
- `thickness_nm`
- `confidence_hint`
- `color_range`
- `contrast_range`

Example entry shape:

```json
{
  "label": "monolayer",
  "color_group": "light_blue",
  "thickness_nm": 0.33,
  "confidence_hint": 0.7,
  "color_range": {
    "r": { "min": 180, "max": 240 },
    "g": { "min": 190, "max": 245 },
    "b": { "min": 200, "max": 255 }
  },
  "contrast_range": {
    "min": -0.08,
    "max": 0.08
  }
}
```

## Sample Data

Small demo images are available in:

```text
sample_data/images/
```

Mock training assets are available in:

```text
sample_data/mock_hbn/
```

Generate or refresh mock samples with:

```bash
npm run samples:generate
```

or directly:

```bash
python backend/scripts/generate_mock_samples.py
```

## Testing

Run backend tests from the repository root:

```bash
npm run test:backend
```

or from the backend directory:

```bash
cd backend
python -m pytest tests
```

Current tests cover:

- Material listing.
- Mapping status.
- Pixel analysis.
- ROI analysis.

## Production Notes

- Replace mock/default hBN mappings with lab-calibrated mappings before using the application for real measurements.
- Use a public backend URL in `NEXT_PUBLIC_API_BASE` when deploying the frontend separately from the backend.
- Keep `backend/data/uploaded` and `backend/data/models` persistent in production.
- Put the backend behind a reverse proxy or API gateway if deploying publicly.
- Review CORS settings in `backend/app/main.py` before a public deployment. Development currently allows all origins.
- Consider HTTPS termination at the reverse proxy layer.

## Current Limitations

- The default hBN mapping is a mock calibration intended to unblock prototyping.
- Optical measurements depend strongly on microscope settings, substrate, illumination, camera response, and image preprocessing.
- The model trainer is deterministic and useful for experimentation, but it is not a substitute for validated lab calibration.
- The Electron production packaging path still needs a dedicated bundled-backend strategy if desktop distribution becomes the main target.

## Related Documents

- `docs/architecture.md`
- `docs/implementation-plan.md`

## Scientific References

1. Gorbachev, R. V. et al. "Hunting for monolayer boron nitride: optical and Raman signatures." Small 7, 465-468 (2011).
2. Li, L. H. et al. "Strong oxidation resistance of atomically thin boron nitride nanosheets." ACS Nano 8, 1457-1462 (2014).
3. Watanabe, K. and Taniguchi, T. "Direct-bandgap properties and evidence for ultraviolet lasing of hexagonal boron nitride single crystal." Nature Materials 3, 404-409 (2004).

## License

MIT License.
