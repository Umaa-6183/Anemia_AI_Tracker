# ════════════════════════════════════════════════════════
# Stage 1 — Builder
# Install all Python deps into a venv so Stage 2 stays lean
# ════════════════════════════════════════════════════════
FROM python:3.11-slim AS builder

# System libs needed to build opencv, psycopg2, Pillow
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgl1-mesa-glx \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Copy and install requirements into an isolated venv
COPY requirements.txt .
RUN python -m venv /opt/venv \
    && /opt/venv/bin/pip install --upgrade pip \
    && /opt/venv/bin/pip install --no-cache-dir -r requirements.txt


# ════════════════════════════════════════════════════════
# Stage 2 — Runtime
# ════════════════════════════════════════════════════════
FROM python:3.11-slim AS runtime

LABEL maintainer="Anemia Tracker"
LABEL description="FastAPI backend — Hb regression CNN + Grad-CAM"

# Runtime system libs (OpenCV, Pillow)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgl1-mesa-glx \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy the venv from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser

WORKDIR /app

# Copy application source
COPY --chown=appuser:appuser . .

# Create required runtime directories
RUN mkdir -p \
    models/saved \
    logs \
    tmp/reports \
    data/conjunctiva/images \
    && chown -R appuser:appuser /app

USER appuser

# Expose FastAPI port
EXPOSE 8000

# Health check — hits the liveness probe
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Default command — production mode (no --reload)
CMD ["uvicorn", "main:app", \
    "--host", "0.0.0.0", \
    "--port", "8000", \
    "--workers", "1", \
    "--log-level", "info", \
    "--timeout-keep-alive", "65"]