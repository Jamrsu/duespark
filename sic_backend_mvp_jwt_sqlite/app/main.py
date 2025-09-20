import asyncio
import json
import logging
import os
import time
from typing import List, Optional

import jwt
import stripe
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Query, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import (
    ALGORITHM,
    SECRET_KEY,
    create_access_token,
    get_current_user,
    get_current_user_optional,
    hash_password,
    verify_password,
)
from app.database import Base, SessionLocal, engine, get_db

# Load environment variables from .env file
load_dotenv()
from contextlib import asynccontextmanager, closing, suppress
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import markdown as md
from jinja2 import BaseLoader, Environment, StrictUndefined
from prometheus_client import (
    CONTENT_TYPE_LATEST,
    Counter,
    Gauge,
    Histogram,
    generate_latest,
)

from app.email_provider import get_email_provider
from app.email_templates import (
    discover_missing_vars,
    load_markdown_template,
    render_markdown_template,
)
from app.scheduler import init_scheduler
from app.subscription_service import get_subscription_gate, get_subscription_service

# Alembic manages migrations; do not auto-create tables here.


# Use FastAPI lifespan to manage startup/shutdown tasks (replaces deprecated on_event)
@asynccontextmanager
async def app_lifespan(app: FastAPI):
    task = asyncio.create_task(_dead_letter_worker())
    scheduler = init_scheduler()
    scheduler.start()
    try:
        yield
    finally:
        try:
            task.cancel()
            await task
        except asyncio.CancelledError:
            logger.debug("Dead letter worker task cancelled during shutdown")
        try:
            scheduler.shutdown(wait=False)
        except Exception as exc:
            logger.warning("Failed to shut down scheduler: %s", exc, exc_info=True)


app = FastAPI(
    title="DueSpark – Enterprise Platform",
    version="4.0.0",
    lifespan=app_lifespan,
    description="""
    DueSpark Backend API - Enterprise Invoice Management & AI Intelligence Platform

    ## Phase 4: Enterprise Scale & AI Intelligence

    * **Enterprise Multi-Tenancy** - Organization management with hierarchical access
    * **AI Intelligence** - Machine learning payment prediction and debt collection strategies
    * **Advanced Security** - Enterprise-grade security, audit logging, and compliance (GDPR/SOX)
    * **Real-time Analytics** - Advanced business intelligence with custom reporting
    * **Scalable Infrastructure** - Redis caching, background job processing, API rate limiting

    ## Core Features

    * **Authentication** - JWT-based authentication with enterprise SSO support
    * **Invoice Management** - Create, update, and track invoices with AI-powered insights
    * **Client Management** - Manage client information with predictive analytics
    * **Advanced Analytics** - Real-time dashboards and comprehensive reporting
    * **Automated Reminders** - AI-optimized payment reminder system
    * **Integrations** - Stripe, QuickBooks, Xero, and Zapier integrations
    * **Team Collaboration** - Role-based access control and team management

    ## Authentication

    Most endpoints require authentication. Use the `/auth/login` endpoint to obtain a JWT token,
    then include it in the `Authorization` header as `Bearer <token>`.
    """,
    openapi_tags=[
        {
            "name": "authentication",
            "description": "User authentication and authorization endpoints",
        },
        {
            "name": "analytics",
            "description": "Analytics and reporting endpoints providing insights into invoice data, payment metrics, and client behavior",
        },
        {"name": "clients", "description": "Client management operations"},
        {"name": "invoices", "description": "Invoice management and tracking"},
        {"name": "reminders", "description": "Payment reminder system"},
        {
            "name": "integrations",
            "description": "Third-party integrations (Stripe, etc.)",
        },
        {
            "name": "admin",
            "description": "Administrative operations and system management",
        },
        {
            "name": "enterprise",
            "description": "Phase 4: Enterprise multi-tenancy, AI intelligence, security, and advanced analytics",
        },
    ],
)


# Custom exception handlers for structured error responses
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Structured JSON error response for HTTP exceptions"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.status_code,
                "message": exc.detail,
                "type": "http_error",
            },
            "success": False,
            "data": None,
        },
    )


