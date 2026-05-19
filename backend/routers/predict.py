"""
routers/predict.py

Endpoints:
  POST /api/iqa      — image quality assessment only (live camera loop)
  POST /api/predict  — full Hb inference + Grad-CAM + DB persist
"""

from __future__ import annotations

import json
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
from loguru import logger
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from config import settings
from database import ScanResult, get_db
from models.inference import run_inference, run_iqa_only

router = APIRouter()


# ═══════════════════════════════════════════════════════
# SCHEMAS
# ═══════════════════════════════════════════════════════

class IQARequest(BaseModel):
    image: str = Field(...,
                       description="Base64 data URL of the captured frame")


class PredictRequest(BaseModel):
    image:            str = Field(..., description="Base64 JPEG/PNG data URL")
    age:              int = Field(..., ge=1, le=120)
    sex:              str = Field(..., pattern="^(male|female)$")
    pregnancy_status: bool = Field(default=False)
    patient_id:       Optional[str] = Field(
        default=None, description="Optional patient UUID for DB persistence")
    symptoms:         Optional[list] = Field(
        default=None, description="Checked symptom IDs from frontend")

    @field_validator("image")
    @classmethod
    def image_must_be_base64(cls, v: str) -> str:
        if not v.startswith("data:image") and len(v) < 100:
            raise ValueError("image must be a valid base64 data URL")
        return v

    @field_validator("sex")
    @classmethod
    def normalise_sex(cls, v: str) -> str:
        return v.lower().strip()


class PredictResponse(BaseModel):
    hb:                 float
    severity:           str
    confidence:         float
    gradcam_image:      Optional[str]   # Grad-CAM overlay — XAI toggle only
    clean_image:        Optional[str]   # Original image — default display
    processing_time_ms: int
    iqa_passed:         bool
    iqa_feedback:       str
    wb_method:          str
    is_mock:            bool
    scan_id:            Optional[str]
    details:            dict


# ═══════════════════════════════════════════════════════
# POST /api/iqa
# ═══════════════════════════════════════════════════════

@router.post(
    "/iqa",
    summary="Image Quality Assessment",
    description=(
        "Runs IQA checks (blur, brightness, contrast, sclera detection) "
        "on the supplied frame without running full CNN inference. "
        "Called by the live camera loop every ~350 ms."
    ),
)
async def assess_image_quality(payload: IQARequest):
    """
    Lightweight IQA endpoint — called in the hot camera loop.
    Must return in < 200 ms.
    """
    try:
        result = run_iqa_only(payload.image)
        return result
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        )
    except Exception as exc:
        logger.error(f"IQA failed: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="IQA processing failed",
        )


# ═══════════════════════════════════════════════════════
# POST /api/predict
# ═══════════════════════════════════════════════════════

@router.post(
    "/predict",
    response_model=PredictResponse,
    summary="Haemoglobin Prediction",
    description=(
        "Accepts a conjunctiva image + patient demographics, runs the CNN "
        "regression model, generates a Grad-CAM heatmap, classifies severity, "
        "and optionally persists the result to the database."
    ),
)
async def predict_hemoglobin(
    payload: PredictRequest,
    request: Request,
    db:      Session = Depends(get_db),
):
    """
    Full Hb inference pipeline.

    Flow:
      1. Validate payload
      2. Retrieve model from app.state
      3. Run inference (real or mock)
      4. Persist ScanResult to DB
      5. Return structured response
    """
    logger.info(
        f"Predict request | age={payload.age} sex={payload.sex} "
        f"pregnant={payload.pregnancy_status}"
    )

    # ── Get model from app state ───────────────────────
    try:
        model_state = request.app.state.model_state
        model = model_state.model if model_state.model_ready else None
    except AttributeError:
        model = None

    # ── Run inference ─────────────────────────────────
    try:
        result = run_inference(
            model=model,
            image_data_url=payload.image,
            age=payload.age,
            sex=payload.sex,
            pregnancy_status=payload.pregnancy_status,
        )
    except Exception as exc:
        logger.error(f"Inference error: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference failed: {str(exc)}",
        )

    # ── Persist to database ───────────────────────────
    scan_id = None
    try:
        scan = ScanResult(
            patient_id=payload.patient_id,
            hb=result.hb,
            severity=result.severity,
            confidence=result.confidence,
            processing_time_ms=result.processing_time_ms,
            gradcam_image=result.gradcam_image,   # overlay only
            captured_image=result.clean_image,     # original clean image
            patient_age=payload.age,
            patient_sex=payload.sex,
            patient_pregnant=payload.pregnancy_status,
            symptoms=json.dumps(payload.symptoms or []),
        )
        db.add(scan)
        db.commit()
        db.refresh(scan)
        scan_id = scan.id
        logger.info(
            f"Scan persisted | id={scan_id} hb={result.hb} severity={result.severity}")
    except Exception as exc:
        logger.warning(f"DB persist failed (non-fatal): {exc}")
        db.rollback()

    # ── Build response ────────────────────────────────
    if result.is_mock:
        logger.warning(
            "Returning MOCK prediction — train the model for real inference")

    return PredictResponse(
        hb=result.hb,
        severity=result.severity,
        confidence=result.confidence,
        gradcam_image=result.gradcam_image,   # Grad-CAM overlay (XAI toggle)
        clean_image=result.clean_image,     # Original image (default view)
        processing_time_ms=result.processing_time_ms,
        iqa_passed=result.iqa_passed,
        iqa_feedback=result.iqa_feedback,
        wb_method=result.wb_method,
        is_mock=result.is_mock,
        scan_id=scan_id,
        details=result.details,
    )


# ═══════════════════════════════════════════════════════
# GET /api/predict/history/{patient_id}
# ═══════════════════════════════════════════════════════

@router.get(
    "/predict/history/{patient_id}",
    summary="Scan history for a patient",
)
async def get_scan_history(
    patient_id: str,
    limit:      int = 50,
    db:         Session = Depends(get_db),
):
    """Return the last N scan results for a patient, newest first."""
    scans = (
        db.query(ScanResult)
        .filter(ScanResult.patient_id == patient_id)
        .order_by(ScanResult.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "scan_id":    s.id,
            "hb":         s.hb,
            "severity":   s.severity,
            "confidence": s.confidence,
            "date":       s.created_at.isoformat() if s.created_at else None,
        }
        for s in scans
    ]
