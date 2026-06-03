"""
routers/health.py

Endpoints:
  GET  /api/health          — liveness probe (always 200)
  GET  /api/health/ready    — readiness probe (checks model + DB)
  GET  /api/health/model    — model metadata and training history
  GET  /api/health/system   — server resource snapshot
"""

from __future__ import annotations

import json
import platform
import sys
import time
from pathlib import Path

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from loguru import logger

router = APIRouter()

HISTORY_PATH = Path(__file__).resolve().parent.parent / \
    "models" / "saved" / "training_history.json"


@router.get("/health", summary="Liveness probe")
async def health_check():
    return {
        "status":    "ok",
        "timestamp": time.time(),
        "service":   "Anemia Tracker API",
    }


@router.get("/health/ready", summary="Readiness probe")
async def readiness_check(request: Request):
    checks = {}

    try:
        model_state = request.app.state.model_state
        checks["model"] = {
            "status": "loaded" if model_state.model_ready else "mock_mode",
            "ready":  True,
        }
    except AttributeError:
        checks["model"] = {"status": "unavailable", "ready": False}

    try:
        from database import engine
        with engine.connect() as conn:
            pass
        checks["database"] = {"status": "reachable", "ready": True}
    except Exception as exc:
        logger.warning(f"DB readiness check failed: {exc}")
        checks["database"] = {"status": "unreachable",
                              "ready": False, "error": str(exc)}

    all_ready = all(c["ready"] for c in checks.values())
    status_code = 200 if all_ready else 503

    return JSONResponse(
        status_code=status_code,
        content={"ready": all_ready, "checks": checks,
                 "timestamp": time.time()},
    )


@router.get("/health/model", summary="Model metadata and training history")
async def model_info(request: Request):
    try:
        model_state = request.app.state.model_state
    except AttributeError:
        return JSONResponse(status_code=503, content={"error": "Model state not initialised"})

    info: dict = {
        "model_ready": model_state.model_ready,
        "mock_mode": not model_state.model_ready,
    }

    if model_state.model_ready and model_state.model:
        model = model_state.model
        try:
            info["parameter_count"] = int(model.count_params())
            info["input_shapes"] = [str(inp.shape) for inp in model.inputs]
            info["output_shape"] = str(model.output_shape)
            info["layer_count"] = len(model.layers)
        except Exception as exc:
            info["model_introspection_error"] = str(exc)

    if HISTORY_PATH.exists():
        try:
            with open(HISTORY_PATH) as f:
                history = json.load(f)
            eval_m = history.get("eval_metrics", {})
            cfg = history.get("config", {})
            info["training"] = {
                "test_mae_gdl":       eval_m.get("mean_abs_error"),
                "within_1_gdl_pct":   eval_m.get("within_1_gdl_pct"),
                "training_time_s":    history.get("training_time_s"),
                "train_samples":      cfg.get("train_samples"),
                "epochs_s1":          cfg.get("epochs_s1"),
                "epochs_s2":          cfg.get("epochs_s2"),
                "smote":              cfg.get("smote"),
            }
        except Exception as exc:
            info["training_history_error"] = str(exc)
    else:
        info["training"] = "No training history found — run train_model.py first"

    return info


@router.get("/health/system", summary="Server system information")
async def system_info():
    import os
    info: dict = {
        "python_version": sys.version,
        "platform":       platform.platform(),
        "cpu_count":      os.cpu_count(),
    }
    try:
        import psutil
        vm = psutil.virtual_memory()
        info["memory"] = {
            "total_gb":     round(vm.total / 1e9, 2),
            "available_gb": round(vm.available / 1e9, 2),
            "used_pct":     vm.percent,
        }
        info["cpu_percent"] = psutil.cpu_percent(interval=0.1)
    except ImportError:
        info["memory"] = "psutil not installed"
    try:
        import tensorflow as tf
        gpus = tf.config.list_physical_devices("GPU")
        info["tensorflow"] = {
            "version":   tf.__version__,
            "gpus":      [g.name for g in gpus],
            "gpu_count": len(gpus),
        }
    except Exception:
        info["tensorflow"] = "unavailable"
    return info
