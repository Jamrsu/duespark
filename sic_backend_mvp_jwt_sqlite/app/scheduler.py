from __future__ import annotations

import logging
from datetime import datetime, timedelta, time, timezone
from typing import Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app import models
from app.email_provider import get_email_provider
from app.email_templates import render_markdown_template
import os
try:
    import redis as _redis
except Exception:  # pragma: no cover
    _redis = None

logger = logging.getLogger("duespark.scheduler")

# Config knobs
_REDIS_URL = os.getenv('REDIS_URL') or os.getenv('CELERY_BROKER_URL')
_BATCH_SIZE = int(os.getenv('SCHEDULER_BATCH_SIZE', '200'))
_LOOKAHEAD_MIN = int(os.getenv('SCHEDULER_LOOKAHEAD_MIN', '5'))

_redis_client = None
if _REDIS_URL and _redis:
    try:
        _redis_client = _redis.from_url(_REDIS_URL)
    except Exception as _e:  # pragma: no cover
        logger.warning({"event": "redis_connect_failed", "error": str(_e)})
        _redis_client = None


def _pg_try_advisory_lock(db: Session, key: int) -> bool:
    try:
        res = db.execute(text("SELECT pg_try_advisory_lock(:k)"), {"k": key}).scalar()
        return bool(res)
    except Exception:
        # If DB doesn't support advisory locks (e.g., SQLite), fall back to optimistic updates
        return True


def _rds_try_lock(name: str, ttl: int = 300) -> bool:
    if not _redis_client:
        return True
    try:
        return bool(_redis_client.set(name, 1, nx=True, ex=ttl))
    except Exception:  # pragma: no cover
        return True


def _key_for_reminder(reminder_id: int) -> int:
    # 64-bit key space; namespace 0xA11CE00000000000 | reminder_id
    return (0xA11CE00000000000 >> 32) ^ int(reminder_id)


def _localize_9am_utc(date_utc: datetime, tz_name: str) -> datetime:
    from zoneinfo import ZoneInfo
    # Take the date component in the client's timezone and set to 09:00 local, then return UTC
    tz = None
    try:
        tz = ZoneInfo(tz_name)
    except Exception:
        try:
            logger.warning({"event": "invalid_timezone", "tz": tz_name})
        except Exception:
            pass
        tz = ZoneInfo("UTC")
    # use date from date_utc converted to client tz
    local_date = date_utc.astimezone(tz).date()
    local_dt = datetime.combine(local_date, time(9, 0, tzinfo=tz))
    return local_dt.astimezone(timezone.utc)


def _send_due_reminder(db: Session, r: models.Reminder) -> Optional[str]:
    # Lock per reminder id
    key = _key_for_reminder(r.id)
    if not _pg_try_advisory_lock(db, key):
        return None

    # Optional Redis processing lock to prevent double send
    if not _rds_try_lock(f"reminder:{r.id}:processing", ttl=300):
        return None

    inv = db.query(models.Invoice).filter(models.Invoice.id == r.invoice_id).first()
    if not inv:
        return None
    client = db.query(models.Client).filter(models.Client.id == inv.client_id).first()
    if not client:
        return None
    # If already sent, skip
    if r.status == models.ReminderStatus.sent:
        return None

    # Choose template
    subject = r.subject
    body_md = r.body
    if not subject or not body_md:
        subject = "Quick nudge about invoice {{invoice_number}}"
        body_md = (
            "Hi {{client_name}},\n\n"
            "Hope you're well! This is a friendly reminder about invoice {{invoice_number}} for **{{amount_formatted}}** due {{due_date_iso}}.\n\n"
            "If you've already paid, thank you! Otherwise, you can use this link: {{pay_link}}\n\n"
            "Best,\n{{from_name}}"
        )

    ctx = {
        "invoice_id": inv.id,
        "invoice_number": inv.id,
        "client_name": client.name or "",
        "due_date_iso": inv.due_date.isoformat(),
        "amount_formatted": f"{inv.amount_cents/100:.2f} {inv.currency}",
        "pay_link": inv.payment_link_url or "",
        "from_name": "DueSpark",
        "due_date": inv.due_date.isoformat(),
        "amount": f"{inv.amount_cents/100:.2f}",
        "currency": inv.currency,
        "tone": "friendly",
    }

    from time import perf_counter
    t0 = perf_counter()
    subj, text_rendered, body_html = render_markdown_template(subject, body_md, ctx)
    provider = get_email_provider()
    resp = provider.send(
        to_email=client.email,
        subject=subj,
        html=body_html,
        text=text_rendered,
        headers={"X-App-Reminder-Id": str(r.id)},
    )
    r.status = models.ReminderStatus.sent
    r.subject = subj
    r.body = text_rendered
    meta = r.meta or {}
    meta.update({"message_id": resp.get("message_id"), "provider": resp.get("provider", "postmark")})
    r.meta = meta
    r.sent_at = datetime.now(timezone.utc)
    db.commit(); db.refresh(r)
    try:
        from app.main import SCHEDULER_REMINDERS_SENT_TOTAL, EMAIL_SEND_DURATION_SECONDS
        SCHEDULER_REMINDERS_SENT_TOTAL.inc()
        EMAIL_SEND_DURATION_SECONDS.observe(perf_counter() - t0)
    except Exception:
        pass
    return meta.get("message_id")


