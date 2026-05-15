"""
routers/labs.py

Endpoints:
  POST   /api/labs              — create a new lab log entry
  GET    /api/labs/{patient_id} — retrieve all lab logs for a patient
  DELETE /api/labs/{lab_id}     — delete a specific lab log
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from loguru import logger
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import LabLog, get_db

router = APIRouter()


# ═══════════════════════════════════════════════════════
# SCHEMAS
# ═══════════════════════════════════════════════════════

class LabLogCreate(BaseModel):
    patient_id: Optional[str] = None
    date:       str = Field(..., description="ISO date string YYYY-MM-DD")
    rbc:        Optional[float] = Field(
        None, ge=0, le=20,   description="× 10¹²/L")
    wbc:        Optional[float] = Field(
        None, ge=0, le=100,  description="× 10⁹/L")
    ferritin:   Optional[float] = Field(
        None, ge=0, le=5000, description="ng/mL")
    platelets:  Optional[float] = Field(
        None, ge=0, le=2000, description="× 10⁹/L")
    lab_name:   Optional[str] = None
    notes:      Optional[str] = None


class LabLogResponse(BaseModel):
    id:         str
    patient_id: Optional[str]
    date:       str
    rbc:        Optional[float]
    wbc:        Optional[float]
    ferritin:   Optional[float]
    platelets:  Optional[float]
    lab_name:   Optional[str]
    notes:      Optional[str]
    created_at: Optional[str]

    model_config = {"from_attributes": True}


# ═══════════════════════════════════════════════════════
# POST /api/labs
# ═══════════════════════════════════════════════════════

@router.post(
    "/labs",
    response_model=LabLogResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Save a lab bloodwork entry",
)
async def create_lab_log(
    payload: LabLogCreate,
    db:      Session = Depends(get_db),
):
    """
    Persist a manual lab result entry.
    At least one numeric value (rbc, wbc, ferritin, platelets) must be provided.
    """
    if all(v is None for v in [payload.rbc, payload.wbc, payload.ferritin, payload.platelets]):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="At least one lab value (rbc, wbc, ferritin, or platelets) is required.",
        )

    try:
        entry = LabLog(
            patient_id=payload.patient_id,
            test_date=payload.date,
            rbc=payload.rbc,
            wbc=payload.wbc,
            ferritin=payload.ferritin,
            platelets=payload.platelets,
            lab_name=payload.lab_name,
            notes=payload.notes,
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
        logger.info(f"Lab log saved | id={entry.id} date={entry.test_date}")

        return LabLogResponse(
            id=entry.id,
            patient_id=entry.patient_id,
            date=entry.test_date,
            rbc=entry.rbc,
            wbc=entry.wbc,
            ferritin=entry.ferritin,
            platelets=entry.platelets,
            lab_name=entry.lab_name,
            notes=entry.notes,
            created_at=entry.created_at.isoformat() if entry.created_at else None,
        )
    except Exception as exc:
        db.rollback()
        logger.error(f"Lab log create failed: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save lab entry",
        )


# ═══════════════════════════════════════════════════════
# GET /api/labs/{patient_id}
# ═══════════════════════════════════════════════════════

@router.get(
    "/labs/{patient_id}",
    response_model=list[LabLogResponse],
    summary="Get all lab entries for a patient",
)
async def get_lab_logs(
    patient_id: str,
    limit:      int = 100,
    db:         Session = Depends(get_db),
):
    """Return all lab entries for a patient_id, newest first."""
    entries = (
        db.query(LabLog)
        .filter(LabLog.patient_id == patient_id)
        .order_by(LabLog.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        LabLogResponse(
            id=e.id,
            patient_id=e.patient_id,
            date=e.test_date,
            rbc=e.rbc,
            wbc=e.wbc,
            ferritin=e.ferritin,
            platelets=e.platelets,
            lab_name=e.lab_name,
            notes=e.notes,
            created_at=e.created_at.isoformat() if e.created_at else None,
        )
        for e in entries
    ]


# ═══════════════════════════════════════════════════════
# DELETE /api/labs/{lab_id}
# ═══════════════════════════════════════════════════════

@router.delete(
    "/labs/{lab_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a lab entry",
)
async def delete_lab_log(
    lab_id: str,
    db:     Session = Depends(get_db),
):
    """Permanently delete a lab log entry by its UUID."""
    entry = db.query(LabLog).filter(LabLog.id == lab_id).first()
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lab entry {lab_id} not found",
        )
    try:
        db.delete(entry)
        db.commit()
        logger.info(f"Lab log deleted | id={lab_id}")
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete lab entry",
        )
