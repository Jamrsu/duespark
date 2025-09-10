FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# System deps (optional, keep slim)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY sic_backend_mvp_jwt_sqlite/requirements.txt ./requirements.txt
RUN pip install -r requirements.txt

COPY sic_backend_mvp_jwt_sqlite /app

EXPOSE 8000

# Default command can be overridden by compose
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]