def job_enqueue_due_reminders():
    try:
        from app.main import PROM_SCHEDULER_RUNS, PROM_SCHEDULER_ERRORS, PROM_REMINDERS_SENT
        PROM_SCHEDULER_RUNS.labels(job="enqueue_due_reminders").inc()
    except Exception:
        PROM_SCHEDULER_RUNS = PROM_SCHEDULER_ERRORS = PROM_REMINDERS_SENT = None  # type: ignore
    db = SessionLocal()
    try:
        from app.main import SCHEDULER_REMINDERS_ENQUEUED_TOTAL, SCHEDULER_REMINDERS_FAILED_TOTAL, DLQ_ITEMS_TOTAL
        while True:
            now = datetime.now(timezone.utc)
            items = (
                db.query(models.Reminder)
                .filter(models.Reminder.status == models.ReminderStatus.scheduled)
                .filter(models.Reminder.send_at <= now)
                .order_by(models.Reminder.send_at.asc())
                .limit(_BATCH_SIZE)
                .all()
            )
            if not items:
                break
            for r in items:
                try:
                    # Optional enqueue de-dupe lock
                    if not _rds_try_lock(f"reminder:{r.id}:locked", ttl=300):
                        continue
                    try:
                        SCHEDULER_REMINDERS_ENQUEUED_TOTAL.inc()
                    except Exception:
                        pass
                    msg = _send_due_reminder(db, r)
                    if msg and 'PROM_REMINDERS_SENT' in globals():
                        try:
                            from app.main import PROM_REMINDERS_SENT as _P
                            _P.inc()
                        except Exception:
                            pass
                except Exception as e:
                    logger.error({"event": "scheduler_send_error", "id": r.id, "error": str(e)})
                    r.status = models.ReminderStatus.failed
                    meta = r.meta or {}
                    meta.update({"error": str(e)})
                    r.meta = meta
                    db.commit()
                    try:
                        SCHEDULER_REMINDERS_FAILED_TOTAL.inc()
                    except Exception:
                        pass
                    try:
                        db.add(models.DeadLetter(kind='reminder.send', payload={'reminder_id': r.id}, error=str(e)))
                        db.commit()
                        DLQ_ITEMS_TOTAL.labels(topic='reminder.send').inc()
                    except Exception:
                        pass
    finally:
        db.close()


