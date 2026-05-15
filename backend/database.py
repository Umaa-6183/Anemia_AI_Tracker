"""
database.py — SQLAlchemy engine, session factory, Base, and ORM models.

Tables created automatically on startup via Base.metadata.create_all().
Switch DATABASE_URL to postgresql://... for production.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Generator

from sqlalchemy import (
    Boolean, Column, DateTime, Float, ForeignKey,
    Integer, String, Text, create_engine, event,
)
from sqlalchemy.orm import (
    DeclarativeBase, Session, relationship, sessionmaker,
)

from config import settings


# ─── Engine ───────────────────────────────────────────
connect_args = (
    {"check_same_thread": False}
    if settings.database_url.startswith("sqlite")
    else {}
)

engine = create_engine(
    settings.database_url,
    echo=connect_args and settings.db_echo,
    connect_args=connect_args,
)

# Enable WAL mode for SQLite to allow concurrent reads during writes
if settings.database_url.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_conn, _):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

# ─── Session factory ──────────────────────────────────
SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
)


# ─── Declarative Base ─────────────────────────────────
class Base(DeclarativeBase):
    pass


# ═══════════════════════════════════════════════════════
# ORM MODELS
# ═══════════════════════════════════════════════════════

def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.utcnow()


class Patient(Base):
    """
    Patient profile — created once per device/browser session.
    Identified by a client-generated UUID stored in localStorage.
    """
    __tablename__ = "patients"

    id = Column(String(36), primary_key=True, default=_uuid)
    name = Column(String(120), nullable=False)
    age = Column(Integer,     nullable=False)
    sex = Column(String(10),  nullable=False)   # "male" | "female"
    pregnancy_status = Column(Boolean,     default=False)
    created_at = Column(DateTime,    default=_now)
    updated_at = Column(DateTime,    default=_now, onupdate=_now)

    # ── Relationships ──
    scans = relationship(
        "ScanResult", back_populates="patient", cascade="all, delete-orphan")
    lab_logs = relationship(
        "LabLog",     back_populates="patient", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Patient id={self.id} name={self.name!r}>"


class ScanResult(Base):
    """
    Stores the output of each AI Hb inference run.
    """
    __tablename__ = "scan_results"

    id = Column(String(36),  primary_key=True, default=_uuid)
    patient_id = Column(String(36),  ForeignKey(
        "patients.id", ondelete="CASCADE"), nullable=True)
    hb = Column(Float,       nullable=False)           # e.g. 11.4
    # normal|mild|moderate|severe
    severity = Column(String(20),  nullable=False)
    confidence = Column(Float,       nullable=True)            # 0-1
    processing_time_ms = Column(Integer,     nullable=True)
    gradcam_image = Column(Text,        nullable=True)            # base64 PNG
    # base64 JPEG (optional store)
    captured_image = Column(Text,        nullable=True)
    # snapshot at scan time
    patient_age = Column(Integer,     nullable=True)
    patient_sex = Column(String(10),  nullable=True)
    patient_pregnant = Column(Boolean,     nullable=True)
    # JSON array string
    symptoms = Column(Text,        nullable=True)
    created_at = Column(DateTime,    default=_now)

    patient = relationship("Patient", back_populates="scans")

    def __repr__(self):
        return f"<ScanResult id={self.id} hb={self.hb} severity={self.severity!r}>"


class LabLog(Base):
    """
    Manual lab bloodwork entries entered by the patient.
    """
    __tablename__ = "lab_logs"

    id = Column(String(36), primary_key=True, default=_uuid)
    patient_id = Column(String(36), ForeignKey(
        "patients.id", ondelete="CASCADE"), nullable=True)
    # ISO date string "YYYY-MM-DD"
    test_date = Column(String(20), nullable=False)
    rbc = Column(Float,      nullable=True)       # × 10¹²/L
    wbc = Column(Float,      nullable=True)       # × 10⁹/L
    ferritin = Column(Float,      nullable=True)       # ng/mL
    platelets = Column(Float,      nullable=True)       # × 10⁹/L
    lab_name = Column(String(120), nullable=True)
    notes = Column(Text,       nullable=True)
    created_at = Column(DateTime,   default=_now)

    patient = relationship("Patient", back_populates="lab_logs")

    def __repr__(self):
        return f"<LabLog id={self.id} date={self.test_date} rbc={self.rbc}>"


# ═══════════════════════════════════════════════════════
# INITIALISE TABLES
# ═══════════════════════════════════════════════════════

def init_db() -> None:
    """Create all tables if they do not already exist."""
    Base.metadata.create_all(bind=engine)


# ═══════════════════════════════════════════════════════
# SESSION DEPENDENCY (for FastAPI)
# ═══════════════════════════════════════════════════════

def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency that yields a database session and
    guarantees it is closed after the request completes.

    Usage in a router:
        @router.get("/...")
        def my_endpoint(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
