# Anemia AI Tracker

> **Non-invasive, AI-powered Haemoglobin estimation from conjunctival images — under 60 seconds, end-to-end.**

A final-year project web application that estimates Haemoglobin (Hb) levels by analysing a photo of the inner lower eyelid (conjunctiva) using a custom 4-layer CNN with Grad-CAM explainability, WHO-calibrated severity classification, and hospital-grade PDF report generation.

---

## Table of Contents

- [Anemia AI Tracker](#anemia-ai-tracker)
  - [Table of Contents](#table-of-contents)
  - [Architecture Overview](#architecture-overview)
  - [Project Structure](#project-structure)
  - [Quick Start (Docker)](#quick-start-docker)
    - [Prerequisites](#prerequisites)
  - [Manual Setup](#manual-setup)
    - [Backend Setup](#backend-setup)
    - [Frontend Setup](#frontend-setup)
  - [Training the Model](#training-the-model)
    - [Option A — Synthetic data (pipeline test, no real images needed)](#option-a--synthetic-data-pipeline-test-no-real-images-needed)
    - [Option B — Real conjunctival image dataset](#option-b--real-conjunctival-image-dataset)
    - [Training pipeline stages](#training-pipeline-stages)
    - [Output files after training](#output-files-after-training)
    - [Restart backend after training](#restart-backend-after-training)
  - [API Reference](#api-reference)
    - [Health](#health)
    - [Inference](#inference)
    - [Labs](#labs)
    - [Report](#report)
  - [Clinical Design Decisions](#clinical-design-decisions)
    - [WHO Hb Thresholds (applied by `classifySeverity()`)](#who-hb-thresholds-applied-by-classifyseverity)
    - [Model Architecture](#model-architecture)
    - [Disclaimer](#disclaimer)
  - [Tech Stack](#tech-stack)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                  React Frontend (Nginx)              │
│  Home → Profile → Scan → Results → History          │
│  Camera IQA · Dashboard · Symptoms · Labs · PDF     │
└──────────────────────┬──────────────────────────────┘
                       │  REST API  /api/*
┌──────────────────────▼──────────────────────────────┐
│              FastAPI Backend (Uvicorn)               │
│                                                     │
│  /api/iqa       — Image Quality Assessment          │
│  /api/predict   — CNN Inference + Grad-CAM          │
│  /api/report    — ReportLab PDF Generation          │
│  /api/labs      — Lab Bloodwork CRUD                │
│  /api/health    — Liveness / Readiness probes       │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │         AI / ML Pipeline                   │   │
│  │  OpenCV IQA → White-Balance → CNN → Grad-CAM│   │
│  │  TensorFlow 2.15 | Custom 4-layer CNN       │   │
│  │  SMOTE balancing | Two-stage training       │   │
│  └─────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────┘
                       │  SQLAlchemy ORM
┌──────────────────────▼──────────────────────────────┐
│          PostgreSQL (prod) / SQLite (dev)           │
│  patients · scan_results · lab_logs                 │
└─────────────────────────────────────────────────────┘
```

---

## Project Structure

```
anemia-tracker/
├── docker-compose.yml          ← Full stack orchestration
├── .env.example                ← Copy to .env and fill in
│
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   ├── tailwind.config.js
│   └── src/
│       ├── App.jsx             ← Router + route guards
│       ├── context/
│       │   └── AppContext.jsx  ← Global state (useReducer)
│       ├── data/
│       │   └── remedies.json   ← Static tip database
│       ├── utils/
│       │   ├── api.js          ← Axios client
│       │   └── helpers.js      ← WHO thresholds, formatters
│       ├── components/
│       │   ├── Header.jsx
│       │   ├── StepIndicator.jsx
│       │   ├── CameraCapture.jsx   ← WebRTC + IQA + auto-capture
│       │   ├── Dashboard.jsx       ← Hb result + Grad-CAM viewer
│       │   ├── HbChart.jsx         ← Recharts trend chart
│       │   ├── SymptomChecker.jsx  ← 18-symptom toggle list
│       │   ├── LabSync.jsx         ← Bloodwork CRUD form
│       │   ├── RemediesEngine.jsx  ← Severity-mapped tips
│       │   └── PDFReport.jsx       ← jsPDF client-side report
│       └── pages/
│           ├── Home.jsx
│           ├── Profile.jsx
│           ├── Scan.jsx        ← Camera → Processing → Done
│           ├── Results.jsx     ← 6-tab dashboard
│           └── History.jsx     ← Longitudinal Hb log
│
└── backend/
    ├── Dockerfile
    ├── requirements.txt
    ├── main.py                 ← FastAPI app + lifespan
    ├── config.py               ← Pydantic settings
    ├── database.py             ← SQLAlchemy models + engine
    ├── models/
    │   ├── cnn_architecture.py ← 4-block CNN definition
    │   ├── train_model.py      ← Full training pipeline
    │   ├── inference.py        ← Predict orchestrator
    │   ├── gradcam.py          ← GradientTape Grad-CAM
    │   ├── iqa.py              ← OpenCV quality checks
    │   └── saved/              ← hb_cnn_model.h5 (after training)
    ├── routers/
    │   ├── health.py
    │   ├── predict.py
    │   ├── labs.py
    │   └── report.py
    └── data/
        └── conjunctiva/
            ├── manifest.csv    ← filename,hb,age,sex,pregnant
            └── images/
```

---

##  Quick Start (Docker)

### Prerequisites
- Docker Desktop ≥ 24 or Docker Engine + Compose v2
- 4 GB RAM minimum (TensorFlow needs ~2 GB)

```bash
# 1. Clone / unzip the project
cd anemia-tracker

# 2. Configure environment
cp .env.example .env
# Edit .env — at minimum change SECRET_KEY and POSTGRES_PASSWORD

# 3. Build and start all services
docker compose up --build

# Services will be available at:
#   Frontend  → http://localhost:3000
#   Backend   → http://localhost:8000
#   API Docs  → http://localhost:8000/docs
#   pgAdmin   → http://localhost:5050  (dev profile only)

# To start pgAdmin:
docker compose --profile dev up
```

> **First run note:** The backend starts in **mock mode** until a trained model exists.  
> Mock predictions still exercise the full frontend flow end-to-end.

---

## Manual Setup

### Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp ../.env.example ../.env
# Edit .env — set DATABASE_URL=sqlite:///./anemia_tracker.db for local dev

# Start the API server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# API docs available at:
#   http://localhost:8000/docs   (Swagger UI)
#   http://localhost:8000/redoc  (ReDoc)
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server (proxies /api to localhost:8000)
npm start

# App available at: http://localhost:3000
```

---

##  Training the Model

### Option A — Synthetic data (pipeline test, no real images needed)

```bash
cd backend
python models/train_model.py --generate_synthetic --synthetic_samples 600
```

This creates 600 colour-tinted noise images, runs the full pipeline, and saves the model to `models/saved/hb_cnn_model.h5`.

### Option B — Real conjunctival image dataset

1. Prepare your dataset:
```
backend/data/conjunctiva/
├── manifest.csv          ← Required columns: filename, hb, age, sex, pregnant
└── images/
    ├── patient_001.jpg
    ├── patient_002.jpg
    └── ...
```

2. `manifest.csv` format:
```csv
filename,hb,age,sex,pregnant
patient_001.jpg,11.2,34,female,0
patient_002.jpg,13.8,45,male,0
patient_003.jpg,9.4,28,female,1
```

3. Run training:
```bash
cd backend

# Full pipeline with SMOTE and augmentation (recommended)
python models/train_model.py \
  --data_dir data/conjunctiva \
  --epochs_s1 40 \
  --epochs_s2 20 \
  --augment \
  --smote

# Quick run without augmentation
python models/train_model.py --no_augment --no_smote --epochs_s1 10 --epochs_s2 5
```

### Training pipeline stages

| Stage | Batch Size | Learning Rate | Epochs | Purpose                         |
| ----- | ---------- | ------------- | ------ | ------------------------------- |
| 1     | 8          | 1e-4          | 40     | High-precision feature learning |
| 2     | 16         | 3e-5          | 20     | Fine-tuning + generalisation    |

### Output files after training

```
models/saved/
├── hb_cnn_model.h5          ← Final model (loaded by FastAPI on startup)
├── best_stage1.h5           ← Best checkpoint from Stage 1
├── best_stage2.h5           ← Best checkpoint from Stage 2
├── training_history.json    ← Full metrics + config
└── plots/
    └── training_curves.png  ← MAE and loss curves (both stages)
```

### Restart backend after training

```bash
# Docker
docker compose restart backend

# Manual
pkill -f uvicorn && uvicorn main:app --reload
```

---

##  API Reference

### Health

| Method | Endpoint             | Description                       |
| ------ | -------------------- | --------------------------------- |
| GET    | `/api/health`        | Liveness probe — always 200       |
| GET    | `/api/health/ready`  | Readiness — checks model + DB     |
| GET    | `/api/health/model`  | Model metadata + training history |
| GET    | `/api/health/system` | RAM, CPU, TensorFlow GPU info     |

### Inference

| Method | Endpoint                            | Description                            |
| ------ | ----------------------------------- | -------------------------------------- |
| POST   | `/api/iqa`                          | Image quality check (live camera loop) |
| POST   | `/api/predict`                      | Full Hb inference + Grad-CAM           |
| GET    | `/api/predict/history/{patient_id}` | Scan history                           |

**POST /api/predict — Request body:**
```json
{
  "image":            "data:image/jpeg;base64,/9j/4AAQ...",
  "age":              34,
  "sex":              "female",
  "pregnancy_status": false,
  "patient_id":       "optional-uuid",
  "symptoms":         ["fatigue", "dizziness"]
}
```

**POST /api/predict — Response:**
```json
{
  "hb":                 11.4,
  "severity":           "mild",
  "confidence":         0.82,
  "gradcam_image":      "data:image/png;base64,...",
  "processing_time_ms": 1340,
  "iqa_passed":         true,
  "iqa_feedback":       "Image quality acceptable",
  "wb_method":          "sclera",
  "is_mock":            false,
  "scan_id":            "uuid-string"
}
```

### Labs

| Method | Endpoint                 | Description              |
| ------ | ------------------------ | ------------------------ |
| POST   | `/api/labs`              | Save lab bloodwork entry |
| GET    | `/api/labs/{patient_id}` | Get all lab entries      |
| DELETE | `/api/labs/{lab_id}`     | Delete a lab entry       |

### Report

| Method | Endpoint      | Description                      |
| ------ | ------------- | -------------------------------- |
| POST   | `/api/report` | Generate + download clinical PDF |

---

## Clinical Design Decisions

### WHO Hb Thresholds (applied by `classifySeverity()`)

| Severity        | Male      | Female    | Pregnant  |
| --------------- | --------- | --------- | --------- |
| Normal          | ≥ 13.0    | ≥ 12.0    | ≥ 11.0    |
| Mild Anemia     | 11.0–12.9 | 10.0–11.9 | 10.0–10.9 |
| Moderate Anemia | 8.0–10.9  | 8.0–9.9   | 7.0–9.9   |
| Severe Anemia   | < 8.0     | < 8.0     | < 7.0     |

### Model Architecture

```
Input: 128×128×3 RGB + Demographics (3 features)
  │
  ├─ Conv2D(32) → BN → ReLU → MaxPool   [Block 1 — edge detection]
  ├─ Conv2D(64) → BN → ReLU → MaxPool   [Block 2 — vascular texture]
  ├─ Conv2D(128)→ BN → ReLU → MaxPool   [Block 3 — pallor patterns]
  ├─ Conv2D(256)→ BN → ReLU → MaxPool   [Block 4 — Hb proxy features]
  └─ GlobalAveragePooling
            │
            ├─ Dense(16) → Dense(8)      [Demographics branch]
            │         ↓ Concatenate
            ├─ Dense(256) → Dropout(30%)
            ├─ Dense(128) → Dropout(20%)
            ├─ Dense(64)
            └─ Dense(1, linear)          [Hb output in g/dL]

Loss: Huber(δ=1.0)   Optimizer: Adam   Metric: MAE (g/dL)
```

### Disclaimer

> **This application utilises AI-estimated Haemoglobin based on conjunctival imaging. It is an adjunctive screening tool and does not replace phlebotomy or professional medical diagnosis. Always consult a qualified healthcare professional for clinical decisions.**

---

## Tech Stack

| Layer              | Technology                 |
| ------------------ | -------------------------- |
| Frontend framework | React 18 + React Router v6 |
| Styling            | Tailwind CSS               |
| Camera             | react-webcam (WebRTC)      |
| Charts             | Recharts (AreaChart)       |
| Client PDF         | jsPDF                      |
| State management   | Context API + useReducer   |
| Backend framework  | FastAPI + Uvicorn          |
| ML framework       | TensorFlow 2.15 / Keras    |
| Computer vision    | OpenCV (headless)          |
| Explainability     | Grad-CAM (GradientTape)    |
| Class balancing    | SMOTE (imbalanced-learn)   |
| Server PDF         | ReportLab                  |
| Database ORM       | SQLAlchemy 2.0             |
| Database (dev)     | SQLite                     |
| Database (prod)    | PostgreSQL 15              |
| Containerisation   | Docker + Docker Compose    |
| Reverse proxy      | Nginx                      |
| Logging            | Loguru                     |

---

*Anemia AI Tracker — Final Year Project*