def job_compute_adaptive_schedules():
    try:
        from app.main import PROM_SCHEDULER_RUNS, PROM_SCHEDULER_ERRORS, PROM_REMINDERS_SCHEDULED, SCHEDULER_ADAPTIVE_RUNS_TOTAL, SCHEDULE_COMPUTE_DURATION_SECONDS
        PROM_SCHEDULER_RUNS.labels(job="compute_adaptive_schedules").inc()
        SCHEDULER_ADAPTIVE_RUNS_TOTAL.inc()
    except Exception:
        PROM_SCHEDULER_RUNS = PROM_SCHEDULER_ERRORS = PROM_REMINDERS_SCHEDULED = SCHEDULER_ADAPTIVE_RUNS_TOTAL = SCHEDULE_COMPUTE_DURATION_SECONDS = None  # type: ignore
    db = SessionLocal()
    try:
        from time import perf_counter
        t0 = perf_counter()
        now_utc = datetime.now(timezone.utc)
        clients = db.query(models.Client).all()
        for c in clients:
            try:
                invs = (
                    db.query(models.Invoice)
                    .filter(models.Invoice.client_id == c.id)
                    .all()
                )
                # Compute avg lateness in days for paid invoices
                diffs: list[int] = []
                paid_counts: dict[tuple[str,int], int] = {}
                for inv in invs:
                    if inv.paid_at is not None and inv.due_date is not None:
                        late_days = (inv.paid_at.date() - inv.due_date).days
                        diffs.append(late_days)
                        # Modal weekday/hour in client tz
                        try:
                            from zoneinfo import ZoneInfo
                            tz = ZoneInfo(c.timezone or 'UTC')
                        except Exception:
                            try:
                                logger.warning({"event": "invalid_timezone", "tz": c.timezone})
                            except Exception:
                                pass
                            tz = ZoneInfo('UTC')
                        local_dt = inv.paid_at.astimezone(tz)
                        key = (local_dt.strftime('%a'), local_dt.hour)
                        paid_counts[key] = paid_counts.get(key, 0) + 1
                avg_late = sum(diffs) / len(diffs) if diffs else 0.0
                # Clamp range
                if avg_late < -1:
                    avg_late = -1
                if avg_late > 30:
                    avg_late = 30
                # Preferred hour and Friday alignment flag
                modal_hour = 9
                modal_is_friday = False
                if paid_counts:
                    (dow, hour), _ = sorted(paid_counts.items(), key=lambda kv: kv[1], reverse=True)[0]
                    modal_hour = int(hour)
                    modal_is_friday = str(dow).lower().startswith('fri')

                # For pending/draft invoices with no future scheduled reminders, schedule one
                for inv in invs:
                    if inv.status not in (models.InvoiceStatus.pending, models.InvoiceStatus.draft):
                        continue
                    future = (
                        db.query(models.Reminder)
                        .filter(models.Reminder.invoice_id == inv.id)
                        .filter(models.Reminder.status == models.ReminderStatus.scheduled)
                        .filter(models.Reminder.send_at > now_utc)
                        .first()
                    )
                    if future:
                        continue
                    # Build schedule days: pre-due -2; overdue 1,3,7; +10 if avg_late>7
                    schedule_days: list[int] = []
                    if inv.due_date >= now_utc.date():
                        schedule_days.append(-2)
                    else:
                        schedule_days.extend([1,3,7])
                        if avg_late > 7:
                            schedule_days.append(10)
                    created = 0
                    for d in schedule_days:
                        base = datetime.combine(inv.due_date, time(0,0), tzinfo=timezone.utc)
                        target = base + timedelta(days=d)
                        # Compute local date/time
                        from zoneinfo import ZoneInfo
                        try:
                            tz = ZoneInfo(c.timezone or 'UTC')
                        except Exception:
                            try:
                                logger.warning({"event": "invalid_timezone", "tz": c.timezone})
                            except Exception:
                                pass
                            tz = ZoneInfo('UTC')
                        local_dt = target.astimezone(tz)
                        # Align to Friday for overdue windows if Friday is modal
                        if modal_is_friday and d >= 1:
                            while local_dt.strftime('%a').lower() != 'fri':
                                local_dt = (local_dt + timedelta(days=1))
                        local_dt = datetime.combine(local_dt.date(), time(modal_hour,0), tzinfo=tz)
                        send_at_utc = local_dt.astimezone(timezone.utc)
                        if send_at_utc < now_utc:
                            send_at_utc = now_utc + timedelta(minutes=_LOOKAHEAD_MIN)
                        # Upsert by (invoice_id, send_at, channel)
                        exists = (
                            db.query(models.Reminder)
                            .filter(models.Reminder.invoice_id == inv.id)
                            .filter(models.Reminder.channel == models.Channel.email)
                            .filter(models.Reminder.send_at == send_at_utc)
                            .first()
                        )
                        if exists:
                            continue
                        rem = models.Reminder(
                            invoice_id=inv.id,
                            send_at=send_at_utc,
                            channel=models.Channel.email,
                            status=models.ReminderStatus.scheduled,
                        )
                        db.add(rem)
                        db.commit(); db.refresh(rem)
                        created += 1
                    if created:
                        try:
                            from app.main import PROM_REMINDERS_SCHEDULED as _S
                            _S.inc(created)
                        except Exception:
                            pass
            except Exception as e:
                logger.error({"event": "adaptive_error", "client_id": c.id, "error": str(e)})
                try:
                    from app.main import DLQ_ITEMS_TOTAL
                    db.add(models.DeadLetter(kind='adaptive.compute', payload={'client_id': c.id}, error=str(e)))
                    db.commit()
                    DLQ_ITEMS_TOTAL.labels(topic='adaptive.compute').inc()
                except Exception:
                    pass
        try:
            if SCHEDULE_COMPUTE_DURATION_SECONDS:
                SCHEDULE_COMPUTE_DURATION_SECONDS.observe(perf_counter() - t0)
        except Exception:
            pass
    finally:
        db.close()


def init_scheduler(scheduler: Optional[AsyncIOScheduler] = None) -> AsyncIOScheduler:
    sched = scheduler or AsyncIOScheduler(timezone="UTC")
    # Every minute: enqueue and send due reminders
    sched.add_job(job_enqueue_due_reminders, IntervalTrigger(minutes=1), id="enqueue_due_reminders", replace_existing=True)
    # Nightly at 02:00 UTC: compute adaptive schedules
    sched.add_job(job_compute_adaptive_schedules, CronTrigger(hour=2, minute=0), id="compute_adaptive_schedules", replace_existing=True)
    return sched
