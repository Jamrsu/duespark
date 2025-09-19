from __future__ import annotations

import logging
import os
from contextlib import suppress
from datetime import datetime, time, timedelta, timezone
from typing import Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy import text
from sqlalchemy.orm import Session

from app import models
from app.database import SessionLocal
from app.email_provider import get_email_provider
from app.email_templates import render_markdown_template

try:
    import redis as _redis
except Exception:  # pragma: no cover
    _redis = None

logger = logging.getLogger("duespark.scheduler")

# Config knobs
_REDIS_URL = os.getenv("REDIS_URL") or os.getenv("CELERY_BROKER_URL")
_BATCH_SIZE = int(os.getenv("SCHEDULER_BATCH_SIZE", "200"))
_LOOKAHEAD_MIN = int(os.getenv("SCHEDULER_LOOKAHEAD_MIN", "5"))
_ADAPTIVE_N_DAYS = int(os.getenv("ADAPTIVE_N_DAYS", "180"))
_ADAPTIVE_ENABLE = os.getenv("ADAPTIVE_ENABLE", "true").lower() not in (
    "0",
    "false",
    "no",
)
_ADAPTIVE_LEADER_ONLY = os.getenv("ADAPTIVE_LEADER_ONLY", "true").lower() not in (
    "0",
    "false",
    "no",
)
_OUTBOX_ENABLED = os.getenv("OUTBOX_ENABLED", "false").lower() in ("1", "true", "yes")
_OUTBOX_BATCH_SIZE = int(os.getenv("OUTBOX_BATCH_SIZE", "200"))
_SENDER_MAX_PER_MIN_PER_USER = int(os.getenv("SENDER_MAX_PER_MIN_PER_USER", "1000"))
_SENDER_RATE_WINDOW_SEC = int(os.getenv("SENDER_RATE_WINDOW_SEC", "60"))
_SCHEDULER_MAX_LOOPS = int(os.getenv("SCHEDULER_MAX_LOOPS", "5"))
_SCHEDULER_RECENT_SECONDS = int(os.getenv("SCHEDULER_RECENT_SECONDS", "0"))

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
    try:
        tz = ZoneInfo(tz_name)
    except Exception as exc:
        logger.warning("invalid_timezone tz=%s error=%s", tz_name, exc)
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
    headers = {"X-App-Reminder-Id": str(r.id), "X-Idempotency-Key": f"reminder:{r.id}"}
    if _OUTBOX_ENABLED:
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
        # Nudge reminder's next attempt into the near future to avoid re-enqueue in the same loop
        r.send_at = datetime.now(timezone.utc) + timedelta(minutes=_LOOKAHEAD_MIN)
        db.commit()
        db.refresh(r)
        # Defer status change to dispatcher
        return str(ob.id)
    provider = get_email_provider()
    resp = provider.send(
        to_email=client.email,
        subject=subj,
        html=body_html,
        text=text_rendered,
        headers=headers,
    )
    r.status = models.ReminderStatus.sent
    r.subject = subj
    r.body = text_rendered
    meta = r.meta or {}
    meta.update(
        {
            "message_id": resp.get("message_id"),
            "provider": resp.get("provider", "postmark"),
            "idempotency_key": f"reminder:{r.id}",
        }
    )
    r.meta = meta
    r.sent_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(r)
    try:
        from app.main import EMAIL_SEND_DURATION_SECONDS, SCHEDULER_REMINDERS_SENT_TOTAL
    except (ImportError, AttributeError) as exc:
        logger.debug("Reminder send counters unavailable: %s", exc)
    else:
        with suppress(Exception):
            SCHEDULER_REMINDERS_SENT_TOTAL.inc()
        with suppress(Exception):
            EMAIL_SEND_DURATION_SECONDS.observe(perf_counter() - t0)
    return meta.get("message_id")