@app.exception_handler(500)
async def internal_server_error_handler(request: Request, exc: Exception):
    """Structured JSON error response for internal server errors"""
    logger.error(f"Internal server error: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": 500,
                "message": "Internal server error",
                "type": "server_error",
            },
            "success": False,
            "data": None,
        },
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Catch-all handler for unhandled exceptions"""
    logger.error(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": 500,
                "message": "An unexpected error occurred",
                "type": "server_error",
            },
            "success": False,
            "data": None,
        },
    )


# CORS Configuration - Environment-based for security
def get_cors_origins():
    """Get CORS origins from environment variable with secure defaults"""
    cors_origins_env = os.getenv("BACKEND_CORS_ORIGINS")

    if cors_origins_env:
        try:
            # Parse JSON array from environment variable
            return json.loads(cors_origins_env)
        except json.JSONDecodeError:
            logging.warning("Invalid BACKEND_CORS_ORIGINS format, using default origins")

    # Default origins for development and production
    default_origins = [
        # Development origins
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",  # Vite alternate port
        "http://127.0.0.1:5174",
        "http://localhost:3000",  # Additional dev port
        "http://127.0.0.1:3000",

        # Production domains
        "https://www.duespark.com",
        "https://duespark.com",
        "https://duespark.vercel.app",
    ]

    # Also allow Vercel preview domains
    environment = os.getenv("ENVIRONMENT", "development")
    if environment != "production":
        # In non-production, also allow any vercel.app subdomain
        # This is less secure but necessary for preview deployments
        return ["*"]  # Allow all origins for development/staging

    return default_origins

def get_cors_headers():
    """Get CORS headers - restrictive in production, permissive in development"""
    environment = os.getenv("ENVIRONMENT", "development")

    if environment == "production":
        # Restrictive headers for production
        return [
            "Accept",
            "Accept-Language",
            "Authorization",
            "Content-Type",
            "Origin",
            "X-Requested-With",
        ]
    else:
        # More permissive for development
        return [
            "Accept",
            "Accept-Encoding",
            "Accept-Language",
            "Authorization",
            "Cache-Control",
            "Content-Language",
            "Content-Type",
            "Origin",
            "Referer",
            "User-Agent",
            "X-CSRF-Token",
            "X-Requested-With",
            "X-HTTP-Method-Override",
        ]

# Apply CORS middleware with environment-based configuration
cors_origins = get_cors_origins()
cors_headers = get_cors_headers()
environment = os.getenv("ENVIRONMENT", "development")

# Log CORS configuration for debugging (but not in production)
if environment != "production":
    logging.info(f"CORS origins configured: {cors_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    allow_headers=cors_headers,
    expose_headers=["X-Total-Count"] if environment == "production" else ["*"],
    max_age=3600 if environment == "production" else 86400,
)

from .analytics_routes import router as analytics_router
from .client_portal_routes import router as client_portal_router
from .health_routes import router as health_router
from .integration_routes import router as integration_router
from .referral_routes import router as referral_router
from . import stripe_webhooks as webhook_handlers
from .stripe_webhooks import router as webhook_router

# Include subscription, webhook, referral, viral growth, client portal, and enterprise routers
from .subscription_routes import router as subscription_router
from .viral_growth_routes import router as viral_growth_router

# Temporarily disabled until database relationships are fixed
# from .enterprise_routes import router as enterprise_router

app.include_router(health_router)
app.include_router(subscription_router)
app.include_router(webhook_router)
app.include_router(referral_router)
app.include_router(viral_growth_router)
app.include_router(client_portal_router)
app.include_router(integration_router)
app.include_router(analytics_router)
# app.include_router(enterprise_router)


# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    user_id = None

    # Extract user ID from JWT token for analytics tracking
    auth_header = request.headers.get("authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1]
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        except jwt.PyJWTError as exc:
            logger.debug("Unable to decode analytics auth header token: %s", exc)
        else:
            user_email = payload.get("sub")
            if user_email:
                with closing(SessionLocal()) as db:
                    try:
                        user = (
                            db.query(models.User)
                            .filter(models.User.email == user_email)
                            .first()
                        )
                    except Exception as exc:
                        logger.debug(
                            "Failed to load user for analytics log (email=%s): %s",
                            user_email,
                            exc,
                            exc_info=True,
                        )
                    else:
                        if user:
                            user_id = user.id

    # Process request
    response = await call_next(request)
    process_time = time.time() - start_time

    # Log analytics requests with structured format
    if request.url.path.startswith("/analytics"):
        log_data = {
            "event": "analytics_request",
            "method": request.method,
            "path": request.url.path,
            "query_params": dict(request.query_params),
            "user_id": user_id,
            "status_code": response.status_code,
            "duration_ms": round(process_time * 1000, 2),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        logger.info(json.dumps(log_data))

    # Add performance headers
    response.headers["X-Process-Time"] = str(process_time)

    return response


# Stripe configuration from environment
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_CLIENT_ID = os.getenv("STRIPE_CLIENT_ID", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
STRIPE_REDIRECT_URI = os.getenv(
    "STRIPE_REDIRECT_URI", "http://localhost:8000/integrations/stripe/callback"
)
STRIPE_API_VERSION = os.getenv("STRIPE_API_VERSION")
PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL", "http://localhost:8000")
if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY
if STRIPE_API_VERSION:
    stripe.api_version = STRIPE_API_VERSION

# Observability: logger and counters
logger = logging.getLogger("duespark")
logging.basicConfig(level=logging.INFO)
metrics = {
    "webhooks_received": 0,
    "webhooks_processed": 0,
    "imports_created": 0,
    "imports_updated": 0,
    "dlq_count": 0,
}

# Prometheus counters
PROM_SCHEDULER_RUNS = Counter(
    "duespark_scheduler_runs_total", "Scheduler job runs", ["job"]
)
PROM_SCHEDULER_ERRORS = Counter(
    "duespark_scheduler_errors_total", "Scheduler job errors", ["job"]
)
PROM_REMINDERS_SENT = Counter("duespark_reminders_sent_total", "Reminders sent")
PROM_REMINDERS_SCHEDULED = Counter(
    "duespark_reminders_scheduled_total", "Reminders scheduled"
)

# AC-compatible aliases
SCHEDULER_REMINDERS_ENQUEUED_TOTAL = Counter(
    "scheduler_reminders_enqueued_total", "Reminders enqueued for sending"
)
SCHEDULER_REMINDERS_SENT_TOTAL = Counter(
    "scheduler_reminders_sent_total", "Reminders sent"
)
SCHEDULER_REMINDERS_FAILED_TOTAL = Counter(
    "scheduler_reminders_failed_total", "Reminder sends failed"
)
SCHEDULER_ADAPTIVE_RUNS_TOTAL = Counter(
    "scheduler_adaptive_runs_total", "Adaptive scheduler runs"
)
DLQ_ITEMS_TOTAL = Counter("dlq_items_total", "DLQ items", ["topic"])

# Histograms & Gauges
EMAIL_SEND_DURATION_SECONDS = Histogram(
    "email_send_duration_seconds", "Email send duration (seconds)"
)
SCHEDULE_COMPUTE_DURATION_SECONDS = Histogram(
    "schedule_compute_duration_seconds",
    "Adaptive scheduling compute duration (seconds)",
)
REMINDERS_PENDING = Gauge(
    "reminders_pending", "Reminders pending in next lookahead window (minutes)"
)

# Analytics observability metrics
ANALYTICS_REQUESTS_TOTAL = Counter(
    "analytics_requests_total", "Analytics requests", ["endpoint", "user_id", "status"]
)
ANALYTICS_REQUEST_DURATION_SECONDS = Histogram(
    "analytics_request_duration_seconds", "Analytics request duration", ["endpoint"]
)
ANALYTICS_QUERY_DURATION_SECONDS = Histogram(
    "analytics_query_duration_seconds",
    "Analytics database query duration",
    ["query_type"],
)

# Email send metrics (dispatcher)
EMAIL_SENDS_ATTEMPTED_TOTAL = Counter(
    "email_sends_attempted_total", "Email send attempts via dispatcher"
)
EMAIL_SENDS_RATE_LIMITED_TOTAL = Counter(
    "email_sends_rate_limited_total", "Emails deferred due to per-user rate limiting"
)
EMAIL_PROVIDER_ERRORS_TOTAL = Counter(
    "email_provider_errors_total", "Provider send errors"
)

TONE_PRESETS: dict[str, dict[str, str]] = {
    "friendly": {
        "subject": "Quick nudge about invoice {{invoice_number}}",
        "body": (
            "Hi {{client_name}},\n\n"
            "Hope you're well! This is a friendly reminder about invoice {{invoice_number}} for **{{amount_formatted}}** due {{due_date_iso}}.\n\n"
            "If you've already paid, thank you! Otherwise, you can use this link: {{pay_link}}\n\n"
            "Best,\n{{from_name}}"
        ),
    },
    "neutral": {
        "subject": "Reminder: invoice {{invoice_number}} is due",
        "body": (
            "Hello {{client_name}},\n\n"
            "This is a reminder for invoice {{invoice_number}} totaling **{{amount_formatted}}** due on {{due_date_iso}}.\n\n"
            "Pay: {{pay_link}}\n\nRegards,\n{{from_name}}"
        ),
    },
    "firm": {
        "subject": "Action required: invoice {{invoice_number}} overdue",
        "body": (
            "Hello {{client_name}},\n\n"
            "Invoice {{invoice_number}} for **{{amount_formatted}}** is overdue as of {{due_date_iso}}. Please arrange payment: {{pay_link}}.\n\n"
            "Regards,\n{{from_name}}"
        ),
    },
}


# ---- Health ----
@app.get("/healthz", include_in_schema=False)
def healthz():
    return {"status": "ok"}


@app.get("/metrics", include_in_schema=False)
def metrics_json():
    try:
        with closing(SessionLocal()) as db:
            metrics["dlq_count"] = db.query(models.DeadLetter).count()
            from datetime import datetime, timedelta, timezone

            now = datetime.now(timezone.utc)
            lookahead = int(os.getenv("SCHEDULER_LOOKAHEAD_MIN", "5"))
            pending = (
                db.query(models.Reminder)
                .filter(
                    models.Reminder.status == models.ReminderStatus.scheduled,
                    models.Reminder.send_at <= now + timedelta(minutes=lookahead),
                )
                .count()
            )
            with suppress(Exception):
                REMINDERS_PENDING.set(pending)
    except Exception as exc:
        logger.warning("Failed to compute metrics snapshot: %s", exc, exc_info=True)
    return metrics


@app.get("/metrics_prom", include_in_schema=False)
def metrics_prometheus():
    data = generate_latest()  # type: ignore
    from fastapi import Response

    return Response(content=data, media_type=CONTENT_TYPE_LATEST)


def _envelope(data, meta=None):
    return {"data": data, "meta": (meta or {})}


def _log_event(
    db: Session,
    user_id: int,
    entity_type: str,
    entity_id: int,
    event_type: str,
    payload: dict | None = None,
):
    try:
        ev = models.Event(
            user_id=user_id,
            entity_type=entity_type,
            entity_id=entity_id,
            event_type=event_type,
            payload=payload or {},
        )
        db.add(ev)
        db.commit()
    except Exception:
        db.rollback()


# ---- Auth ----
@app.post("/auth/register", tags=["auth"])
def register(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    try:
        exists = db.query(models.User).filter(models.User.email == payload.email).first()
        if exists:
            raise HTTPException(status_code=409, detail="Email already registered")

        # Create user first with explicit values for all fields to avoid database issues
        user = models.User(
            email=payload.email,
            password_hash=hash_password(payload.password),
            role=models.UserRole.owner,  # Explicit role
            email_verified=False,  # Explicit verification status
            onboarding_status=models.OnboardingStatus.not_started,  # Explicit onboarding status
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Handle referral code if provided
        referrer = None
        if payload.referral_code:
            from app.referral_service import referral_service

            is_valid, error_message, referrer = referral_service.validate_referral_code(
                payload.referral_code, user, db
            )
            if is_valid and referrer:
                # Create referral record (reward will be granted after 1 month of paid subscription)
                referral = referral_service.create_referral(
                    referrer, user, payload.referral_code, db
                )

        token = create_access_token(sub=payload.email)
        tok = schemas.Token(access_token=token)

        # Include referral info in response
        response_data = tok.model_dump()
        if referrer:
            response_data["referral_applied"] = True
            response_data["referred_by"] = referrer.email.split("@")[0]

        return _envelope(response_data)

    except HTTPException:
        # Re-raise HTTP exceptions (like 409 for existing user)
        raise
    except Exception as e:
        # Log the exact error and return a detailed response
        import traceback
        error_details = str(e)
        trace = traceback.format_exc()
        logger.error(f"Registration failed for {payload.email}: {error_details}")
        logger.error(f"Traceback: {trace}")

        # Rollback the transaction
        db.rollback()

        # Return a detailed error response for debugging
        raise HTTPException(
            status_code=500,
            detail=f"Registration failed: {error_details}"
        )


@app.post("/auth/login", tags=["auth"])
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form.username).first()
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )
    token = create_access_token(sub=user.email)
    tok = schemas.Token(access_token=token)
    return _envelope(tok.model_dump())


# ---- Clients ----
@app.get("/clients", tags=["clients"])
def list_clients(
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    # Optimized query with consistent ordering
    q = (
        db.query(models.Client)
        .filter(models.Client.user_id == user.id)
        .order_by(models.Client.name.asc())
    )  # Alphabetical order for clients

    # Get total count efficiently
    total = q.count()

    # Get paginated results
    items = q.offset(offset).limit(limit).all()

    return _envelope(
        [schemas.ClientOut.model_validate(i).model_dump() for i in items],
        {
            "limit": limit,
            "offset": offset,
            "total": total,
            "has_more": offset + limit < total,
        },
    )


@app.post("/clients", tags=["clients"])
def create_client(
    payload: schemas.ClientCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    c = models.Client(user_id=user.id, **payload.model_dump())
    db.add(c)
    db.commit()
    db.refresh(c)
    out = schemas.ClientOut.model_validate(c)
    _log_event(db, user.id, "client", out.id, "created", {"name": out.name})
    return _envelope(out.model_dump())


@app.get("/clients/{client_id}", tags=["clients"])
def get_client(
    client_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    c = (
        db.query(models.Client)
        .filter(models.Client.id == client_id, models.Client.user_id == user.id)
        .first()
    )
    if not c:
        raise HTTPException(status_code=404, detail="Client not found")
    out = schemas.ClientOut.model_validate(c)
    return _envelope(out.model_dump())


@app.put("/clients/{client_id}", tags=["clients"])
def update_client(
    client_id: int,
    payload: schemas.ClientUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    c = (
        db.query(models.Client)
        .filter(models.Client.id == client_id, models.Client.user_id == user.id)
        .first()
    )
    if not c:
        raise HTTPException(status_code=404, detail="Client not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(c, k, v)
    db.commit()
    db.refresh(c)
    out = schemas.ClientOut.model_validate(c)
    return {"data": out.model_dump(), "meta": {}}


@app.delete("/clients/{client_id}", tags=["clients"])
def delete_client(
    client_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    c = (
        db.query(models.Client)
        .filter(models.Client.id == client_id, models.Client.user_id == user.id)
        .first()
    )
    if not c:
        raise HTTPException(status_code=404, detail="Client not found")
    db.delete(c)
    db.commit()
    _log_event(db, user.id, "client", client_id, "deleted", {})
    return _envelope({"id": client_id})


# ---- Invoices ----
@app.get("/invoices", tags=["invoices"])
def list_invoices(
    limit: int = 50,
    offset: int = 0,
    client_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    from sqlalchemy.orm import joinedload

    # Build optimized query with eager loading
    q = (
        db.query(models.Invoice)
        .options(joinedload(models.Invoice.client))
        .filter(models.Invoice.user_id == user.id)
    )

    # Apply client filter
    if client_id is not None:
        q = q.filter(models.Invoice.client_id == client_id)

    # Apply status filter
    if status:
        q = q.filter(models.Invoice.status == status)

    # Order by creation date (most recent first) for consistent pagination
    q = q.order_by(models.Invoice.created_at.desc())

    # Get total count more efficiently
    total = q.count()

    # Get paginated results with eager loading
    items = q.offset(offset).limit(limit).all()

    return _envelope(
        [schemas.InvoiceOut.model_validate(i).model_dump() for i in items],
        {
            "limit": limit,
            "offset": offset,
            "total": total,
            "has_more": offset + limit < total,
        },
    )


@app.post("/invoices", tags=["invoices"])
def create_invoice(
    payload: schemas.InvoiceCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    service = get_subscription_service(db)
    # ensure client belongs to user
    client = (
        db.query(models.Client)
        .filter(models.Client.id == payload.client_id, models.Client.user_id == user.id)
        .first()
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    can_send, error = service.can_send_reminder(user.id, db)
    if not can_send:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=error)
    data = payload.model_dump()
    # Normalize currency to uppercase (validator also enforces length)
    if "currency" in data and data["currency"]:
        data["currency"] = data["currency"].upper()
    # Coerce enum strings to Python Enums
    status_value = data.get("status")
    if status_value is not None:
        try:
            data["status"] = models.InvoiceStatus(status_value)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="Invalid invoice status") from exc
    source_value = data.get("source")
    if source_value is not None:
        try:
            data["source"] = models.Invoice.InvoiceSource(source_value)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="Invalid invoice source") from exc
    inv = models.Invoice(user_id=user.id, **data)
    db.add(inv)
    db.commit()
    db.refresh(inv)
    out = schemas.InvoiceOut.model_validate(inv)
    _log_event(
        db, user.id, "invoice", out.id, "created", {"amount_cents": out.amount_cents}
    )
    return _envelope(out.model_dump())


@app.get("/invoices/{invoice_id}", tags=["invoices"])
def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    from sqlalchemy.orm import joinedload

    # Eager load client data for single invoice
    i = (
        db.query(models.Invoice)
        .options(joinedload(models.Invoice.client))
        .filter(models.Invoice.id == invoice_id, models.Invoice.user_id == user.id)
        .first()
    )

    if not i:
        raise HTTPException(status_code=404, detail="Invoice not found")

    out = schemas.InvoiceOut.model_validate(i)
    return _envelope(out.model_dump())


@app.put("/invoices/{invoice_id}", tags=["invoices"])
def update_invoice(
    invoice_id: int,
    payload: schemas.InvoiceUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    inv = (
        db.query(models.Invoice)
        .filter(models.Invoice.id == invoice_id, models.Invoice.user_id == user.id)
        .first()
    )
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    data = payload.model_dump(exclude_unset=True)
    if "client_id" in data:
        client = (
            db.query(models.Client)
            .filter(
                models.Client.id == data["client_id"], models.Client.user_id == user.id
            )
            .first()
        )
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
    # Normalize currency & coerce enum strings to Python Enums if present
    if "currency" in data and data["currency"]:
        data["currency"] = data["currency"].upper()
    status_value = data.get("status")
    if status_value is not None:
        try:
            data["status"] = models.InvoiceStatus(status_value)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="Invalid invoice status") from exc
    source_value = data.get("source")
    if source_value is not None:
        try:
            data["source"] = models.Invoice.InvoiceSource(source_value)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="Invalid invoice source") from exc
    for k, v in data.items():
        setattr(inv, k, v)
    db.commit()
    db.refresh(inv)
    out = schemas.InvoiceOut.model_validate(inv)
    return _envelope(out.model_dump())


@app.delete("/invoices/{invoice_id}", tags=["invoices"])
def delete_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    inv = (
        db.query(models.Invoice)
        .filter(models.Invoice.id == invoice_id, models.Invoice.user_id == user.id)
        .first()
    )
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    db.delete(inv)
    db.commit()
    _log_event(db, user.id, "invoice", invoice_id, "deleted", {})
    return _envelope({"id": invoice_id})


# ---- Reminders ----
@app.get("/reminders", tags=["reminders"])
def list_reminders(
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    from sqlalchemy.orm import joinedload

    # Optimized query with eager loading of related invoice data
    q = (
        db.query(models.Reminder)
        .options(joinedload(models.Reminder.invoice))
        .join(models.Invoice)
        .filter(models.Invoice.user_id == user.id)
        .order_by(models.Reminder.send_at.desc())
    )  # Most recent scheduled sends first

    # Get total count efficiently
    total = q.count()

    # Get paginated results with eager loading
    items = q.offset(offset).limit(limit).all()

    return _envelope(
        [schemas.ReminderOut.model_validate(r).model_dump() for r in items],
        {
            "limit": limit,
            "offset": offset,
            "total": total,
            "has_more": offset + limit < total,
        },
    )


@app.post("/reminders", tags=["reminders"])
def create_reminder(
    payload: schemas.ReminderCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    # Enforce subscription limits before creating reminder
    service = get_subscription_service(db)
    can_send, error = service.can_send_reminder(user.id, db)
    if not can_send:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=error)

    inv = (
        db.query(models.Invoice)
        .filter(
            models.Invoice.id == payload.invoice_id, models.Invoice.user_id == user.id
        )
        .first()
    )
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    data = payload.model_dump()
    # Coerce enum strings
    channel_value = data.get("channel")
    if channel_value is not None:
        try:
            data["channel"] = models.Channel(channel_value)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="Invalid reminder channel") from exc
    rem = models.Reminder(**data)
    db.add(rem)
    db.commit()
    db.refresh(rem)
    out = schemas.ReminderOut.model_validate(rem)
    _log_event(
        db, user.id, "reminder", out.id, "created", {"invoice_id": out.invoice_id}
    )
    return _envelope(out.model_dump())


@app.get("/reminders/{reminder_id}", tags=["reminders"])
def get_reminder(
    reminder_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    from sqlalchemy.orm import joinedload

    # Eager load invoice data for single reminder
    r = (
        db.query(models.Reminder)
        .options(joinedload(models.Reminder.invoice))
        .join(models.Invoice)
        .filter(models.Reminder.id == reminder_id, models.Invoice.user_id == user.id)
        .first()
    )

    if not r:
        raise HTTPException(status_code=404, detail="Reminder not found")

    out = schemas.ReminderOut.model_validate(r)
    return _envelope(out.model_dump())


@app.put("/reminders/{reminder_id}", tags=["reminders"])
def update_reminder(
    reminder_id: int,
    payload: schemas.ReminderUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    r = (
        db.query(models.Reminder)
        .join(models.Invoice)
        .filter(models.Reminder.id == reminder_id, models.Invoice.user_id == user.id)
        .first()
    )
    if not r:
        raise HTTPException(status_code=404, detail="Reminder not found")
    data = payload.model_dump(exclude_unset=True)
    # Coerce enums if present
    channel_value = data.get("channel")
    if channel_value is not None:
        try:
            data["channel"] = models.Channel(channel_value)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="Invalid reminder channel") from exc
    status_value = data.get("status")
    if status_value is not None:
        try:
            data["status"] = models.ReminderStatus(status_value)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="Invalid reminder status") from exc
    for k, v in data.items():
        setattr(r, k, v)
    db.commit()
    db.refresh(r)
    out = schemas.ReminderOut.model_validate(r)
    return _envelope(out.model_dump())


@app.delete("/reminders/{reminder_id}", tags=["reminders"])
def delete_reminder(
    reminder_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    r = (
        db.query(models.Reminder)
        .join(models.Invoice)
        .filter(models.Reminder.id == reminder_id, models.Invoice.user_id == user.id)
        .first()
    )
    if not r:
        raise HTTPException(status_code=404, detail="Reminder not found")
    db.delete(r)
    db.commit()
    _log_event(db, user.id, "reminder", reminder_id, "deleted", {})
    return _envelope({"id": reminder_id})


# ---- Analytics ----
@app.get(
    "/analytics/summary",
    tags=["analytics"],
    summary="Get analytics summary",
    description="""
    Retrieve comprehensive analytics summary including:
    - Invoice counts by status (draft, pending, paid, overdue, cancelled)
    - Expected payments in next 30 days 
    - Average days to pay for paid invoices
    - Top 5 late-paying clients with average lateness
    
    Returns aggregated metrics for the authenticated user's invoices.
    """,
    response_description="Analytics summary with status totals, payment metrics, and client analysis",
    responses={
        200: {
            "description": "Successful response with analytics summary",
            "content": {
                "application/json": {
                    "example": {
                        "data": {
                            "totals": {
                                "all": 25,
                                "draft": 3,
                                "pending": 8,
                                "paid": 12,
                                "overdue": 2,
                                "cancelled": 0,
                            },
                            "expected_payments_next_30d": 150000,
                            "avg_days_to_pay": 5.2,
                            "top_late_clients": [
                                {
                                    "client_id": 1,
                                    "client_name": "Acme Corp",
                                    "client_email": "billing@acme.com",
                                    "avg_days_late": 12.5,
                                    "overdue_count": 2,
                                    "total_overdue_amount_cents": 50000,
                                }
                            ],
                        },
                        "meta": {
                            "generated_at": "2024-01-15T10:30:00Z",
                            "currency": "USD",
                            "window_days": 30,
                            "notes": "Expected = pending/overdue invoices with due_date in next 30 days",
                        },
                    }
                }
            },
        },
        401: {"description": "Authentication required"},
        500: {"description": "Internal server error"},
    },
)
def analytics_summary(
    db: Session = Depends(get_db), user: models.User = Depends(get_current_user)
):
    from datetime import datetime, timedelta, timezone

    from sqlalchemy import and_, case, extract, func, or_

    # Track analytics request and timing
    ANALYTICS_REQUESTS_TOTAL.labels(
        endpoint="summary", user_id=str(user.id), status="success"
    ).inc()
    request_start = time.time()

    # Get status totals with a single query using GROUP BY
    query_start = time.time()
    status_counts = (
        db.query(
            models.Invoice.status,
            func.count(models.Invoice.id).label("count"),
            func.sum(models.Invoice.amount_cents).label("total_amount"),
        )
        .filter(models.Invoice.user_id == user.id)
        .group_by(models.Invoice.status)
        .all()
    )
    ANALYTICS_QUERY_DURATION_SECONDS.labels(query_type="status_counts").observe(
        time.time() - query_start
    )

    # Build totals dict with all statuses
    totals = {
        "all": 0,
        "draft": 0,
        "pending": 0,
        "paid": 0,
        "overdue": 0,
        "cancelled": 0,
    }
    expected_payments = 0

    for status, count, total_amount in status_counts:
        status_str = status.value if hasattr(status, "value") else str(status)
        totals[status_str] = count
        totals["all"] += count

        # Sum expected payments for pending/overdue
        if status_str in ["pending", "overdue"]:
            expected_payments += total_amount or 0

    # Calculate average days to pay for paid invoices
    query_start = time.time()
    avg_days_query = (
        db.query(
            func.avg(
                extract("epoch", models.Invoice.paid_at - models.Invoice.created_at)
                / 86400
            ).label("avg_days")
        )
        .filter(
            models.Invoice.user_id == user.id,
            models.Invoice.status == models.InvoiceStatus.paid,
            models.Invoice.paid_at.isnot(None),
        )
        .scalar()
    )
    ANALYTICS_QUERY_DURATION_SECONDS.labels(query_type="avg_days_to_pay").observe(
        time.time() - query_start
    )

    avg_days_to_pay = float(avg_days_query) if avg_days_query else None

    # Get top late clients - clients with highest average lateness
    # Include both overdue and paid-late invoices for accurate average calculation
    now = datetime.now(timezone.utc)
    query_start = time.time()
    top_late_clients_query = (
        db.query(
            models.Client.id.label("client_id"),
            models.Client.name.label("client_name"),
            models.Client.email.label("client_email"),
            func.count(
                case((models.Invoice.status == models.InvoiceStatus.overdue, 1))
            ).label("overdue_count"),
            func.sum(
                case(
                    (
                        models.Invoice.status == models.InvoiceStatus.overdue,
                        models.Invoice.amount_cents,
                    ),
                    else_=0,
                )
            ).label("total_overdue_amount_cents"),
            func.avg(
                case(
                    # For paid invoices: use actual payment date
                    (
                        models.Invoice.paid_at.isnot(None),
                        func.julianday(models.Invoice.paid_at)
                        - func.julianday(models.Invoice.due_date),
                    ),
                    # For overdue invoices: use current date
                    else_=func.julianday("now")
                    - func.julianday(models.Invoice.due_date),
                )
            ).label("avg_days_late"),
        )
        .join(models.Invoice, models.Client.id == models.Invoice.client_id)
        .filter(
            models.Client.user_id == user.id,
            # Include invoices that are either:
            # 1. Currently overdue, OR
            # 2. Were paid after their due date (paid late)
            or_(
                models.Invoice.status == models.InvoiceStatus.overdue,
                and_(
                    models.Invoice.status == models.InvoiceStatus.paid,
                    models.Invoice.paid_at.isnot(None),
                    func.julianday(models.Invoice.paid_at)
                    > func.julianday(models.Invoice.due_date),
                ),
            ),
        )
        .group_by(models.Client.id, models.Client.name, models.Client.email)
        .having(
            # Only include clients who actually have late payments (avg > 0)
            func.avg(
                case(
                    (
                        models.Invoice.paid_at.isnot(None),
                        func.julianday(models.Invoice.paid_at)
                        - func.julianday(models.Invoice.due_date),
                    ),
                    else_=func.julianday("now")
                    - func.julianday(models.Invoice.due_date),
                )
            )
            > 0
        )
        .order_by(
            func.avg(
                case(
                    (
                        models.Invoice.paid_at.isnot(None),
                        func.julianday(models.Invoice.paid_at)
                        - func.julianday(models.Invoice.due_date),
                    ),
                    else_=func.julianday("now")
                    - func.julianday(models.Invoice.due_date),
                )
            ).desc()
        )
        .limit(5)
        .all()
    )
    ANALYTICS_QUERY_DURATION_SECONDS.labels(query_type="top_late_clients").observe(
        time.time() - query_start
    )

    top_late_clients = [
        {
            "client_id": row.client_id,
            "client_name": row.client_name,
            "client_email": row.client_email,
            "avg_days_late": float(row.avg_days_late),
            "overdue_count": row.overdue_count,
            "total_overdue_amount_cents": int(row.total_overdue_amount_cents or 0),
        }
        for row in top_late_clients_query
    ]

    # Check if we have mixed currencies (SQLite compatible)
    currency_count = (
        db.query(func.count(func.distinct(models.Invoice.currency)))
        .filter(models.Invoice.user_id == user.id)
        .scalar()
        or 0
    )

    # Get the first currency if we have exactly one
    single_currency = None
    if currency_count == 1:
        single_currency = (
            db.query(models.Invoice.currency)
            .filter(models.Invoice.user_id == user.id)
            .distinct()
            .first()
        )
        single_currency = single_currency[0] if single_currency else "USD"

    is_mixed_currency = currency_count > 1
    currency_info = (
        "mixed"
        if is_mixed_currency
        else (single_currency if currency_count == 1 else "USD")
    )

    result = schemas.AnalyticsSummaryOut(
        totals=schemas.AnalyticsStatusTotals(**totals),
        expected_payments_next_30d=expected_payments,
        avg_days_to_pay=avg_days_to_pay,
        top_late_clients=top_late_clients,
    )

    # Record overall request duration
    ANALYTICS_REQUEST_DURATION_SECONDS.labels(endpoint="summary").observe(
        time.time() - request_start
    )

    meta = {
        "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "currency": currency_info,
        "window_days": 30,
        "notes": "Expected = pending/overdue invoices with due_date in next 30 days",
    }

    return _envelope(result.model_dump(), meta)


@app.get(
    "/analytics/timeseries",
    tags=["analytics"],
    summary="Get analytics timeseries data",
    description="""
    Retrieve time-series analytics data for various metrics over specified intervals.
    
    **Available Metrics:**
    - `payments`: Invoices that were marked as paid (uses paid_at date)
    - `invoices_created`: New invoices created (uses created_at date) 
    - `invoices_paid`: Invoices that changed to paid status (uses paid_at date)
    - `revenue`: Total monetary value of paid invoices (uses paid_at date)
    
    **Time Intervals:**
    - `day`: Daily aggregation (last 12 days by default)
    - `week`: Weekly aggregation (last 12 weeks by default) 
    - `month`: Monthly aggregation (last 12 months by default)
    
    **Date Range:**
    - Without date parameters: Returns last 12 periods based on interval
    - With custom dates: Returns data within specified date range
    - Date format: ISO 8601 (e.g., '2024-01-01T00:00:00Z')
    
    **Response includes:**
    - Time series data points with period, count, and value
    - Total aggregated count and value across all periods
    - Metadata with effective date range and timezone info
    """,
    response_description="Timeseries data with points, totals, and metadata",
    responses={
        200: {
            "description": "Successful response with timeseries data",
            "content": {
                "application/json": {
                    "example": {
                        "data": {
                            "metric": "payments",
                            "interval": "week",
                            "points": [
                                {
                                    "period": "2024-01-01T00:00:00+00:00",
                                    "value": 125000.0,
                                    "count": 3,
                                },
                                {
                                    "period": "2024-01-08T00:00:00+00:00",
                                    "value": 87500.0,
                                    "count": 2,
                                },
                            ],
                            "total_value": 212500.0,
                            "total_count": 5,
                        },
                        "meta": {
                            "metric": "payments",
                            "interval": "week",
                            "from": "2024-01-01",
                            "to": "2024-01-31",
                            "timezone": "UTC",
                            "series_len": 2,
                        },
                    }
                }
            },
        },
        400: {
            "description": "Bad request - invalid parameters",
            "content": {
                "application/json": {
                    "examples": {
                        "invalid_metric": {
                            "summary": "Invalid metric parameter",
                            "value": {
                                "error": {
                                    "code": 400,
                                    "message": "Invalid metric. Must be one of: ['payments', 'invoices_created', 'invoices_paid', 'revenue']",
                                    "type": "http_error",
                                },
                                "success": False,
                                "data": None,
                            },
                        },
                        "invalid_date_range": {
                            "summary": "Invalid date range",
                            "value": {
                                "error": {
                                    "code": 400,
                                    "message": "from_date must be less than or equal to to_date",
                                    "type": "http_error",
                                },
                                "success": False,
                                "data": None,
                            },
                        },
                        "invalid_date_format": {
                            "summary": "Invalid date format",
                            "value": {
                                "error": {
                                    "code": 400,
                                    "message": "Invalid from_date format. Use ISO 8601 format (e.g., '2024-01-01T00:00:00Z')",
                                    "type": "http_error",
                                },
                                "success": False,
                                "data": None,
                            },
                        },
                    }
                }
            },
        },
        401: {"description": "Authentication required"},
        500: {"description": "Internal server error"},
    },
)
def analytics_timeseries(
    metric: str = Query(
        default="payments",
        description="Metric to analyze",
        pattern="^(payments|invoices_created|invoices_paid|revenue)$",
        examples={"payments": {"value": "payments"}},
    ),
    interval: str = Query(
        default="week",
        description="Time interval for aggregation",
        pattern="^(day|week|month)$",
        examples={"week": {"value": "week"}},
    ),
    from_date: Optional[str] = Query(
        default=None,
        description="Start date for custom date range (ISO 8601 format). If not provided, defaults to 12 periods ago based on interval.",
        pattern=r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$",
        examples={"iso_date": {"value": "2024-01-01T00:00:00Z"}},
    ),
    to_date: Optional[str] = Query(
        default=None,
        description="End date for custom date range (ISO 8601 format). If not provided, defaults to current time. Must be greater than or equal to from_date.",
        pattern=r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$",
        examples={"iso_date": {"value": "2024-12-31T23:59:59Z"}},
    ),
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    from datetime import datetime, timedelta, timezone

    from sqlalchemy import extract, func, text

    # Validate parameters
    valid_metrics = ["payments", "invoices_created", "invoices_paid", "revenue"]
    valid_intervals = ["day", "week", "month"]

    if metric not in valid_metrics:
        raise HTTPException(
            status_code=400, detail=f"Invalid metric. Must be one of: {valid_metrics}"
        )
    if interval not in valid_intervals:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid interval. Must be one of: {valid_intervals}",
        )

    # Validate and parse date parameters
    parsed_from_date = None
    parsed_to_date = None

    if from_date:
        try:
            parsed_from_date = datetime.fromisoformat(from_date.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid from_date format. Use ISO 8601 format (e.g., '2024-01-01T00:00:00Z')",
            )

    if to_date:
        try:
            parsed_to_date = datetime.fromisoformat(to_date.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid to_date format. Use ISO 8601 format (e.g., '2024-01-01T00:00:00Z')",
            )

    # Validate that from_date <= to_date
    if parsed_from_date and parsed_to_date and parsed_from_date > parsed_to_date:
        raise HTTPException(
            status_code=400, detail="from_date must be less than or equal to to_date"
        )

    # Calculate date range (either from parameters or default last 12 periods)
    now = datetime.now(timezone.utc)

    if parsed_from_date or parsed_to_date:
        # Use custom date range
        start_date = parsed_from_date or now - timedelta(
            days=365
        )  # Default to 1 year ago if only to_date provided
        end_date = parsed_to_date or now  # Default to now if only from_date provided
    else:
        # Use default date range (last 12 periods)
        if interval == "day":
            start_date = now - timedelta(days=12)
        elif interval == "week":
            start_date = now - timedelta(weeks=12)
        else:  # month
            start_date = now - timedelta(days=365)
        end_date = now

    # Set date truncation for SQL grouping
    if interval == "day":
        date_trunc = "day"
    elif interval == "week":
        date_trunc = "week"
    else:  # month
        date_trunc = "month"

    # Build SQLite-compatible date formatting
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")
    is_sqlite = DATABASE_URL.startswith("sqlite")

    if is_sqlite:
        # For SQLite, use strftime for date truncation
        if interval == "day":
            date_format = "%Y-%m-%d"
        elif interval == "week":
            # SQLite doesn't have week truncation, so we'll use date and group by week
            date_format = "%Y-%W"  # Year-Week
        else:  # month
            date_format = "%Y-%m"

        date_column = func.strftime(
            date_format,
            (
                models.Invoice.paid_at
                if metric in ["payments", "invoices_paid", "revenue"]
                else models.Invoice.created_at
            ),
        )
    else:
        # For PostgreSQL, use date_trunc
        date_column = func.date_trunc(
            date_trunc,
            (
                models.Invoice.paid_at
                if metric in ["payments", "invoices_paid", "revenue"]
                else models.Invoice.created_at
            ),
        )

    # Build query based on metric
    if metric == "payments":
        # Payments = invoices that were paid
        base_query = db.query(
            date_column.label("period"),
            func.count(models.Invoice.id).label("count"),
            func.sum(models.Invoice.amount_cents).label("value"),
        ).filter(
            models.Invoice.user_id == user.id,
            models.Invoice.status == models.InvoiceStatus.paid,
            models.Invoice.paid_at >= start_date,
            models.Invoice.paid_at <= end_date,
            models.Invoice.paid_at.isnot(None),
        )
    elif metric == "invoices_created":
        base_query = db.query(
            date_column.label("period"),
            func.count(models.Invoice.id).label("count"),
            func.sum(models.Invoice.amount_cents).label("value"),
        ).filter(
            models.Invoice.user_id == user.id,
            models.Invoice.created_at >= start_date,
            models.Invoice.created_at <= end_date,
        )
    elif metric == "invoices_paid":
        base_query = db.query(
            date_column.label("period"),
            func.count(models.Invoice.id).label("count"),
            func.sum(models.Invoice.amount_cents).label("value"),
        ).filter(
            models.Invoice.user_id == user.id,
            models.Invoice.status == models.InvoiceStatus.paid,
            models.Invoice.paid_at >= start_date,
            models.Invoice.paid_at <= end_date,
            models.Invoice.paid_at.isnot(None),
        )
    else:  # revenue
        # Revenue = sum of all paid invoices
        base_query = db.query(
            date_column.label("period"),
            func.count(models.Invoice.id).label("count"),
            func.sum(models.Invoice.amount_cents).label("value"),
        ).filter(
            models.Invoice.user_id == user.id,
            models.Invoice.status == models.InvoiceStatus.paid,
            models.Invoice.paid_at >= start_date,
            models.Invoice.paid_at <= end_date,
            models.Invoice.paid_at.isnot(None),
        )

    results = base_query.group_by(date_column).order_by(text("period")).all()

    # Convert results to response format
    points = []
    total_value = 0
    total_count = 0

    for period, count, value in results:
        if period:  # Skip null periods
            # Handle SQLite string periods vs PostgreSQL datetime periods
            if is_sqlite and isinstance(period, str):
                # Convert SQLite string format to ISO date
                try:
                    if interval == "day":
                        # Period is YYYY-MM-DD
                        period_str = f"{period}T00:00:00.000Z"
                    elif interval == "week":
                        # Period is YYYY-WW, convert to first day of that week
                        year, week = period.split("-")
                        # Approximate: first day of year + week * 7 days
                        base_date = datetime(int(year), 1, 1, tzinfo=timezone.utc)
                        week_start = base_date + timedelta(weeks=int(week))
                        period_str = week_start.isoformat()
                    else:  # month
                        # Period is YYYY-MM
                        year, month = period.split("-")
                        period_date = datetime(
                            int(year), int(month), 1, tzinfo=timezone.utc
                        )
                        period_str = period_date.isoformat()
                except:
                    # Fallback: use period as-is
                    period_str = str(period)
            else:
                # PostgreSQL datetime period
                period_str = (
                    period.isoformat() if hasattr(period, "isoformat") else str(period)
                )

            value_float = float(value or 0)
            count_int = int(count or 0)

            points.append(
                {"period": period_str, "value": value_float, "count": count_int}
            )

            total_value += value_float
            total_count += count_int

    result = schemas.AnalyticsTimeseriesOut(
        metric=metric,
        interval=interval,
        points=points,
        total_value=total_value,
        total_count=total_count,
    )

    meta = {
        "metric": metric,
        "interval": interval,
        "from": start_date.date().isoformat(),
        "to": end_date.date().isoformat(),
        "timezone": "UTC",
        "series_len": len(points),
    }

    return _envelope(result.model_dump(), meta)


# ---- Templates ----
@app.get("/templates", tags=["templates"])
def list_templates(
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    q = db.query(models.Template).filter(models.Template.user_id == user.id)
    total = q.count()
    items = q.offset(offset).limit(limit).all()
    return _envelope(
        [schemas.TemplateOut.model_validate(t).model_dump() for t in items],
        {"limit": limit, "offset": offset, "total": total},
    )


@app.post("/templates", tags=["templates"])
def create_template(
    payload: schemas.TemplateCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    t = models.Template(user_id=user.id, **payload.model_dump())
    db.add(t)
    db.commit()
    db.refresh(t)
    return _envelope(schemas.TemplateOut.model_validate(t).model_dump())


@app.get("/templates/{template_id}", tags=["templates"])
def get_template(
    template_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    t = (
        db.query(models.Template)
        .filter(models.Template.id == template_id, models.Template.user_id == user.id)
        .first()
    )
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")
    return _envelope(schemas.TemplateOut.model_validate(t).model_dump())


@app.put("/templates/{template_id}", tags=["templates"])
def update_template(
    template_id: int,
    payload: schemas.TemplateUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    t = (
        db.query(models.Template)
        .filter(models.Template.id == template_id, models.Template.user_id == user.id)
        .first()
    )
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(t, k, v)
    db.commit()
    db.refresh(t)
    return _envelope(schemas.TemplateOut.model_validate(t).model_dump())


@app.delete("/templates/{template_id}", tags=["templates"])
def delete_template(
    template_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    t = (
        db.query(models.Template)
        .filter(models.Template.id == template_id, models.Template.user_id == user.id)
        .first()
    )
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")
    db.delete(t)
    db.commit()
    return _envelope({"id": template_id})


# ---- Events ----
@app.get("/events", tags=["events"])
def list_events(
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    q = (
        db.query(models.Event)
        .filter(models.Event.user_id == user.id)
        .order_by(models.Event.created_at.desc())
    )
    total = q.count()
    items = q.offset(offset).limit(limit).all()
    return _envelope(
        [schemas.EventOut.model_validate(e).model_dump() for e in items],
        {"limit": limit, "offset": offset, "total": total},
    )


@app.post("/events", tags=["events"])
def create_event(
    event: schemas.EventCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Create a new event for tracking user actions"""
    db_event = models.Event(**event.model_dump(), user_id=user.id)
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return _envelope(schemas.EventOut.model_validate(db_event).model_dump())


