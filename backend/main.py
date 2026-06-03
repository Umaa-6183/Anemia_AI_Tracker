"""
main.py — FastAPI application entry point.

Start with:
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""

from __future__ import annotations

import time
import traceback
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from loguru import logger

from config import settings
from database import init_db

# ─── Routers (imported after settings are ready) ──────
from routers import health, predict, report, labs


# ═══════════════════════════════════════════════════════
# LOGGER SETUP
# ═══════════════════════════════════════════════════════

logger.add(
    settings.log_file,
    rotation="10 MB",
    retention="14 days",
    level=settings.log_level,
    format="{time:YYYY-MM-DD HH:mm:ss} | {level:<8} | {name}:{line} — {message}",
    enqueue=True,          # thread-safe async logging
    backtrace=True,
    diagnose=settings.debug,
)


# ═══════════════════════════════════════════════════════
# MODEL STATE  (singleton, loaded once at startup)
# ═══════════════════════════════════════════════════════

class ModelState:
    model = None   # Keras .h5 model
    model_ready = False


model_state = ModelState()


# ═══════════════════════════════════════════════════════
# LIFESPAN  (startup / shutdown hooks)
# ═══════════════════════════════════════════════════════

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup:
      1. Initialise database tables
      2. Load the trained CNN model into memory
      3. Warm-up the model with a dummy inference
    Shutdown:
      - Log clean exit
    """
    logger.info("━━━ Anemia Tracker API starting up ━━━")

    # 1. Database
    try:
        init_db()
        logger.info("✓ Database tables initialised")
    except Exception as exc:
        logger.error(f"✗ Database init failed: {exc}")

    # 2. Load Keras model
    model_path = Path(settings.model_path)
    if model_path.exists():
        try:
            import tensorflow as tf
            tf.get_logger().setLevel("ERROR")   # suppress TF noise

            model_state.model = tf.keras.models.load_model(str(model_path))
            model_state.model_ready = True
            logger.info(f"✓ Model loaded: {model_path.name}")

            # 3. Warm-up — one dummy forward pass to initialise GPU/CPU kernels
            import numpy as np
            size = settings.model_input_size
            dummy = np.zeros((1, size, size, 3), dtype=np.float32)
            _ = model_state.model.predict(dummy, verbose=0)
            logger.info("✓ Model warm-up complete")

        except Exception as exc:
            logger.warning(
                f"⚠ Model not loaded: {exc}\n"
                "  The /api/predict endpoint will return a mock result until "
                "  a trained model is placed at: " + str(model_path)
            )
    else:
        logger.warning(
            f"⚠ Model file not found at {model_path}.\n"
            "  Run:  python models/train_model.py\n"
            "  The API will serve mock predictions until the model is trained."
        )

    # Expose model_state on app for use in routers
    app.state.model_state = model_state

    yield   # ← application runs here

    # Shutdown
    logger.info("━━━ Anemia Tracker API shutting down ━━━")


# ═══════════════════════════════════════════════════════
# APP FACTORY
# ═══════════════════════════════════════════════════════

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "Backend API for the Anemia Tracker — "
        "conjunctival image Hb estimation via CNN with Grad-CAM XAI."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)


# ═══════════════════════════════════════════════════════
# MIDDLEWARE
# ═══════════════════════════════════════════════════════

# 1. CORS — allow the React dev server and production frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Gzip compression — images/PDFs benefit significantly
app.add_middleware(GZipMiddleware, minimum_size=1024)

# 3. Request timing middleware


@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    elapsed = round((time.perf_counter() - start) * 1000, 1)
    response.headers["X-Process-Time-Ms"] = str(elapsed)
    logger.debug(
        f"{request.method} {request.url.path} → {response.status_code} ({elapsed} ms)")
    return response


# ═══════════════════════════════════════════════════════
# GLOBAL EXCEPTION HANDLERS
# ═══════════════════════════════════════════════════════

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(
        f"Unhandled exception on {request.method} {request.url.path}\n"
        + traceback.format_exc()
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An internal server error occurred. Please try again.",
            "path":   str(request.url.path),
        },
    )


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": str(exc)},
    )


# ═══════════════════════════════════════════════════════
# ROUTERS
# ═══════════════════════════════════════════════════════

app.include_router(health.router,  prefix="/api", tags=["Health"])
app.include_router(predict.router, prefix="/api", tags=["Inference"])
app.include_router(report.router,  prefix="/api", tags=["Reports"])
app.include_router(labs.router,    prefix="/api", tags=["Labs"])


# ═══════════════════════════════════════════════════════
# ROOT
# ═══════════════════════════════════════════════════════

@app.get("/", include_in_schema=False)
async def root():
    return {
        "app":     settings.app_name,
        "version": settings.app_version,
        "status":  "running",
        "docs":    "/docs",
    }


# ═══════════════════════════════════════════════════════
# DEV ENTRY POINT
# ═══════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level=settings.log_level.lower(),
    )