def job_enqueue_due_reminders():
    try:
        from app.main import (
            PROM_REMINDERS_SENT,
            PROM_SCHEDULER_ERRORS,
            PROM_SCHEDULER_RUNS,
        )
    except (ImportError, AttributeError) as exc:
        logger.warning("Prometheus counters unavailable for enqueue job: %s", exc)
        PROM_REMINDERS_SENT = PROM_SCHEDULER_ERRORS = PROM_SCHEDULER_RUNS = None  # type: ignore
    else:
        with suppress(Exception):
            PROM_SCHEDULER_RUNS.labels(job="enqueue_due_reminders").inc()
    db = SessionLocal()
    try:
        try:
            from app.main import (
                DLQ_ITEMS_TOTAL,
                SCHEDULER_REMINDERS_ENQUEUED_TOTAL,
                SCHEDULER_REMINDERS_FAILED_TOTAL,
            )
        except (ImportError, AttributeError) as exc:
            logger.warning("Scheduler reminder counters unavailable: %s", exc)
            DLQ_ITEMS_TOTAL = (
                SCHEDULER_REMINDERS_ENQUEUED_TOTAL
            ) = SCHEDULER_REMINDERS_FAILED_TOTAL = None  # type: ignore

        loops = 0
        while True:
            now = datetime.now(timezone.utc)
            recent_cut = None
            if _SCHEDULER_RECENT_SECONDS > 0:
                recent_cut = now - timedelta(seconds=_SCHEDULER_RECENT_SECONDS)
            items = (
                db.query(models.Reminder)
                .filter(models.Reminder.status == models.ReminderStatus.scheduled)
                .filter(models.Reminder.send_at <= now)
            )
            if recent_cut is not None:
                items = items.filter(models.Reminder.created_at >= recent_cut)
            items = (
                items.order_by(models.Reminder.send_at.asc()).limit(_BATCH_SIZE).all()
            )
            if not items:
                break
            for r in items:
                try:
                    # Optional enqueue de-dupe lock
                    if not _rds_try_lock(f"reminder:{r.id}:locked", ttl=300):
                        continue
                    if SCHEDULER_REMINDERS_ENQUEUED_TOTAL:
                        with suppress(Exception):
                            SCHEDULER_REMINDERS_ENQUEUED_TOTAL.inc()
                    msg = _send_due_reminder(db, r)
                    if msg and "PROM_REMINDERS_SENT" in globals():
                        with suppress(Exception):
                            from app.main import PROM_REMINDERS_SENT as _P

                            _P.inc()
                except Exception as e:
                    logger.error(
                        {"event": "scheduler_send_error", "id": r.id, "error": str(e)}
                    )
                    r.status = models.ReminderStatus.failed
                    meta = r.meta or {}
                    meta.update({"error": str(e)})
                    r.meta = meta
                    db.commit()
                    if SCHEDULER_REMINDERS_FAILED_TOTAL:
                        with suppress(Exception):
                            SCHEDULER_REMINDERS_FAILED_TOTAL.inc()
                    try:
                        db.add(
                            models.DeadLetter(
                                kind="reminder.send",
                                payload={"reminder_id": r.id},
                                error=str(e),
                            )
                        )
                        db.commit()
                    except Exception as dlq_exc:
                        logger.error(
                            "Failed to enqueue reminder send dead letter id=%s error=%s",
                            r.id,
                            dlq_exc,
                            exc_info=True,
                        )
                        db.rollback()
                    else:
                        if DLQ_ITEMS_TOTAL:
                            with suppress(Exception):
                                DLQ_ITEMS_TOTAL.labels(topic="reminder.send").inc()
            loops += 1
            if loops >= _SCHEDULER_MAX_LOOPS:
                break
    finally:
        db.close()