# ---- Auth Profile ----
@app.get("/auth/me", tags=["auth"])
def get_current_user_profile(user: models.User = Depends(get_current_user)):
    """Get current user profile including onboarding status"""
    return _envelope(
        {
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "email_verified": user.email_verified,
            "onboarding_status": user.onboarding_status,
            "stripe_account_id": user.stripe_account_id,
            "payment_method": user.payment_method,
            "onboarding_completed_at": (
                user.onboarding_completed_at.isoformat()
                if user.onboarding_completed_at
                else None
            ),
            "created_at": user.created_at.isoformat(),
            "updated_at": user.updated_at.isoformat(),
        }
    )


@app.patch("/auth/me", tags=["auth"])
def update_user_profile(
    update_data: dict,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Update current user profile including onboarding status"""
    # Update allowed fields
    allowed_fields = {
        "onboarding_status",
        "payment_method",
        "stripe_account_id",
        "email_verified",
    }
    for field, value in update_data.items():
        if field in allowed_fields:
            setattr(user, field, value)

    # Set onboarding completion time if status is completed
    if (
        update_data.get("onboarding_status") == "completed"
        and not user.onboarding_completed_at
    ):
        user.updated_at = datetime.now(timezone.utc)
        user.onboarding_completed_at = datetime.now(timezone.utc)

    user.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)

    return _envelope(
        {
            "id": user.id,
            "email": user.email,
            "onboarding_status": user.onboarding_status,
            "payment_method": user.payment_method,
            "onboarding_completed_at": (
                user.onboarding_completed_at.isoformat()
                if user.onboarding_completed_at
                else None
            ),
        }
    )


# Add PUT endpoint for browsers that have CORS issues with PATCH
@app.put("/auth/me", tags=["auth"])
def update_user_profile_put(
    update_data: dict,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Update current user profile including onboarding status (PUT version for CORS compatibility)"""
    return update_user_profile(update_data, db, user)


# ---- Onboarding ----


@app.post("/auth/send-verification", tags=["auth"])
def send_verification_email(
    request: dict,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Send email verification email"""
    import os

    if user.email != request.get("email"):
        raise HTTPException(
            status_code=400, detail="Email does not match account email"
        )

    # Generate a verification token
    verification_token = jwt.encode(
        {
            "user_id": user.id,
            "email": user.email,
            "exp": datetime.now(timezone.utc) + timedelta(hours=24),
            "type": "email_verification",
        },
        SECRET_KEY,
        algorithm=ALGORITHM,
    )

    user.email_verification_token = verification_token
    db.commit()

    # Check if demo mode or development
    demo_mode = os.getenv("DEMO_MODE", "true").lower() == "true"

    if demo_mode:
        # In demo mode, auto-verify for better UX
        user.email_verified = True
        db.commit()

        return _envelope(
            {
                "message": "Demo mode: Verification email sent and auto-verified",
                "demo_auto_verified": True,
                "verification_token": verification_token,  # Include for testing
            }
        )
    else:
        # In production, send actual email here
        # For now, just simulate sending
        return _envelope(
            {
                "message": "Verification email sent successfully",
                "demo_auto_verified": False,
                "estimated_delivery": "2-5 minutes",
            }
        )


@app.post("/onboarding/sample-data", tags=["onboarding"])
def create_sample_data(
    db: Session = Depends(get_db), user: models.User = Depends(get_current_user)
):
    """Create sample clients and invoices for demo purposes"""

    # Sample clients
    sample_clients = [
        {
            "name": "Acme Corporation",
            "email": "billing@acme.com",
            "timezone": "America/New_York",
        },
        {
            "name": "Tech Solutions Inc",
            "email": "accounts@techsolutions.com",
            "timezone": "America/Los_Angeles",
        },
        {
            "name": "Global Enterprises Ltd",
            "email": "finance@globalent.com",
            "timezone": "Europe/London",
        },
    ]

    created_clients = []
    for client_data in sample_clients:
        db_client = models.Client(**client_data, user_id=user.id)
        db.add(db_client)
        db.commit()
        db.refresh(db_client)
        created_clients.append(db_client)

    # Sample invoices
    from datetime import date

    sample_invoices = [
        {
            "client": created_clients[0],
            "amount_cents": 150000,
            "due_date": date.today() + timedelta(days=30),
            "status": "pending",
        },
        {
            "client": created_clients[0],
            "amount_cents": 75000,
            "due_date": date.today() - timedelta(days=5),
            "status": "overdue",
        },
        {
            "client": created_clients[1],
            "amount_cents": 250000,
            "due_date": date.today() + timedelta(days=15),
            "status": "pending",
        },
        {
            "client": created_clients[1],
            "amount_cents": 100000,
            "due_date": date.today() - timedelta(days=10),
            "status": "overdue",
        },
        {
            "client": created_clients[2],
            "amount_cents": 500000,
            "due_date": date.today() + timedelta(days=7),
            "status": "pending",
        },
        {
            "client": created_clients[2],
            "amount_cents": 300000,
            "due_date": date.today() - timedelta(days=3),
            "status": "paid",
        },
    ]

    created_invoices = []
    for invoice_data in sample_invoices:
        db_invoice = models.Invoice(
            user_id=user.id,
            client_id=invoice_data["client"].id,
            amount_cents=invoice_data["amount_cents"],
            due_date=invoice_data["due_date"],
            status=invoice_data["status"],
            currency="USD",
        )
        if invoice_data["status"] == "paid":
            db_invoice.paid_at = datetime.now(timezone.utc)

        db.add(db_invoice)
        db.commit()
        db.refresh(db_invoice)
        created_invoices.append(db_invoice)

    return _envelope(
        {
            "message": "Sample data created successfully",
            "clients_created": len(created_clients),
            "invoices_created": len(created_invoices),
        }
    )


# ---- Reminder Preview ----
def _render_template(
    subject_tpl: str, body_md_tpl: str, ctx: dict
) -> tuple[str, str, str]:
    # Delegate to email_templates to also sanitize and wrap
    subj, text, html = render_markdown_template(subject_tpl, body_md_tpl, ctx)
    return subj, text, html


def _missing_vars(subject_tpl: str, body_md_tpl: str, provided: dict) -> list[str]:
    return discover_missing_vars(subject_tpl, body_md_tpl, provided)


@app.post("/reminders/preview", tags=["reminders"])
def reminder_preview(
    payload: schemas.ReminderPreviewRequest,
    db: Session = Depends(get_db),
    user: models.User | None = Depends(get_current_user_optional),
):
    # New API: explicit variables
    if payload.variables is not None:
        tone = payload.tone or "friendly"
        # Load repo template by name or fallback to built-in presets
        subject_tpl = None
        body_tpl = None
        if payload.template:
            with suppress(Exception):
                subject_tpl, body_tpl = load_markdown_template(payload.template)
        if subject_tpl is None or body_tpl is None:
            preset = TONE_PRESETS.get(tone, TONE_PRESETS["neutral"])
            subject_tpl = preset["subject"]
            body_tpl = preset["body"]
        # If subject failed to parse from frontmatter and default placeholder leaked through,
        # fall back to tone preset subject to avoid false "subject" missing errors.
        if (not subject_tpl) or subject_tpl.strip() == "{{ subject }}":
            preset = TONE_PRESETS.get(tone, TONE_PRESETS["neutral"])
            subject_tpl = preset["subject"]
        vars = payload.variables or {}
        # Ensure tone available to template expressions
        vars.setdefault("tone", tone)
        # Compute missing vars directly from the active templates
        missing = _missing_vars(subject_tpl, body_tpl, vars)
        if missing:
            logger.info(
                "preview_missing_vars template=%s tone=%s missing=%s",
                payload.template,
                tone,
                missing,
            )
            raise HTTPException(status_code=400, detail={"missing": missing})
        try:
            subj, text, body_html = _render_template(subject_tpl, body_tpl, vars)
            return _envelope(
                schemas.ReminderPreviewOut(
                    subject=subj, html=body_html, text=text
                ).model_dump()
            )
        except Exception as e:
            # Fallback to built-in presets if repo template fails to render
            logger.warning(
                "preview_render_error template=%s tone=%s error=%s",
                payload.template,
                tone,
                e,
            )
            preset = TONE_PRESETS.get(tone, TONE_PRESETS["neutral"])
            subj, text, body_html = _render_template(
                preset["subject"], preset["body"], vars
            )
            return _envelope(
                schemas.ReminderPreviewOut(
                    subject=subj, html=body_html, text=text
                ).model_dump()
            )

    # Legacy path: from invoice/client
    if not payload.invoice_id:
        raise HTTPException(status_code=400, detail="invoice_id or variables required")
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized"
        )
    inv = (
        db.query(models.Invoice)
        .filter(
            models.Invoice.id == payload.invoice_id, models.Invoice.user_id == user.id
        )
        .first()
    )
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    client = (
        db.query(models.Client)
        .filter(models.Client.id == inv.client_id, models.Client.user_id == user.id)
        .first()
    )
    tone = payload.tone or "friendly"
    preset = TONE_PRESETS.get(tone, TONE_PRESETS["neutral"])
    subject_tpl = preset["subject"]
    body_tpl = preset["body"]
    if payload.template_id:
        t = (
            db.query(models.Template)
            .filter(
                models.Template.id == payload.template_id,
                models.Template.user_id == user.id,
            )
            .first()
        )
        if t:
            subject_tpl, body_tpl = t.subject, t.body_markdown
    else:
        t = (
            db.query(models.Template)
            .filter(models.Template.user_id == user.id, models.Template.tone == tone)
            .first()
        )
        if t:
            subject_tpl, body_tpl = t.subject, t.body_markdown
    vars = {
        "invoice_id": inv.id,
        "invoice_number": inv.id,
        "client_name": client.name if client else "",
        # New preferred keys
        "due_date_iso": inv.due_date.isoformat(),
        "amount_formatted": f"{inv.amount_cents/100:.2f} {inv.currency}",
        "pay_link": inv.payment_link_url or "",
        "from_name": os.getenv("MAIL_FROM_NAME") or "DueSpark",
        # Back-compat keys for older templates
        "due_date": inv.due_date.isoformat(),
        "amount": f"{inv.amount_cents/100:.2f}",
        "currency": inv.currency,
    }
    try:
        subj, text, body_html = _render_template(subject_tpl, body_tpl, vars)
        return _envelope(
            schemas.ReminderPreviewOut(
                subject=subj, html=body_html, text=text
            ).model_dump()
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Template render error: {e}")


@app.post("/reminders/send-now", tags=["reminders"])
def reminders_send_now(
    payload: schemas.ReminderSendNowRequest,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    service = get_subscription_service(db)

    r = (
        db.query(models.Reminder)
        .join(models.Invoice)
        .filter(
            models.Reminder.id == payload.reminder_id, models.Invoice.user_id == user.id
        )
        .first()
    )
    if not r:
        raise HTTPException(status_code=404, detail="Reminder not found")
    inv = (
        db.query(models.Invoice)
        .filter(models.Invoice.id == r.invoice_id, models.Invoice.user_id == user.id)
        .first()
    )
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    client = (
        db.query(models.Client)
        .filter(models.Client.id == inv.client_id, models.Client.user_id == user.id)
        .first()
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    can_send, error = service.can_send_reminder(user.id, db)
    if not can_send:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=error)
    # Idempotency guard: if already sent in last 10 minutes
    if not payload.force:
        try:
            now_utc = datetime.now(timezone.utc)
            # Treat already-sent reminder as recently sent unless sent_at is older than window
            if r.status == models.ReminderStatus.sent:
                sent_at = r.sent_at or now_utc
                if sent_at.tzinfo is None:
                    sent_at = sent_at.replace(tzinfo=timezone.utc)
                if (now_utc - sent_at).total_seconds() < 600:
                    raise HTTPException(
                        status_code=409,
                        detail="Already sent recently; use force=true to resend",
                    )
            elif getattr(r, "sent_at", None):
                sent_at = r.sent_at
                if sent_at and sent_at.tzinfo is None:
                    sent_at = sent_at.replace(tzinfo=timezone.utc)
                if sent_at and (now_utc - sent_at).total_seconds() < 600:
                    raise HTTPException(
                        status_code=409,
                        detail="Already sent recently; use force=true to resend",
                    )
        except HTTPException:
            raise
        except Exception as exc:
            # If anything is off, do not block send but capture context for observability
            logger.debug(
                "reminder_idempotency_check_failed reminder_id=%s error=%s",
                r.id,
                exc,
                exc_info=True,
            )
    # Choose template
    if r.subject and r.body:
        subject = r.subject
        body_md = r.body
    else:
        preset = TONE_PRESETS.get("friendly", TONE_PRESETS["neutral"])
        subject = preset["subject"]
        body_md = preset["body"]
    if r.template_id:
        t = (
            db.query(models.Template)
            .filter(
                models.Template.id == r.template_id, models.Template.user_id == user.id
            )
            .first()
        )
        if t:
            subject, body_md = t.subject, t.body_markdown
    # Context
    tone = getattr(t, "tone", "friendly") if "t" in locals() and t else "friendly"
    ctx = {
        "invoice_id": inv.id,
        "invoice_number": inv.id,
        "client_name": client.name or "",
        # New preferred keys
        "due_date_iso": inv.due_date.isoformat(),
        "amount_formatted": f"{inv.amount_cents/100:.2f} {inv.currency}",
        "pay_link": inv.payment_link_url or "",
        "from_name": os.getenv("MAIL_FROM_NAME") or "DueSpark",
        # Back-compat keys for older templates
        "due_date": inv.due_date.isoformat(),
        "amount": f"{inv.amount_cents/100:.2f}",
        "currency": inv.currency,
        "tone": tone,
    }
    subj, text_rendered, body_html = _render_template(subject, body_md, ctx)
    # Send email via provider (Postmark preferred)
    try:
        provider = get_email_provider()
        headers = {
            "X-App-Reminder-Id": str(r.id),
            "X-App-User-Id": str(user.id),
            "X-Idempotency-Key": f"reminder:{r.id}",
        }
        # Optional transactional outbox
        if os.getenv("OUTBOX_ENABLED", "false").lower() in ("1", "true", "yes"):
            ob = models.Outbox(
                topic="email.send",
                payload={
                    "to_email": client.email,
                    "subject": subj,
                    "html": body_html,
                    "text": text_rendered,
                    "headers": headers,
                    "reminder_id": r.id,
                },
                status="pending",
            )
            db.add(ob)
            db.commit()
            db.refresh(ob)
            # Do not mark reminder as sent here; dispatcher will update it
            return _envelope({"queued": True, "outbox_id": ob.id})
        resp = provider.send(
            to_email=client.email,
            subject=subj,
            html=body_html,
            text=text_rendered,
            headers=headers,
        )
        # Update reminder
        r.status = models.ReminderStatus.sent
        r.subject = subj
        r.body = text_rendered

        # Phase 3: Reminder usage tracking can be implemented here if needed
        meta = r.meta or {}
        meta.update(
            {
                "provider": resp.get("provider", "postmark"),
                "to": client.email,
                "tracking": {"opens": True, "links": True},
                "message_id": resp.get("message_id"),
                "template": "reminder",
                "tone": tone,
                "idempotency_key": f"reminder:{r.id}",
            }
        )
        r.meta = meta
        r.sent_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(r)
        service.record_reminder_sent(user.id, db)
        return _envelope(
            {"message_id": meta.get("message_id"), "status": r.status.value}
        )
    except Exception as e:
        r.status = models.ReminderStatus.failed
        meta = r.meta or {}
        meta.update({"error": str(e)})
        r.meta = meta
        db.commit()
        db.refresh(r)
        raise HTTPException(status_code=502, detail=f"Send failed: {e}")


# ---- Stripe Integration ----
def _get_user_stripe_acct(db: Session, user_id: int) -> models.StripeAccount | None:
    return (
        db.query(models.StripeAccount)
        .filter(models.StripeAccount.user_id == user_id)
        .first()
    )


@app.get("/integrations/stripe/connect", tags=["integrations"])
def stripe_connect_start(
    db: Session = Depends(get_db), user: models.User = Depends(get_current_user)
):
    try:
        # Check if Stripe is properly configured
        if not STRIPE_CLIENT_ID:
            return _envelope(
                {
                    "error": "Stripe integration not configured for this environment",
                    "demo_mode": True,
                    "message": "In demo mode, Stripe connection is not available. You can still use manual invoicing.",
                }
            )

        if not STRIPE_REDIRECT_URI:
            raise HTTPException(
                status_code=500, detail="Stripe redirect URI not configured"
            )

        # Create a secure state token
        state = create_access_token(sub=user.email, expires_minutes=10)

        # Build Stripe OAuth URL
        params = {
            "response_type": "code",
            "client_id": STRIPE_CLIENT_ID,
            "scope": "read_write",
            "redirect_uri": STRIPE_REDIRECT_URI,
            "state": state,
        }

        # Validate client_id format (should start with ca_)
        if not STRIPE_CLIENT_ID.startswith("ca_"):
            return _envelope(
                {
                    "error": "Invalid Stripe client ID configuration",
                    "demo_mode": True,
                    "message": "Demo credentials detected. Please configure real Stripe credentials for production use.",
                }
            )

        url = "https://connect.stripe.com/oauth/authorize?" + urlencode(params)

        # Log the connection attempt for debugging
        logging.info(f"Stripe connect initiated for user {user.email}")

        return _envelope({"url": url})

    except Exception as e:
        logging.error(f"Stripe connect error for user {user.email}: {str(e)}")
        return _envelope(
            {
                "error": f"Failed to initiate Stripe connection: {str(e)}",
                "demo_mode": True,
                "message": "Unable to connect to Stripe. You can use manual invoicing instead.",
            }
        )


@app.get("/integrations/stripe/status", tags=["integrations"])
def stripe_connect_status(
    db: Session = Depends(get_db), user: models.User = Depends(get_current_user)
):
    acct = _get_user_stripe_acct(db, user.id)
    return _envelope(
        {
            "connected": bool(acct),
            "account_id": acct.stripe_account_id if acct else None,
        }
    )


@app.get("/integrations/stripe/callback", tags=["integrations"])
def stripe_connect_callback(code: str, state: str, db: Session = Depends(get_db)):
    if not STRIPE_SECRET_KEY or not STRIPE_CLIENT_ID:
        raise HTTPException(status_code=400, detail="Stripe not configured")
    # Identify user from OAuth state (JWT we issued in connect_start)
    try:
        payload = jwt.decode(state, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if not email:
            raise ValueError("Invalid state")
        user = db.query(models.User).filter(models.User.email == email).first()
        if not user:
            raise ValueError("User not found")
    except Exception:
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        resp = stripe.OAuth.token(grant_type="authorization_code", code=code)
        acct_id = resp.get("stripe_user_id") or resp.get("stripe_user_id")
        access_token = resp.get("access_token")
        refresh_token = resp.get("refresh_token")
        scope = resp.get("scope")
        livemode = 1 if resp.get("livemode") else 0
        existing = (
            db.query(models.StripeAccount)
            .filter(models.StripeAccount.user_id == user.id)
            .first()
        )
        if existing:
            existing.stripe_account_id = acct_id
            existing.access_token = access_token
            existing.refresh_token = refresh_token
            existing.scope = scope
            existing.livemode = livemode
        else:
            db.add(
                models.StripeAccount(
                    user_id=user.id,
                    stripe_account_id=acct_id,
                    access_token=access_token,
                    refresh_token=refresh_token,
                    scope=scope,
                    livemode=livemode,
                )
            )
        db.commit()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Stripe connect failed: {e}")
    return _envelope({"connected": True})


def _upsert_invoice_from_stripe(db: Session, user_id: int, stripe_invoice: dict):
    ext_id = stripe_invoice.get("id")
    amount_cents = (
        stripe_invoice.get("amount_due") or stripe_invoice.get("amount_remaining") or 0
    )
    currency = (stripe_invoice.get("currency") or "usd").lower()
    due_date = stripe_invoice.get("due_date")
    status_map = {
        "draft": models.InvoiceStatus.draft,
        "open": models.InvoiceStatus.pending,
        "paid": models.InvoiceStatus.paid,
        "uncollectible": models.InvoiceStatus.overdue,
        "void": models.InvoiceStatus.cancelled,
    }
    status = status_map.get(
        stripe_invoice.get("status") or "open", models.InvoiceStatus.pending
    )
    # Map to a client by email if present, else fail gracefully
    customer_email = (stripe_invoice.get("customer_email") or "").strip()
    client = None
    if customer_email:
        client = (
            db.query(models.Client)
            .filter(
                models.Client.user_id == user_id, models.Client.email == customer_email
            )
            .first()
        )
        if not client:
            client = models.Client(
                user_id=user_id, name=customer_email.split("@")[0], email=customer_email
            )
            db.add(client)
            db.commit()
            db.refresh(client)
    if not client:
        # Without a client we cannot store; push to dead letter
        raise ValueError("No client match for Stripe invoice")
    # Idempotent upsert by external_id (Stripe invoice id)
    inv = (
        db.query(models.Invoice)
        .filter(models.Invoice.user_id == user_id, models.Invoice.external_id == ext_id)
        .first()
    )
    if inv:
        inv.amount_cents = amount_cents
        inv.currency = currency
        inv.status = status
    else:
        inv = models.Invoice(
            user_id=user_id,
            client_id=client.id,
            amount_cents=amount_cents,
            currency=currency,
            due_date=(
                stripe_invoice.get("due_date")
                and __import__("datetime").datetime.utcfromtimestamp(due_date).date()
            )
            or __import__("datetime").date.today(),
            status=status,
            external_id=ext_id,
            source="stripe",
        )
        db.add(inv)
    # paid_at mapping
    paid_ts = stripe_invoice.get("status_transitions", {}).get("paid_at")
    if paid_ts:
        with suppress(Exception):
            inv.paid_at = (
                __import__("datetime")
                .datetime.utcfromtimestamp(paid_ts)
                .replace(tzinfo=__import__("datetime").timezone.utc)
            )
    db.commit()


@app.post("/webhooks/stripe", tags=["integrations"])
async def stripe_webhook_legacy(
    request: Request,
    db: Session = Depends(webhook_handlers.get_db),
):
    """Compatibility endpoint that proxies to the webhook router logic."""
    return await webhook_handlers.stripe_webhook(request, db)


@app.post("/integrations/stripe/payment_link", tags=["integrations"])
def create_payment_link(
    invoice_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=400, detail="Stripe not configured")
    inv = (
        db.query(models.Invoice)
        .filter(models.Invoice.id == invoice_id, models.Invoice.user_id == user.id)
        .first()
    )
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if inv.status == models.InvoiceStatus.paid:
        raise HTTPException(status_code=400, detail="Invoice already paid")
    acct = _get_user_stripe_acct(db, user.id)
    if not acct:
        raise HTTPException(status_code=400, detail="Connect your Stripe account first")
    # If link already exists, return it (idempotent)
    if inv.payment_link_url:
        return _envelope({"payment_link_url": inv.payment_link_url})
    # Only allow for manual invoices
    if inv.source != models.Invoice.InvoiceSource.manual:
        raise HTTPException(
            status_code=400, detail="Payment link only for manual invoices"
        )
    try:
        # Create a one-off product + price, then a payment link on the connected account
        idem_prefix = f"invoice:{inv.id}"
        product = stripe.Product.create(
            name=f"DueSpark Invoice #{inv.id}",
            stripe_account=acct.stripe_account_id,
            idempotency_key=f"{idem_prefix}:product",
        )
        price = stripe.Price.create(
            unit_amount=inv.amount_cents,
            currency=inv.currency.lower(),
            product=product["id"],
            stripe_account=acct.stripe_account_id,
            idempotency_key=f"{idem_prefix}:price",
        )
        plink = stripe.PaymentLink.create(
            line_items=[{"price": price["id"], "quantity": 1}],
            stripe_account=acct.stripe_account_id,
            idempotency_key=f"{idem_prefix}:plink",
        )
        inv.payment_link_url = plink["url"]
        db.commit()
        db.refresh(inv)
        return _envelope({"payment_link_url": inv.payment_link_url})
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Failed to create payment link: {e}"
        )


# Retry/backoff worker for dead letters
BACKOFF_SCHEDULE = [60, 300, 900, 3600]  # seconds


def _retry_dead_letter(db: SessionLocal, dl: models.DeadLetter):
    kind = dl.kind
    payload = dl.payload or {}
    if kind in ("webhook_stripe", "stripe.import"):
        try:
            acct_id = payload.get("account") or payload.get("account_id")
            stripe_acct = (
                db.query(models.StripeAccount)
                .filter(models.StripeAccount.stripe_account_id == acct_id)
                .first()
                if acct_id
                else None
            )
            # For import payloads, try to upsert invoice directly
            data_obj = payload.get("data", {}).get("object") or payload
            if not stripe_acct:
                raise ValueError("Unknown Stripe account during retry")
            _upsert_invoice_from_stripe(db, stripe_acct.user_id, data_obj)
            # Success: delete dead letter
            db.delete(dl)
            db.commit()
            return True
        except Exception as e:
            dl.retries = (dl.retries or 0) + 1
            # schedule next attempt
            from datetime import datetime, timedelta, timezone

            delay = BACKOFF_SCHEDULE[min(dl.retries - 1, len(BACKOFF_SCHEDULE) - 1)]
            dl.next_attempt_at = datetime.now(timezone.utc) + timedelta(seconds=delay)
            dl.error = str(e)
            db.commit()
            return False
    else:
        # Unknown kind: mark as failed without retrying further
        dl.retries = (dl.retries or 0) + 1
        db.commit()
        return False


async def _dead_letter_worker():
    while True:
        try:
            from datetime import datetime, timezone

            db = SessionLocal()
            # fetch due items
            due_items = (
                db.query(models.DeadLetter)
                .filter(
                    (models.DeadLetter.next_attempt_at == None)
                    | (models.DeadLetter.next_attempt_at <= datetime.now(timezone.utc))
                )
                .limit(10)
                .all()
            )
            for dl in due_items:
                _retry_dead_letter(db, dl)
            db.close()
        except Exception as e:
            logger.error(json.dumps({"event": "dlq_worker_error", "error": str(e)}))
        await asyncio.sleep(30)


# Startup is handled by lifespan handler above


@app.post("/integrations/stripe/disconnect", tags=["integrations"])
def stripe_disconnect(
    db: Session = Depends(get_db), user: models.User = Depends(get_current_user)
):
    acct = _get_user_stripe_acct(db, user.id)
    if not acct:
        return _envelope({"disconnected": True})
    # Attempt deauthorization (optional in test mode)
    with suppress(Exception):
        stripe.OAuth.deauthorize(
            client_id=STRIPE_CLIENT_ID, stripe_user_id=acct.stripe_account_id
        )
    from datetime import datetime, timezone

    acct.revoked_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(acct)
    return _envelope({"disconnected": True})


@app.post("/integrations/stripe/import-invoices", tags=["integrations"])
def stripe_import_invoices(
    since: str | None = None,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    acct = _get_user_stripe_acct(db, user.id)
    if not acct:
        raise HTTPException(status_code=400, detail="Connect your Stripe account first")
    # Parse since as ISO date/time
    created_filter = None
    if since:
        try:
            from datetime import datetime, timezone

            dt = datetime.fromisoformat(since.replace("Z", "+00:00"))
            created_filter = {"gte": int(dt.timestamp())}
        except Exception:
            raise HTTPException(
                status_code=400, detail="Invalid since format; use ISO 8601"
            )
    try:
        params = {}
        if created_filter:
            params["created"] = created_filter
        # Paginate over Stripe invoices for connected account
        starting_after = None
        imported = 0
        while True:
            page = stripe.Invoice.list(
                limit=50,
                starting_after=starting_after,
                stripe_account=acct.stripe_account_id,
                **params,
            )
            data = page.get("data", [])
            if not data:
                break
            for inv in data:
                try:
                    _upsert_invoice_from_stripe(db, user.id, inv)
                    imported += 1
                except Exception as e:
                    db.add(
                        models.DeadLetter(
                            kind="stripe.import", payload=inv, error=str(e)
                        )
                    )
                    db.commit()
            if page.get("has_more"):
                starting_after = data[-1]["id"]
            else:
                break
        return _envelope({"imported": imported})
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Import failed: {e}")


# ---- Admin: Dead Letters ----
@app.get("/admin/dead_letters", tags=["admin"])
def list_dead_letters(
    limit: int = 50,
    offset: int = 0,
    after_id: int | None = None,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    # Enforce admin role
    if getattr(user, "role", None) != getattr(models.UserRole, "admin", None):
        raise HTTPException(status_code=403, detail="Forbidden")
    q = db.query(models.DeadLetter).order_by(models.DeadLetter.id.desc())
    if after_id:
        q = q.filter(models.DeadLetter.id < after_id)
    items = q.limit(limit).all()
    next_cursor = items[-1].id if len(items) == limit else None
    return _envelope(
        [schemas.DeadLetterOut.model_validate(d).model_dump() for d in items],
        {"limit": limit, "after_id": after_id, "next_cursor": next_cursor},
    )


@app.post("/admin/dead_letters/{dl_id}/retry", tags=["admin"])
def retry_dead_letter(
    dl_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    if getattr(user, "role", None) != getattr(models.UserRole, "admin", None):
        raise HTTPException(status_code=403, detail="Forbidden")
    dl = db.query(models.DeadLetter).filter(models.DeadLetter.id == dl_id).first()
    if not dl:
        raise HTTPException(status_code=404, detail="Not found")
    dl.retries = (dl.retries or 0) + 1
    dl.next_attempt_at = datetime.now(timezone.utc) + timedelta(minutes=5)
    db.commit()
    db.refresh(dl)
    return _envelope({"id": dl.id, "retries": dl.retries})


@app.delete("/admin/dead_letters/{dl_id}", tags=["admin"])
def delete_dead_letter(
    dl_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    if getattr(user, "role", None) != getattr(models.UserRole, "admin", None):
        raise HTTPException(status_code=403, detail="Forbidden")
    dl = db.query(models.DeadLetter).filter(models.DeadLetter.id == dl_id).first()
    if not dl:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(dl)
    db.commit()
    return _envelope({"id": dl_id})


# ---- Admin: Requeue Failed Reminders ----
@app.post("/admin/reminders/requeue-failed", tags=["admin"])
def requeue_failed_reminders(
    limit: int = 50,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    if getattr(user, "role", None) != getattr(models.UserRole, "admin", None):
        raise HTTPException(status_code=403, detail="Forbidden")
    q = (
        db.query(models.Reminder)
        .filter(models.Reminder.status == models.ReminderStatus.failed)
        .order_by(models.Reminder.updated_at.asc())
    )
    items = q.limit(limit).all()
    n = 0
    now_utc = datetime.now(timezone.utc)
    for r in items:
        r.status = models.ReminderStatus.scheduled
        # set next attempt soon
        r.send_at = now_utc + timedelta(minutes=1)
        db.add(r)
        n += 1
    db.commit()
    return _envelope({"requeued": n})


# ---- Admin: Outbox ----
@app.get("/admin/outbox", tags=["admin"])
def list_outbox(
    limit: int = 50,
    after_id: int | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    if getattr(user, "role", None) != getattr(models.UserRole, "admin", None):
        raise HTTPException(status_code=403, detail="Forbidden")
    q = db.query(models.Outbox).order_by(models.Outbox.id.desc())
    if status:
        q = q.filter(models.Outbox.status == status)
    if after_id:
        q = q.filter(models.Outbox.id < after_id)
    items = q.limit(limit).all()
    next_cursor = items[-1].id if len(items) == limit else None
    return _envelope(
        [schemas.OutboxOut.model_validate(o).model_dump() for o in items],
        {"limit": limit, "after_id": after_id, "next_cursor": next_cursor},
    )


@app.post("/admin/outbox/{outbox_id}/retry", tags=["admin"])
def retry_outbox(
    outbox_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    if getattr(user, "role", None) != getattr(models.UserRole, "admin", None):
        raise HTTPException(status_code=403, detail="Forbidden")
    ob = db.query(models.Outbox).filter(models.Outbox.id == outbox_id).first()
    if not ob:
        raise HTTPException(status_code=404, detail="Not found")
    from datetime import datetime, timezone

    ob.next_attempt_at = datetime.now(timezone.utc)
    ob.status = "pending"
    db.commit()
    db.refresh(ob)
    return _envelope({"id": ob.id, "status": ob.status})


# ---- Dev: Promote user to admin (guarded by env) ----
@app.post("/dev/admin/promote", include_in_schema=False)
def dev_promote_admin(payload: dict, db: Session = Depends(get_db)):
    flag = os.getenv("DEV_ENABLE_ADMIN_PROMOTE", "").lower() in ("1", "true", "yes")
    if not flag:
        raise HTTPException(status_code=404, detail="Not found")
    email = (payload or {}).get("email")
    if not email:
        raise HTTPException(status_code=400, detail="email required")
    u = db.query(models.User).filter(models.User.email == email).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    try:
        u.role = models.UserRole.admin
        db.commit()
        db.refresh(u)
        return _envelope({"email": u.email, "role": u.role.value})
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ---- Admin: Scheduler Controls ----
class RequeueRequest(schemas.BaseModel):
    dlq_id: int


@app.post("/admin/scheduler/requeue", tags=["admin"])
def admin_requeue_scheduler(
    payload: dict,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    if getattr(user, "role", None) != getattr(models.UserRole, "admin", None):
        raise HTTPException(status_code=403, detail="Forbidden")
    dl_id = int(payload.get("dlq_id", 0))
    dl = db.query(models.DeadLetter).filter(models.DeadLetter.id == dl_id).first()
    if not dl:
        raise HTTPException(status_code=404, detail="DLQ not found")
    kind = dl.kind or ""
    try:
        if kind.startswith("reminder.send"):
            rid = (dl.payload or {}).get("reminder_id")
            if not rid:
                raise ValueError("Missing reminder_id")
            # Re-schedule immediate retry by resetting status and send_at
            r = db.query(models.Reminder).filter(models.Reminder.id == int(rid)).first()
            if not r:
                raise ValueError("Reminder not found")
            r.status = models.ReminderStatus.scheduled
            from datetime import datetime, timedelta, timezone

            # Set to immediate to allow next poller run to pick it up
            r.send_at = datetime.now(timezone.utc)
            db.commit()
        elif kind.startswith("adaptive.compute"):
            # Trigger adaptive compute now (for the whole tenant if client_id unknown)
            from app.scheduler import job_compute_adaptive_schedules

            job_compute_adaptive_schedules()
        else:
            raise ValueError("Unsupported DLQ kind")
        # On success, delete DLQ entry
        db.delete(dl)
        db.commit()
        return _envelope({"requeued": True})
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Requeue failed: {e}")


@app.post("/admin/scheduler/run-adaptive", tags=["admin"])
def admin_run_adaptive(
    payload: dict | None = None,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    if getattr(user, "role", None) != getattr(models.UserRole, "admin", None):
        raise HTTPException(status_code=403, detail="Forbidden")
    # For MVP, run global adaptive. Optionally filter by user_id in future.
    from app.scheduler import job_compute_adaptive_schedules

    job_compute_adaptive_schedules()
    return _envelope({"triggered": True})


@app.post("/admin/test-email", tags=["admin"])
async def test_email_endpoint(
    payload: dict,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Test email functionality - sends a test email to specified address"""
    if getattr(user, "role", None) != getattr(models.UserRole, "admin", None):
        raise HTTPException(status_code=403, detail="Admin access required")

    try:
        to_email = payload.get("to")
        if not to_email:
            raise HTTPException(status_code=400, detail="'to' email address required")

        subject = payload.get("subject", "DueSpark Test Email")

        # Get email provider
        email_provider = get_email_provider()

        # Simple test email content
        html_content = f"""
        <html>
            <body>
                <h2>DueSpark Email Test</h2>
                <p>This is a test email from your DueSpark deployment.</p>
                <p><strong>Timestamp:</strong> {datetime.now(timezone.utc).isoformat()}</p>
                <p><strong>Environment:</strong> {os.getenv('ENVIRONMENT', 'development')}</p>
                <p><strong>Email Provider:</strong> {os.getenv('EMAIL_PROVIDER', 'unknown')}</p>
                <p><strong>AWS Region:</strong> {os.getenv('AWS_REGION', 'unknown')}</p>
                <br>
                <p>If you received this email, your email configuration is working correctly!</p>
                <hr>
                <small>DueSpark - Invoice Reminder System</small>
            </body>
        </html>
        """

        # Send email
        message_id = await email_provider.send_email(
            to_email=to_email,
            subject=subject,
            html_content=html_content,
            text_content=f"DueSpark Test Email - {datetime.now(timezone.utc).isoformat()}"
        )

        return _envelope({
            "status": "sent",
            "message_id": message_id,
            "to": to_email,
            "subject": subject,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })

    except Exception as e:
        logging.error(f"Test email failed: {e}")
        raise HTTPException(status_code=500, detail=f"Email test failed: {str(e)}")


@app.get("/admin/email-config", tags=["admin"])
def get_email_config(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Get email configuration info (non-sensitive data only)"""
    if getattr(user, "role", None) != getattr(models.UserRole, "admin", None):
        raise HTTPException(status_code=403, detail="Admin access required")

    return _envelope({
        "provider": os.getenv("EMAIL_PROVIDER", "unknown"),
        "region": os.getenv("AWS_REGION", "unknown"),
        "ses_region": os.getenv("AWS_SES_REGION", "unknown"),
        "from_email": os.getenv("EMAIL_FROM", "unknown"),
        "mail_from": os.getenv("MAIL_FROM", "unknown"),
        "environment": os.getenv("ENVIRONMENT", "development"),
        "has_aws_access_key": bool(os.getenv("AWS_ACCESS_KEY_ID")),
        "has_aws_secret": bool(os.getenv("AWS_SECRET_ACCESS_KEY"))
    })


@app.post("/test-email-simple", tags=["testing"])
async def simple_test_email(payload: dict):
    """Simple test email endpoint (no auth required - for testing only)"""
    # Only allow in development/staging environments
    if os.getenv("ENVIRONMENT", "development").lower() == "production":
        if not os.getenv("ALLOW_SIMPLE_TEST_EMAIL", "false").lower() == "true":
            raise HTTPException(status_code=403, detail="Simple test email disabled in production")

    try:
        to_email = payload.get("to")
        if not to_email:
            raise HTTPException(status_code=400, detail="'to' email address required")

        subject = payload.get("subject", "DueSpark Simple Test Email")

        # Get email provider
        email_provider = get_email_provider()

        # Simple test email content
        html_content = f"""
        <html>
            <body>
                <h2>DueSpark Simple Email Test</h2>
                <p>This is a simple test email from your DueSpark deployment.</p>
                <p><strong>Timestamp:</strong> {datetime.now(timezone.utc).isoformat()}</p>
                <p><strong>Provider:</strong> {os.getenv('EMAIL_PROVIDER', 'unknown')}</p>
                <br>
                <p>✅ Your email system is working!</p>
                <hr>
                <small>DueSpark - Automated Invoice Reminders</small>
            </body>
        </html>
        """

        # Send email
        message_id = await email_provider.send_email(
            to_email=to_email,
            subject=subject,
            html_content=html_content,
            text_content=f"DueSpark Simple Test - {datetime.now(timezone.utc).isoformat()}"
        )

        return {
            "status": "success",
            "message": "Test email sent successfully",
            "message_id": message_id,
            "to": to_email,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

    except Exception as e:
        logging.error(f"Simple test email failed: {e}")
        raise HTTPException(status_code=500, detail=f"Email test failed: {str(e)}")
