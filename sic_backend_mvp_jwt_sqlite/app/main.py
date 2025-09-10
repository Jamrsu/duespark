
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import Base, engine, get_db, SessionLocal
from app import models, schemas
from app.auth import hash_password, verify_password, create_access_token, get_current_user, get_current_user_optional, SECRET_KEY, ALGORITHM
import os, json, stripe, jwt, logging, asyncio
from urllib.parse import urlencode
from datetime import datetime, timedelta, timezone
from contextlib import asynccontextmanager
from jinja2 import Environment, BaseLoader, StrictUndefined
import markdown as md
from app.email_provider import get_email_provider
from app.scheduler import init_scheduler
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
from app.email_templates import (
    load_markdown_template,
    discover_missing_vars,
    render_markdown_template,
)

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
            pass
        try:
            scheduler.shutdown(wait=False)
        except Exception:
            pass

app = FastAPI(title="DueSpark – Backend MVP", version="0.2.0", lifespan=app_lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Stripe configuration from environment
STRIPE_SECRET_KEY = os.getenv('STRIPE_SECRET_KEY', '')
STRIPE_CLIENT_ID = os.getenv('STRIPE_CLIENT_ID', '')
STRIPE_WEBHOOK_SECRET = os.getenv('STRIPE_WEBHOOK_SECRET', '')
STRIPE_REDIRECT_URI = os.getenv('STRIPE_REDIRECT_URI', 'http://localhost:8000/integrations/stripe/callback')
STRIPE_API_VERSION = os.getenv('STRIPE_API_VERSION')
PUBLIC_BASE_URL = os.getenv('PUBLIC_BASE_URL', 'http://localhost:8000')
if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY
if STRIPE_API_VERSION:
    stripe.api_version = STRIPE_API_VERSION

# Observability: logger and counters
logger = logging.getLogger("duespark")
logging.basicConfig(level=logging.INFO)
metrics = {
    'webhooks_received': 0,
    'webhooks_processed': 0,
    'imports_created': 0,
    'imports_updated': 0,
    'dlq_count': 0,
}

# Prometheus counters
PROM_SCHEDULER_RUNS = Counter("duespark_scheduler_runs_total", "Scheduler job runs", ["job"])
PROM_SCHEDULER_ERRORS = Counter("duespark_scheduler_errors_total", "Scheduler job errors", ["job"])
PROM_REMINDERS_SENT = Counter("duespark_reminders_sent_total", "Reminders sent")
PROM_REMINDERS_SCHEDULED = Counter("duespark_reminders_scheduled_total", "Reminders scheduled")

# AC-compatible aliases
SCHEDULER_REMINDERS_ENQUEUED_TOTAL = Counter("scheduler_reminders_enqueued_total", "Reminders enqueued for sending")
SCHEDULER_REMINDERS_SENT_TOTAL = Counter("scheduler_reminders_sent_total", "Reminders sent")
SCHEDULER_REMINDERS_FAILED_TOTAL = Counter("scheduler_reminders_failed_total", "Reminder sends failed")
SCHEDULER_ADAPTIVE_RUNS_TOTAL = Counter("scheduler_adaptive_runs_total", "Adaptive scheduler runs")
DLQ_ITEMS_TOTAL = Counter("dlq_items_total", "DLQ items", ["topic"])

# Histograms & Gauges
EMAIL_SEND_DURATION_SECONDS = Histogram("email_send_duration_seconds", "Email send duration (seconds)")
SCHEDULE_COMPUTE_DURATION_SECONDS = Histogram("schedule_compute_duration_seconds", "Adaptive scheduling compute duration (seconds)")
REMINDERS_PENDING = Gauge("reminders_pending", "Reminders pending in next lookahead window (minutes)")

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

@app.get('/metrics', include_in_schema=False)
def metrics_json():
    try:
        # update dlq count live
        db = SessionLocal()
        metrics['dlq_count'] = db.query(models.DeadLetter).count()
        # update pending gauge for next lookahead window (5 mins default)
        from datetime import datetime, timezone, timedelta
        now = datetime.now(timezone.utc)
        lookahead = int(os.getenv('SCHEDULER_LOOKAHEAD_MIN', '5'))
        pending = db.query(models.Reminder).filter(models.Reminder.status == models.ReminderStatus.scheduled, models.Reminder.send_at <= now + timedelta(minutes=lookahead)).count()
        try:
            REMINDERS_PENDING.set(pending)
        except Exception:
            pass
        db.close()
    except Exception:
        pass
    return metrics

@app.get('/metrics_prom', include_in_schema=False)
def metrics_prometheus():
    data = generate_latest()  # type: ignore
    from fastapi import Response
    return Response(content=data, media_type=CONTENT_TYPE_LATEST)

def _envelope(data, meta=None):
    return {"data": data, "meta": (meta or {})}

def _log_event(db: Session, user_id: int, entity_type: str, entity_id: int, event_type: str, payload: dict | None = None):
    try:
        ev = models.Event(user_id=user_id, entity_type=entity_type, entity_id=entity_id, event_type=event_type, payload=payload or {})
        db.add(ev)
        db.commit()
    except Exception:
        db.rollback()

# ---- Auth ----
@app.post("/auth/register", tags=["auth"])
def register(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    exists = db.query(models.User).filter(models.User.email == payload.email).first()
    if exists:
        raise HTTPException(status_code=409, detail="Email already registered")
    user = models.User(email=payload.email, password_hash=hash_password(payload.password))
    db.add(user); db.commit()
    token = create_access_token(sub=payload.email)
    tok = schemas.Token(access_token=token)
    return _envelope(tok.model_dump())

@app.post("/auth/login", tags=["auth"])
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form.username).first()
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token(sub=user.email)
    tok = schemas.Token(access_token=token)
    return _envelope(tok.model_dump())

# ---- Clients ----
@app.get("/clients", tags=["clients"])
def list_clients(limit: int = 50, offset: int = 0, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    q = db.query(models.Client).filter(models.Client.user_id == user.id)
    total = q.count()
    items = q.offset(offset).limit(limit).all()
    return _envelope([schemas.ClientOut.model_validate(i).model_dump() for i in items], {"limit": limit, "offset": offset, "total": total})

@app.post("/clients", tags=["clients"])
def create_client(payload: schemas.ClientCreate, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    c = models.Client(user_id=user.id, **payload.model_dump())
    db.add(c); db.commit(); db.refresh(c)
    out = schemas.ClientOut.model_validate(c)
    _log_event(db, user.id, "client", out.id, "created", {"name": out.name})
    return _envelope(out.model_dump())

@app.get("/clients/{client_id}", tags=["clients"])
def get_client(client_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    c = db.query(models.Client).filter(models.Client.id == client_id, models.Client.user_id == user.id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Client not found")
    out = schemas.ClientOut.model_validate(c)
    return _envelope(out.model_dump())

@app.put("/clients/{client_id}", tags=["clients"])
def update_client(client_id: int, payload: schemas.ClientUpdate, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    c = db.query(models.Client).filter(models.Client.id == client_id, models.Client.user_id == user.id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Client not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(c, k, v)
    db.commit(); db.refresh(c)
    out = schemas.ClientOut.model_validate(c)
    return {"data": out.model_dump(), "meta": {}}

@app.delete("/clients/{client_id}", tags=["clients"])
def delete_client(client_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    c = db.query(models.Client).filter(models.Client.id == client_id, models.Client.user_id == user.id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Client not found")
    db.delete(c); db.commit()
    _log_event(db, user.id, "client", client_id, "deleted", {})
    return _envelope({"id": client_id})

# ---- Invoices ----
@app.get("/invoices", tags=["invoices"])
def list_invoices(limit: int = 50, offset: int = 0, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    q = db.query(models.Invoice).filter(models.Invoice.user_id == user.id)
    total = q.count()
    items = q.offset(offset).limit(limit).all()
    return _envelope([schemas.InvoiceOut.model_validate(i).model_dump() for i in items], {"limit": limit, "offset": offset, "total": total})

@app.post("/invoices", tags=["invoices"])
def create_invoice(payload: schemas.InvoiceCreate, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    # ensure client belongs to user
    client = db.query(models.Client).filter(models.Client.id == payload.client_id, models.Client.user_id == user.id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    data = payload.model_dump()
    # Normalize currency to uppercase (validator also enforces length)
    if 'currency' in data and data['currency']:
        data['currency'] = data['currency'].upper()
    # Coerce enum strings to Python Enums
    try:
        if 'status' in data and data['status'] is not None:
            data['status'] = models.InvoiceStatus(data['status'])
    except Exception:
        pass
    try:
        if 'source' in data and data['source'] is not None:
            data['source'] = models.Invoice.InvoiceSource(data['source'])
    except Exception:
        pass
    inv = models.Invoice(user_id=user.id, **data)
    db.add(inv); db.commit(); db.refresh(inv)
    out = schemas.InvoiceOut.model_validate(inv)
    _log_event(db, user.id, "invoice", out.id, "created", {"amount_cents": out.amount_cents})
    return _envelope(out.model_dump())

@app.get("/invoices/{invoice_id}", tags=["invoices"])
def get_invoice(invoice_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    i = db.query(models.Invoice).filter(models.Invoice.id == invoice_id, models.Invoice.user_id == user.id).first()
    if not i:
        raise HTTPException(status_code=404, detail="Invoice not found")
    out = schemas.InvoiceOut.model_validate(i)
    return _envelope(out.model_dump())

@app.put("/invoices/{invoice_id}", tags=["invoices"])
def update_invoice(invoice_id: int, payload: schemas.InvoiceUpdate, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    inv = db.query(models.Invoice).filter(models.Invoice.id == invoice_id, models.Invoice.user_id == user.id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    data = payload.model_dump(exclude_unset=True)
    if 'client_id' in data:
        client = db.query(models.Client).filter(models.Client.id == data['client_id'], models.Client.user_id == user.id).first()
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
    # Normalize currency & coerce enum strings to Python Enums if present
    if 'currency' in data and data['currency']:
        data['currency'] = data['currency'].upper()
    if 'status' in data and data['status'] is not None:
        try:
            data['status'] = models.InvoiceStatus(data['status'])
        except Exception:
            pass
    if 'source' in data and data['source'] is not None:
        try:
            data['source'] = models.Invoice.InvoiceSource(data['source'])
        except Exception:
            pass
    for k, v in data.items():
        setattr(inv, k, v)
    db.commit(); db.refresh(inv)
    out = schemas.InvoiceOut.model_validate(inv)
    return _envelope(out.model_dump())

@app.delete("/invoices/{invoice_id}", tags=["invoices"])
def delete_invoice(invoice_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    inv = db.query(models.Invoice).filter(models.Invoice.id == invoice_id, models.Invoice.user_id == user.id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    db.delete(inv); db.commit()
    _log_event(db, user.id, "invoice", invoice_id, "deleted", {})
    return _envelope({"id": invoice_id})

# ---- Reminders ----
@app.get("/reminders", tags=["reminders"])
def list_reminders(limit: int = 50, offset: int = 0, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    q = db.query(models.Reminder).join(models.Invoice).filter(models.Invoice.user_id == user.id)
    total = q.count()
    items = q.offset(offset).limit(limit).all()
    return _envelope([schemas.ReminderOut.model_validate(r).model_dump() for r in items], {"limit": limit, "offset": offset, "total": total})

@app.post("/reminders", tags=["reminders"])
def create_reminder(payload: schemas.ReminderCreate, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    inv = db.query(models.Invoice).filter(models.Invoice.id == payload.invoice_id, models.Invoice.user_id == user.id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    data = payload.model_dump()
    # Coerce enum strings
    try:
        if 'channel' in data and data['channel'] is not None:
            data['channel'] = models.Channel(data['channel'])
    except Exception:
        pass
    rem = models.Reminder(**data)
    db.add(rem); db.commit(); db.refresh(rem)
    out = schemas.ReminderOut.model_validate(rem)
    _log_event(db, user.id, "reminder", out.id, "created", {"invoice_id": out.invoice_id})
    return _envelope(out.model_dump())

@app.get("/reminders/{reminder_id}", tags=["reminders"])
def get_reminder(reminder_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    r = db.query(models.Reminder).join(models.Invoice).filter(models.Reminder.id == reminder_id, models.Invoice.user_id == user.id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Reminder not found")
    out = schemas.ReminderOut.model_validate(r)
    return _envelope(out.model_dump())

@app.put("/reminders/{reminder_id}", tags=["reminders"])
def update_reminder(reminder_id: int, payload: schemas.ReminderUpdate, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    r = db.query(models.Reminder).join(models.Invoice).filter(models.Reminder.id == reminder_id, models.Invoice.user_id == user.id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Reminder not found")
    data = payload.model_dump(exclude_unset=True)
    # Coerce enums if present
    if 'channel' in data and data['channel'] is not None:
        try:
            data['channel'] = models.Channel(data['channel'])
        except Exception:
            pass
    if 'status' in data and data['status'] is not None:
        try:
            data['status'] = models.ReminderStatus(data['status'])
        except Exception:
            pass
    for k, v in data.items():
        setattr(r, k, v)
    db.commit(); db.refresh(r)
    out = schemas.ReminderOut.model_validate(r)
    return _envelope(out.model_dump())

@app.delete("/reminders/{reminder_id}", tags=["reminders"])
def delete_reminder(reminder_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    r = db.query(models.Reminder).join(models.Invoice).filter(models.Reminder.id == reminder_id, models.Invoice.user_id == user.id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Reminder not found")
    db.delete(r); db.commit()
    _log_event(db, user.id, "reminder", reminder_id, "deleted", {})
    return _envelope({"id": reminder_id})

# ---- Analytics ----
@app.get("/analytics/summary", tags=["analytics"])
def analytics_summary(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    q = db.query(models.Invoice).filter(models.Invoice.user_id == user.id)
    invoices = q.all()
    totals = dict(all=len(invoices),
                  pending=sum(1 for i in invoices if i.status == models.InvoiceStatus.pending),
                  overdue=sum(1 for i in invoices if i.status == models.InvoiceStatus.overdue),
                  paid=sum(1 for i in invoices if i.status == models.InvoiceStatus.paid))
    expected = sum(i.amount_cents for i in invoices if i.status in (models.InvoiceStatus.pending, models.InvoiceStatus.overdue))
    return _envelope({"totals": totals, "expected_payments_next_30d": expected})

# ---- Templates ----
@app.get("/templates", tags=["templates"])
def list_templates(limit: int = 50, offset: int = 0, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    q = db.query(models.Template).filter(models.Template.user_id == user.id)
    total = q.count(); items = q.offset(offset).limit(limit).all()
    return _envelope([schemas.TemplateOut.model_validate(t).model_dump() for t in items], {"limit": limit, "offset": offset, "total": total})

@app.post("/templates", tags=["templates"])
def create_template(payload: schemas.TemplateCreate, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    t = models.Template(user_id=user.id, **payload.model_dump())
    db.add(t); db.commit(); db.refresh(t)
    return _envelope(schemas.TemplateOut.model_validate(t).model_dump())

@app.get("/templates/{template_id}", tags=["templates"])
def get_template(template_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    t = db.query(models.Template).filter(models.Template.id == template_id, models.Template.user_id == user.id).first()
    if not t: raise HTTPException(status_code=404, detail="Template not found")
    return _envelope(schemas.TemplateOut.model_validate(t).model_dump())

@app.put("/templates/{template_id}", tags=["templates"])
def update_template(template_id: int, payload: schemas.TemplateUpdate, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    t = db.query(models.Template).filter(models.Template.id == template_id, models.Template.user_id == user.id).first()
    if not t: raise HTTPException(status_code=404, detail="Template not found")
    for k, v in payload.model_dump(exclude_unset=True).items(): setattr(t, k, v)
    db.commit(); db.refresh(t)
    return _envelope(schemas.TemplateOut.model_validate(t).model_dump())

@app.delete("/templates/{template_id}", tags=["templates"])
def delete_template(template_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    t = db.query(models.Template).filter(models.Template.id == template_id, models.Template.user_id == user.id).first()
    if not t: raise HTTPException(status_code=404, detail="Template not found")
    db.delete(t); db.commit()
    return _envelope({"id": template_id})

# ---- Events ----
@app.get("/events", tags=["events"])
def list_events(limit: int = 50, offset: int = 0, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    q = db.query(models.Event).filter(models.Event.user_id == user.id).order_by(models.Event.created_at.desc())
    total = q.count(); items = q.offset(offset).limit(limit).all()
    return _envelope([schemas.EventOut.model_validate(e).model_dump() for e in items], {"limit": limit, "offset": offset, "total": total})

# ---- Reminder Preview ----
def _render_template(subject_tpl: str, body_md_tpl: str, ctx: dict) -> tuple[str, str, str]:
    # Delegate to email_templates to also sanitize and wrap
    subj, text, html = render_markdown_template(subject_tpl, body_md_tpl, ctx)
    return subj, text, html

def _missing_vars(subject_tpl: str, body_md_tpl: str, provided: dict) -> list[str]:
    return discover_missing_vars(subject_tpl, body_md_tpl, provided)

@app.post("/reminders/preview", tags=["reminders"])
def reminder_preview(payload: schemas.ReminderPreviewRequest, db: Session = Depends(get_db), user: models.User | None = Depends(get_current_user_optional)):
    # New API: explicit variables
    if payload.variables is not None:
        tone = payload.tone or "friendly"
        # Load repo template by name or fallback to built-in presets
        subject_tpl = None
        body_tpl = None
        if payload.template:
            try:
                subject_tpl, body_tpl = load_markdown_template(payload.template)
            except Exception:
                pass
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
        vars.setdefault('tone', tone)
        # Compute missing vars directly from the active templates
        missing = _missing_vars(subject_tpl, body_tpl, vars)
        if missing:
            try:
                logger.info(json.dumps({
                    'event': 'preview_missing_vars',
                    'template': payload.template,
                    'tone': tone,
                    'missing': missing,
                }))
            except Exception:
                pass
            raise HTTPException(status_code=400, detail={"missing": missing})
        try:
            subj, text, body_html = _render_template(subject_tpl, body_tpl, vars)
            return _envelope(schemas.ReminderPreviewOut(subject=subj, html=body_html, text=text).model_dump())
        except Exception as e:
            # Fallback to built-in presets if repo template fails to render
            try:
                logger.warning(json.dumps({
                    'event': 'preview_render_error',
                    'template': payload.template,
                    'tone': tone,
                    'error': str(e),
                }))
            except Exception:
                pass
            preset = TONE_PRESETS.get(tone, TONE_PRESETS["neutral"])
            subj, text, body_html = _render_template(preset["subject"], preset["body"], vars)
            return _envelope(schemas.ReminderPreviewOut(subject=subj, html=body_html, text=text).model_dump())

    # Legacy path: from invoice/client
    if not payload.invoice_id:
        raise HTTPException(status_code=400, detail="invoice_id or variables required")
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
    inv = db.query(models.Invoice).filter(models.Invoice.id == payload.invoice_id, models.Invoice.user_id == user.id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    client = db.query(models.Client).filter(models.Client.id == inv.client_id, models.Client.user_id == user.id).first()
    tone = payload.tone or "friendly"
    preset = TONE_PRESETS.get(tone, TONE_PRESETS["neutral"])
    subject_tpl = preset["subject"]
    body_tpl = preset["body"]
    if payload.template_id:
        t = db.query(models.Template).filter(models.Template.id == payload.template_id, models.Template.user_id == user.id).first()
        if t:
            subject_tpl, body_tpl = t.subject, t.body_markdown
    else:
        t = db.query(models.Template).filter(models.Template.user_id == user.id, models.Template.tone == tone).first()
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
        "from_name": os.getenv('MAIL_FROM_NAME') or 'DueSpark',
        # Back-compat keys for older templates
        "due_date": inv.due_date.isoformat(),
        "amount": f"{inv.amount_cents/100:.2f}",
        "currency": inv.currency,
    }
    try:
        subj, text, body_html = _render_template(subject_tpl, body_tpl, vars)
        return _envelope(schemas.ReminderPreviewOut(subject=subj, html=body_html, text=text).model_dump())
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Template render error: {e}")

@app.post("/reminders/send-now", tags=["reminders"])
def reminders_send_now(payload: schemas.ReminderSendNowRequest, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    r = db.query(models.Reminder).join(models.Invoice).filter(models.Reminder.id == payload.reminder_id, models.Invoice.user_id == user.id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Reminder not found")
    inv = db.query(models.Invoice).filter(models.Invoice.id == r.invoice_id, models.Invoice.user_id == user.id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    client = db.query(models.Client).filter(models.Client.id == inv.client_id, models.Client.user_id == user.id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
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
                    raise HTTPException(status_code=409, detail="Already sent recently; use force=true to resend")
            elif getattr(r, 'sent_at', None):
                sent_at = r.sent_at
                if sent_at and sent_at.tzinfo is None:
                    sent_at = sent_at.replace(tzinfo=timezone.utc)
                if sent_at and (now_utc - sent_at).total_seconds() < 600:
                    raise HTTPException(status_code=409, detail="Already sent recently; use force=true to resend")
        except HTTPException:
            raise
        except Exception:
            # If anything is off, do not block send
            pass
    # Choose template
    if r.subject and r.body:
        subject = r.subject
        body_md = r.body
    else:
        preset = TONE_PRESETS.get("friendly", TONE_PRESETS["neutral"])
        subject = preset["subject"]
        body_md = preset["body"]
    if r.template_id:
        t = db.query(models.Template).filter(models.Template.id == r.template_id, models.Template.user_id == user.id).first()
        if t:
            subject, body_md = t.subject, t.body_markdown
    # Context
    tone = getattr(t, 'tone', 'friendly') if 't' in locals() and t else 'friendly'
    ctx = {
        "invoice_id": inv.id,
        "invoice_number": inv.id,
        "client_name": client.name or "",
        # New preferred keys
        "due_date_iso": inv.due_date.isoformat(),
        "amount_formatted": f"{inv.amount_cents/100:.2f} {inv.currency}",
        "pay_link": inv.payment_link_url or "",
        "from_name": os.getenv('MAIL_FROM_NAME') or 'DueSpark',
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
        }
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
        meta = r.meta or {}
        meta.update({
            "provider": resp.get("provider", "postmark"),
            "to": client.email,
            "tracking": {"opens": True, "links": True},
            "message_id": resp.get("message_id"),
            "template": "reminder",
            "tone": tone,
        })
        r.meta = meta
        r.sent_at = datetime.now(timezone.utc)
        db.commit(); db.refresh(r)
        return _envelope({"message_id": meta.get("message_id"), "status": r.status.value})
    except Exception as e:
        r.status = models.ReminderStatus.failed
        meta = r.meta or {}
        meta.update({"error": str(e)})
        r.meta = meta
        db.commit(); db.refresh(r)
        raise HTTPException(status_code=502, detail=f"Send failed: {e}")

# ---- Stripe Integration ----
def _get_user_stripe_acct(db: Session, user_id: int) -> models.StripeAccount | None:
    return db.query(models.StripeAccount).filter(models.StripeAccount.user_id == user_id).first()

@app.get('/integrations/stripe/connect', tags=['integrations'])
def stripe_connect_start(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    if not STRIPE_CLIENT_ID:
        raise HTTPException(status_code=400, detail='Stripe not configured')
    state = create_access_token(sub=user.email, expires_minutes=10)
    params = {
        'response_type': 'code',
        'client_id': STRIPE_CLIENT_ID,
        'scope': 'read_write',
        'redirect_uri': STRIPE_REDIRECT_URI,
        'state': state,
    }
    url = 'https://connect.stripe.com/oauth/authorize?' + urlencode(params)
    return _envelope({'url': url})

@app.get('/integrations/stripe/status', tags=['integrations'])
def stripe_connect_status(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    acct = _get_user_stripe_acct(db, user.id)
    return _envelope({'connected': bool(acct), 'account_id': acct.stripe_account_id if acct else None})

@app.get('/integrations/stripe/callback', tags=['integrations'])
def stripe_connect_callback(code: str, state: str, db: Session = Depends(get_db)):
    if not STRIPE_SECRET_KEY or not STRIPE_CLIENT_ID:
        raise HTTPException(status_code=400, detail='Stripe not configured')
    # Identify user from OAuth state (JWT we issued in connect_start)
    try:
        payload = jwt.decode(state, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get('sub')
        if not email:
            raise ValueError('Invalid state')
        user = db.query(models.User).filter(models.User.email == email).first()
        if not user:
            raise ValueError('User not found')
    except Exception:
        raise HTTPException(status_code=401, detail='Unauthorized')
    try:
        resp = stripe.OAuth.token(grant_type='authorization_code', code=code)
        acct_id = resp.get('stripe_user_id') or resp.get('stripe_user_id')
        access_token = resp.get('access_token')
        refresh_token = resp.get('refresh_token')
        scope = resp.get('scope')
        livemode = 1 if resp.get('livemode') else 0
        existing = db.query(models.StripeAccount).filter(models.StripeAccount.user_id == user.id).first()
        if existing:
            existing.stripe_account_id = acct_id
            existing.access_token = access_token
            existing.refresh_token = refresh_token
            existing.scope = scope
            existing.livemode = livemode
        else:
            db.add(models.StripeAccount(user_id=user.id, stripe_account_id=acct_id, access_token=access_token, refresh_token=refresh_token, scope=scope, livemode=livemode))
        db.commit()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Stripe connect failed: {e}")
    return _envelope({'connected': True})

def _upsert_invoice_from_stripe(db: Session, user_id: int, stripe_invoice: dict):
    ext_id = stripe_invoice.get('id')
    amount_cents = stripe_invoice.get('amount_due') or stripe_invoice.get('amount_remaining') or 0
    currency = (stripe_invoice.get('currency') or 'usd').lower()
    due_date = stripe_invoice.get('due_date')
    status_map = {
        'draft': models.InvoiceStatus.draft,
        'open': models.InvoiceStatus.pending,
        'paid': models.InvoiceStatus.paid,
        'uncollectible': models.InvoiceStatus.overdue,
        'void': models.InvoiceStatus.cancelled,
    }
    status = status_map.get(stripe_invoice.get('status') or 'open', models.InvoiceStatus.pending)
    # Map to a client by email if present, else fail gracefully
    customer_email = (stripe_invoice.get('customer_email') or '').strip()
    client = None
    if customer_email:
        client = db.query(models.Client).filter(models.Client.user_id == user_id, models.Client.email == customer_email).first()
        if not client:
            client = models.Client(user_id=user_id, name=customer_email.split('@')[0], email=customer_email)
            db.add(client); db.commit(); db.refresh(client)
    if not client:
        # Without a client we cannot store; push to dead letter
        raise ValueError('No client match for Stripe invoice')
    # Idempotent upsert by external_id (Stripe invoice id)
    inv = db.query(models.Invoice).filter(models.Invoice.user_id == user_id, models.Invoice.external_id == ext_id).first()
    if inv:
        inv.amount_cents = amount_cents
        inv.currency = currency
        inv.status = status
    else:
        inv = models.Invoice(user_id=user_id, client_id=client.id, amount_cents=amount_cents, currency=currency, due_date=(stripe_invoice.get('due_date') and __import__('datetime').datetime.utcfromtimestamp(due_date).date()) or __import__('datetime').date.today(), status=status, external_id=ext_id, source='stripe')
        db.add(inv)
    # paid_at mapping
    try:
        paid_ts = stripe_invoice.get('status_transitions', {}).get('paid_at')
        if paid_ts:
            inv.paid_at = __import__('datetime').datetime.utcfromtimestamp(paid_ts).replace(tzinfo=__import__('datetime').timezone.utc)
    except Exception:
        pass
    db.commit()

@app.post('/webhooks/stripe', tags=['integrations'])
def stripe_webhook(req_body: bytes = Depends(lambda: __import__('fastapi').FastAPI().request), db: Session = Depends(get_db)):
    # We cannot access the request directly from Depends shortcut above; implement properly
    from fastapi import Request
    async def handler(request: Request):
        sig = request.headers.get('stripe-signature', '')
        body = await request.body()
        try:
            if not STRIPE_WEBHOOK_SECRET:
                raise ValueError('Stripe webhook secret not configured')
            event = stripe.Webhook.construct_event(body, sig, STRIPE_WEBHOOK_SECRET)
        except Exception as e:
            db.add(models.DeadLetter(kind='webhook_stripe', payload={'raw': body.decode('utf-8','ignore')}, error=str(e)))
            db.commit()
            raise HTTPException(status_code=400, detail='Invalid signature')
        try:
            acct = event.get('account')
            stripe_acct = db.query(models.StripeAccount).filter(models.StripeAccount.stripe_account_id == acct).first() if acct else None
            if not stripe_acct:
                raise ValueError('Unknown Stripe account')
            etype = event['type']
            data_obj = event['data']['object']
            if etype in ('invoice.created', 'invoice.finalized', 'invoice.payment_succeeded', 'invoice.payment_failed'):
                _upsert_invoice_from_stripe(db, stripe_acct.user_id, data_obj)
        except Exception as e:
            db.add(models.DeadLetter(kind='webhook_stripe', payload=json.loads(body.decode('utf-8','ignore') or '{}'), error=str(e)))
            db.commit()
        metrics['webhooks_received'] += 1
        try:
            acct = event.get('account')
            stripe_acct = db.query(models.StripeAccount).filter(models.StripeAccount.stripe_account_id == acct).first() if acct else None
            if not stripe_acct:
                raise ValueError('Unknown Stripe account')
            etype = event['type']
            data_obj = event['data']['object']
            if etype in ('invoice.created', 'invoice.finalized', 'invoice.payment_succeeded', 'invoice.payment_failed'):
                # upsert is idempotent on external_id
                pre = db.query(models.Invoice).filter(models.Invoice.user_id == stripe_acct.user_id, models.Invoice.external_id == data_obj.get('id')).first()
                _upsert_invoice_from_stripe(db, stripe_acct.user_id, data_obj)
                post = db.query(models.Invoice).filter(models.Invoice.user_id == stripe_acct.user_id, models.Invoice.external_id == data_obj.get('id')).first()
                if pre is None and post is not None:
                    metrics['imports_created'] += 1
                else:
                    metrics['imports_updated'] += 1
                metrics['webhooks_processed'] += 1
        except Exception as e:
            db.add(models.DeadLetter(kind='webhook_stripe', payload=json.loads(body.decode('utf-8','ignore') or '{}'), error=str(e)))
            db.commit()
            logger.error(json.dumps({'event': 'webhook_error', 'error': str(e)}))
        return _envelope({'received': True})
    return handler  # FastAPI will treat this as a route callable

@app.post('/integrations/stripe/payment_link', tags=['integrations'])
def create_payment_link(invoice_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=400, detail='Stripe not configured')
    inv = db.query(models.Invoice).filter(models.Invoice.id == invoice_id, models.Invoice.user_id == user.id).first()
    if not inv:
        raise HTTPException(status_code=404, detail='Invoice not found')
    if inv.status == models.InvoiceStatus.paid:
        raise HTTPException(status_code=400, detail='Invoice already paid')
    acct = _get_user_stripe_acct(db, user.id)
    if not acct:
        raise HTTPException(status_code=400, detail='Connect your Stripe account first')
    # If link already exists, return it (idempotent)
    if inv.payment_link_url:
        return _envelope({'payment_link_url': inv.payment_link_url})
    # Only allow for manual invoices
    if inv.source != models.Invoice.InvoiceSource.manual:
        raise HTTPException(status_code=400, detail='Payment link only for manual invoices')
    try:
        # Create a one-off product + price, then a payment link on the connected account
        idem_prefix = f"invoice:{inv.id}"
        product = stripe.Product.create(
            name=f'DueSpark Invoice #{inv.id}',
            stripe_account=acct.stripe_account_id,
            idempotency_key=f"{idem_prefix}:product"
        )
        price = stripe.Price.create(
            unit_amount=inv.amount_cents,
            currency=inv.currency.lower(),
            product=product['id'],
            stripe_account=acct.stripe_account_id,
            idempotency_key=f"{idem_prefix}:price"
        )
        plink = stripe.PaymentLink.create(
            line_items=[{'price': price['id'], 'quantity': 1}],
            stripe_account=acct.stripe_account_id,
            idempotency_key=f"{idem_prefix}:plink"
        )
        inv.payment_link_url = plink['url']
        db.commit(); db.refresh(inv)
        return _envelope({'payment_link_url': inv.payment_link_url})
    except Exception as e:
        raise HTTPException(status_code=400, detail=f'Failed to create payment link: {e}')

# Retry/backoff worker for dead letters
BACKOFF_SCHEDULE = [60, 300, 900, 3600]  # seconds

def _retry_dead_letter(db: SessionLocal, dl: models.DeadLetter):
    kind = dl.kind
    payload = dl.payload or {}
    if kind in ('webhook_stripe', 'stripe.import'):
        try:
            acct_id = payload.get('account') or payload.get('account_id')
            stripe_acct = db.query(models.StripeAccount).filter(models.StripeAccount.stripe_account_id == acct_id).first() if acct_id else None
            # For import payloads, try to upsert invoice directly
            data_obj = payload.get('data', {}).get('object') or payload
            if not stripe_acct:
                raise ValueError('Unknown Stripe account during retry')
            _upsert_invoice_from_stripe(db, stripe_acct.user_id, data_obj)
            # Success: delete dead letter
            db.delete(dl); db.commit()
            return True
        except Exception as e:
            dl.retries = (dl.retries or 0) + 1
            # schedule next attempt
            from datetime import datetime, timezone, timedelta
            delay = BACKOFF_SCHEDULE[min(dl.retries-1, len(BACKOFF_SCHEDULE)-1)]
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
            due_items = db.query(models.DeadLetter).filter(
                (models.DeadLetter.next_attempt_at == None) | (models.DeadLetter.next_attempt_at <= datetime.now(timezone.utc))
            ).limit(10).all()
            for dl in due_items:
                _retry_dead_letter(db, dl)
            db.close()
        except Exception as e:
            logger.error(json.dumps({'event':'dlq_worker_error','error':str(e)}))
        await asyncio.sleep(30)

# Startup is handled by lifespan handler above

@app.post('/integrations/stripe/disconnect', tags=['integrations'])
def stripe_disconnect(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    acct = _get_user_stripe_acct(db, user.id)
    if not acct:
        return _envelope({'disconnected': True})
    # Attempt deauthorization (optional in test mode)
    try:
        stripe.OAuth.deauthorize(client_id=STRIPE_CLIENT_ID, stripe_user_id=acct.stripe_account_id)
    except Exception:
        pass
    from datetime import datetime, timezone
    acct.revoked_at = datetime.now(timezone.utc)
    db.commit(); db.refresh(acct)
    return _envelope({'disconnected': True})

@app.post('/integrations/stripe/import-invoices', tags=['integrations'])
def stripe_import_invoices(since: str | None = None, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    acct = _get_user_stripe_acct(db, user.id)
    if not acct:
        raise HTTPException(status_code=400, detail='Connect your Stripe account first')
    # Parse since as ISO date/time
    created_filter = None
    if since:
        try:
            from datetime import datetime, timezone
            dt = datetime.fromisoformat(since.replace('Z','+00:00'))
            created_filter = { 'gte': int(dt.timestamp()) }
        except Exception:
            raise HTTPException(status_code=400, detail='Invalid since format; use ISO 8601')
    try:
        params = {}
        if created_filter:
            params['created'] = created_filter
        # Paginate over Stripe invoices for connected account
        starting_after = None
        imported = 0
        while True:
            page = stripe.Invoice.list(limit=50, starting_after=starting_after, stripe_account=acct.stripe_account_id, **params)
            data = page.get('data', [])
            if not data:
                break
            for inv in data:
                try:
                    _upsert_invoice_from_stripe(db, user.id, inv)
                    imported += 1
                except Exception as e:
                    db.add(models.DeadLetter(kind='stripe.import', payload=inv, error=str(e)))
                    db.commit()
            if page.get('has_more'):
                starting_after = data[-1]['id']
            else:
                break
        return _envelope({'imported': imported})
    except Exception as e:
        raise HTTPException(status_code=400, detail=f'Import failed: {e}')

# ---- Admin: Dead Letters ----
@app.get('/admin/dead_letters', tags=['admin'])
def list_dead_letters(limit: int = 50, offset: int = 0, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    # Enforce admin role
    if getattr(user, 'role', None) != getattr(models.UserRole, 'admin', None):
        raise HTTPException(status_code=403, detail='Forbidden')
    q = db.query(models.DeadLetter).order_by(models.DeadLetter.created_at.desc())
    total = q.count(); items = q.offset(offset).limit(limit).all()
    return _envelope([schemas.DeadLetterOut.model_validate(d).model_dump() for d in items], {"limit": limit, "offset": offset, "total": total})

@app.post('/admin/dead_letters/{dl_id}/retry', tags=['admin'])
def retry_dead_letter(dl_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    if getattr(user, 'role', None) != getattr(models.UserRole, 'admin', None):
        raise HTTPException(status_code=403, detail='Forbidden')
    dl = db.query(models.DeadLetter).filter(models.DeadLetter.id == dl_id).first()
    if not dl:
        raise HTTPException(status_code=404, detail='Not found')
    dl.retries = (dl.retries or 0) + 1
    dl.next_attempt_at = datetime.now(timezone.utc) + timedelta(minutes=5)
    db.commit(); db.refresh(dl)
    return _envelope({"id": dl.id, "retries": dl.retries})

@app.delete('/admin/dead_letters/{dl_id}', tags=['admin'])
def delete_dead_letter(dl_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    if getattr(user, 'role', None) != getattr(models.UserRole, 'admin', None):
        raise HTTPException(status_code=403, detail='Forbidden')
    dl = db.query(models.DeadLetter).filter(models.DeadLetter.id == dl_id).first()
    if not dl:
        raise HTTPException(status_code=404, detail='Not found')
    db.delete(dl); db.commit()
    return _envelope({"id": dl_id})

# ---- Admin: Requeue Failed Reminders ----
@app.post('/admin/reminders/requeue-failed', tags=['admin'])
def requeue_failed_reminders(limit: int = 50, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    if getattr(user, 'role', None) != getattr(models.UserRole, 'admin', None):
        raise HTTPException(status_code=403, detail='Forbidden')
    q = db.query(models.Reminder).filter(models.Reminder.status == models.ReminderStatus.failed).order_by(models.Reminder.updated_at.asc())
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

# ---- Admin: Scheduler Controls ----
class RequeueRequest(schemas.BaseModel):
    dlq_id: int

@app.post('/admin/scheduler/requeue', tags=['admin'])
def admin_requeue_scheduler(payload: dict, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    if getattr(user, 'role', None) != getattr(models.UserRole, 'admin', None):
        raise HTTPException(status_code=403, detail='Forbidden')
    dl_id = int(payload.get('dlq_id', 0))
    dl = db.query(models.DeadLetter).filter(models.DeadLetter.id == dl_id).first()
    if not dl:
        raise HTTPException(status_code=404, detail='DLQ not found')
    kind = dl.kind or ''
    try:
        if kind.startswith('reminder.send'):
            rid = (dl.payload or {}).get('reminder_id')
            if not rid:
                raise ValueError('Missing reminder_id')
            # Re-schedule immediate retry by resetting status and send_at
            r = db.query(models.Reminder).filter(models.Reminder.id == int(rid)).first()
            if not r:
                raise ValueError('Reminder not found')
            r.status = models.ReminderStatus.scheduled
            from datetime import datetime, timezone, timedelta
            r.send_at = datetime.now(timezone.utc) + timedelta(minutes=1)
            db.commit()
        elif kind.startswith('adaptive.compute'):
            # Trigger adaptive compute now (for the whole tenant if client_id unknown)
            from app.scheduler import job_compute_adaptive_schedules
            job_compute_adaptive_schedules()
        else:
            raise ValueError('Unsupported DLQ kind')
        # On success, delete DLQ entry
        db.delete(dl); db.commit()
        return _envelope({"requeued": True})
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Requeue failed: {e}")

@app.post('/admin/scheduler/run-adaptive', tags=['admin'])
def admin_run_adaptive(payload: dict | None = None, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    if getattr(user, 'role', None) != getattr(models.UserRole, 'admin', None):
        raise HTTPException(status_code=403, detail='Forbidden')
    # For MVP, run global adaptive. Optionally filter by user_id in future.
    from app.scheduler import job_compute_adaptive_schedules
    job_compute_adaptive_schedules()
    return _envelope({"triggered": True})