def job_compute_adaptive_schedules():
    # Allow disabling adaptive via env
    if not _ADAPTIVE_ENABLE:
        logger.info({"event": "adaptive_disabled"})
        return
    # Leader-only execution if configured and Redis available
    if _ADAPTIVE_LEADER_ONLY and _redis_client is not None:
        try:
            k = f"scheduler:adaptive:lock:{datetime.now(timezone.utc).date().isoformat()}"
            got = bool(_redis_client.set(k, 1, nx=True, ex=600))
            if not got:
                logger.info({"event": "adaptive_leader_skipped", "key": k})
                return
            else:
                logger.info({"event": "adaptive_leader_acquired", "key": k})
        except Exception as exc:
            # If Redis is unavailable, proceed rather than failing the job
            logger.warning({"event": "adaptive_leader_redis_error", "error": str(exc)})
    elif _ADAPTIVE_LEADER_ONLY and _redis_client is None:
        logger.info({"event": "adaptive_leader_no_redis"})
    try:
        from app.main import (
            PROM_REMINDERS_SCHEDULED,
            PROM_SCHEDULER_ERRORS,
            PROM_SCHEDULER_RUNS,
            SCHEDULE_COMPUTE_DURATION_SECONDS,
            SCHEDULER_ADAPTIVE_RUNS_TOTAL,
        )
    except (ImportError, AttributeError) as exc:
        logger.warning("Prometheus counters unavailable for adaptive scheduler: %s", exc)
        PROM_SCHEDULER_RUNS = (
            PROM_SCHEDULER_ERRORS
        ) = PROM_REMINDERS_SCHEDULED = SCHEDULER_ADAPTIVE_RUNS_TOTAL = SCHEDULE_COMPUTE_DURATION_SECONDS = None  # type: ignore
    else:
        with suppress(Exception):
            PROM_SCHEDULER_RUNS.labels(job="compute_adaptive_schedules").inc()
        with suppress(Exception):
            SCHEDULER_ADAPTIVE_RUNS_TOTAL.inc()
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
                paid_counts: dict[tuple[str, int], int] = {}
                for inv in invs:
                    if inv.paid_at is not None and inv.due_date is not None:
                        # Bound historical window for adaptive statistics if configured
                        if _ADAPTIVE_N_DAYS > 0:
                            cutoff = now_utc - timedelta(days=_ADAPTIVE_N_DAYS)
                            # Ensure timezone-aware comparison
                            paid_at_aware = inv.paid_at
                            if paid_at_aware.tzinfo is None:
                                paid_at_aware = paid_at_aware.replace(
                                    tzinfo=timezone.utc
                                )
                            if paid_at_aware < cutoff:
                                continue
                        late_days = (inv.paid_at.date() - inv.due_date).days
                        diffs.append(late_days)
                        # Modal weekday/hour in client tz
                        from zoneinfo import ZoneInfo

                        try:
                            tz = ZoneInfo(c.timezone or "UTC")
                        except Exception as exc:
                            logger.warning(
                                {"event": "invalid_timezone", "tz": c.timezone, "error": str(exc)}
                            )
                            tz = ZoneInfo("UTC")
                        # Ensure timezone-aware for astimezone
                        paid_at_for_tz = inv.paid_at
                        if paid_at_for_tz.tzinfo is None:
                            paid_at_for_tz = paid_at_for_tz.replace(tzinfo=timezone.utc)
                        local_dt = paid_at_for_tz.astimezone(tz)
                        key = (local_dt.strftime("%a"), local_dt.hour)
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
                    (dow, hour), _ = sorted(
                        paid_counts.items(), key=lambda kv: kv[1], reverse=True
                    )[0]
                    modal_hour = int(hour)
                    modal_is_friday = str(dow).lower().startswith("fri")

                # For pending/draft invoices with no future scheduled reminders, schedule one
                for inv in invs:
                    if inv.status not in (
                        models.InvoiceStatus.pending,
                        models.InvoiceStatus.draft,
                    ):
                        continue
                    future = (
                        db.query(models.Reminder)
                        .filter(models.Reminder.invoice_id == inv.id)
                        .filter(
                            models.Reminder.status == models.ReminderStatus.scheduled
                        )
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
                        schedule_days.extend([1, 3, 7])
                        if avg_late > 7:
                            schedule_days.append(10)
                    created = 0
                    for d in schedule_days:
                        base = datetime.combine(
                            inv.due_date, time(0, 0), tzinfo=timezone.utc
                        )
                        target = base + timedelta(days=d)
                        # Compute local date/time
                        from zoneinfo import ZoneInfo

                        try:
                            tz = ZoneInfo(c.timezone or "UTC")
                        except Exception as exc:
                            logger.warning(
                                {"event": "invalid_timezone", "tz": c.timezone, "error": str(exc)}
                            )
                            tz = ZoneInfo("UTC")
                        local_dt = target.astimezone(tz)
                        # Align to Friday for overdue windows if Friday is modal
                        if modal_is_friday and d >= 1:
                            while local_dt.strftime("%a").lower() != "fri":
                                local_dt = local_dt + timedelta(days=1)
                        local_dt = datetime.combine(
                            local_dt.date(), time(modal_hour, 0), tzinfo=tz
                        )
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
                        db.commit()
                        db.refresh(rem)
                        created += 1
                    if created:
                        with suppress(Exception):
                            from app.main import PROM_REMINDERS_SCHEDULED as _S

                            _S.inc(created)
            except Exception as e:
                logger.error(
                    {"event": "adaptive_error", "client_id": c.id, "error": str(e)}
                )
                try:
                    from app.main import DLQ_ITEMS_TOTAL

                    db.add(
                        models.DeadLetter(
                            kind="adaptive.compute",
                            payload={"client_id": c.id},
                            error=str(e),
                        )
                    )
                    db.commit()
                except Exception as dlq_exc:
                    logger.error(
                        "Failed to enqueue adaptive compute dead letter client_id=%s error=%s",
                        c.id,
                        dlq_exc,
                        exc_info=True,
                    )
                    db.rollback()
                else:
                    with suppress(Exception):
                        DLQ_ITEMS_TOTAL.labels(topic="adaptive.compute").inc()
        if SCHEDULE_COMPUTE_DURATION_SECONDS:
            with suppress(Exception):
                SCHEDULE_COMPUTE_DURATION_SECONDS.observe(perf_counter() - t0)
    finally:
        db.close()


def init_scheduler(scheduler: Optional[AsyncIOScheduler] = None) -> AsyncIOScheduler:
    sched = scheduler or AsyncIOScheduler(timezone="UTC")
    # Every minute: enqueue and send due reminders
    sched.add_job(
        job_enqueue_due_reminders,
        IntervalTrigger(minutes=1),
        id="enqueue_due_reminders",
        replace_existing=True,
    )
    # Nightly at 02:00 UTC: compute adaptive schedules
    sched.add_job(
        job_compute_adaptive_schedules,
        CronTrigger(hour=2, minute=0),
        id="compute_adaptive_schedules",
        replace_existing=True,
    )
    # Outbox dispatcher
    sched.add_job(
        job_outbox_dispatcher,
        IntervalTrigger(minutes=1),
        id="outbox_dispatch",
        replace_existing=True,
    )
    # Referral reward processor (daily at 06:00 UTC)
    sched.add_job(
        job_process_referral_rewards,
        CronTrigger(hour=6, minute=0),
        id="process_referral_rewards",
        replace_existing=True,
    )
    return sched


def job_outbox_dispatcher():
    if not _OUTBOX_ENABLED:
        return
    db = SessionLocal()
    try:
        try:
            from app.main import (
                EMAIL_PROVIDER_ERRORS_TOTAL,
                EMAIL_SENDS_ATTEMPTED_TOTAL,
                EMAIL_SENDS_RATE_LIMITED_TOTAL,
            )
        except (ImportError, AttributeError) as exc:
            logger.debug("Outbox counters unavailable: %s", exc)
            EMAIL_PROVIDER_ERRORS_TOTAL = (
                EMAIL_SENDS_ATTEMPTED_TOTAL
            ) = EMAIL_SENDS_RATE_LIMITED_TOTAL = None  # type: ignore
        now = datetime.now(timezone.utc)
        sends_per_user: dict[int, int] = {}
        items = (
            db.query(models.Outbox)
            .filter(models.Outbox.dispatched_at == None)
            .filter(
                (models.Outbox.next_attempt_at == None)
                | (models.Outbox.next_attempt_at <= now)
            )
            .order_by(models.Outbox.id.asc())
            .limit(_OUTBOX_BATCH_SIZE)
            .all()
        )
        provider = get_email_provider()
        for ob in items:
            try:
                p = ob.payload or {}
                # Optional per-user rate limiting
                rid = p.get("reminder_id")
                user_id: int | None = None
                if rid:
                    inv = None
                    r_tmp = (
                        db.query(models.Reminder)
                        .filter(models.Reminder.id == int(rid))
                        .first()
                    )
                    if r_tmp:
                        inv = (
                            db.query(models.Invoice)
                            .filter(models.Invoice.id == r_tmp.invoice_id)
                            .first()
                        )
                        user_id = inv.user_id if inv else None
                if user_id is not None:
                    cnt = sends_per_user.get(user_id, 0)
                    if cnt >= _SENDER_MAX_PER_MIN_PER_USER:
                        # Defer to next window
                        ob.next_attempt_at = now + timedelta(
                            seconds=_SENDER_RATE_WINDOW_SEC
                        )
                        db.commit()
                        db.refresh(ob)
                        if EMAIL_SENDS_RATE_LIMITED_TOTAL:
                            with suppress(Exception):
                                EMAIL_SENDS_RATE_LIMITED_TOTAL.inc()
                        continue
                resp = provider.send(
                    to_email=p.get("to_email", ""),
                    subject=p.get("subject", ""),
                    html=p.get("html", ""),
                    text=p.get("text", ""),
                    headers=p.get("headers") or {},
                )
                if user_id is not None:
                    sends_per_user[user_id] = sends_per_user.get(user_id, 0) + 1
                if EMAIL_SENDS_ATTEMPTED_TOTAL:
                    with suppress(Exception):
                        EMAIL_SENDS_ATTEMPTED_TOTAL.inc()
                ob.dispatched_at = now
                ob.status = "sent"
                ob.attempts = (ob.attempts or 0) + 1
                db.commit()
                db.refresh(ob)
                # If reminder_id present, update its status
                if rid:
                    r = (
                        db.query(models.Reminder)
                        .filter(models.Reminder.id == int(rid))
                        .first()
                    )
                    if r:
                        r.status = models.ReminderStatus.sent
                        r.sent_at = datetime.now(timezone.utc)
                        meta = r.meta or {}
                        meta.update(
                            {
                                "message_id": resp.get("message_id"),
                                "provider": resp.get("provider", "postmark"),
                                "idempotency_key": p.get("headers", {}).get(
                                    "X-Idempotency-Key"
                                ),
                            }
                        )
                        r.meta = meta
                        db.commit()
            except Exception as e:
                if EMAIL_PROVIDER_ERRORS_TOTAL:
                    with suppress(Exception):
                        EMAIL_PROVIDER_ERRORS_TOTAL.inc()
                ob.attempts = (ob.attempts or 0) + 1
                # exponential backoff
                delay = min(3600, 30 * (2 ** (ob.attempts - 1)))
                ob.next_attempt_at = datetime.now(timezone.utc) + timedelta(
                    seconds=delay
                )
                ob.status = "pending"
                db.commit()
                db.refresh(ob)
                if ob.attempts >= 5:
                    try:
                        db.add(
                            models.DeadLetter(
                                kind="outbox.email.send",
                                payload=ob.payload,
                                error=str(e),
                            )
                        )
                        db.commit()
                    except Exception as dlq_exc:
                        logger.error(
                            "Failed to enqueue outbox dead letter id=%s error=%s",
                            ob.id,
                            dlq_exc,
                            exc_info=True,
                        )
                        db.rollback()
    finally:
        db.close()


def job_process_referral_rewards():
    """Process pending referral rewards for users with 30+ day paid subscriptions"""
    db = SessionLocal()
    try:
        from app.referral_service import referral_service

        rewards_granted = referral_service.process_pending_referral_rewards(db)
        if rewards_granted > 0:
            logger.info(
                {
                    "event": "referral_rewards_processed",
                    "rewards_granted": rewards_granted,
                }
            )
    except Exception as e:
        logger.error({"event": "referral_processing_error", "error": str(e)})
    finally:
        db.close()
