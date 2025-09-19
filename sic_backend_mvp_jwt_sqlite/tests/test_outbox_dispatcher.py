from datetime import date, datetime, timedelta, timezone

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def make_user_headers():
    import uuid

    email = f"outbox_{uuid.uuid4().hex[:8]}@example.com"
    password = "Secret123!"
    r = client.post("/auth/register", json={"email": email, "password": password})
    assert r.status_code in (200, 409)
    r = client.post("/auth/login", data={"username": email, "password": password})
    token = r.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_outbox_enabled_dispatcher(monkeypatch):
    # Enable outbox and reload scheduler
    monkeypatch.setenv("OUTBOX_ENABLED", "true")
    # Limit scheduler loops and batch size to avoid draining unrelated backlog
    monkeypatch.setenv("SCHEDULER_MAX_LOOPS", "1")
    monkeypatch.setenv("SCHEDULER_BATCH_SIZE", "1")
    # Only consider reminders created in the last 2 minutes (this test's data)
    monkeypatch.setenv("SCHEDULER_RECENT_SECONDS", "120")
    import importlib

    import app.scheduler as sched

    importlib.reload(sched)

    headers = make_user_headers()
    # Create client/invoice/reminder due now
    rc = client.post(
        "/clients",
        headers=headers,
        json={"name": "Omicron Co", "email": "omicron@example.com", "timezone": "UTC"},
    )
    assert rc.status_code == 200
    cid = rc.json()["data"]["id"]
    ri = client.post(
        "/invoices",
        headers=headers,
        json={
            "client_id": cid,
            "amount_cents": 999,
            "currency": "USD",
            "due_date": (date.today() + timedelta(days=1)).isoformat(),
        },
    )
    inv_id = ri.json()["data"]["id"]
    send_at = datetime.now(timezone.utc) - timedelta(minutes=1)
    rr = client.post(
        "/reminders",
        headers=headers,
        json={
            "invoice_id": inv_id,
            "send_at": send_at.isoformat(),
            "channel": "email",
        },
    )
    assert rr.status_code == 200
    rid = rr.json()["data"]["id"]

    # Fake provider to avoid real network
    class OkProvider:
        def __init__(self):
            self.n = 0

        def send(self, **kwargs):
            self.n += 1
            return {"message_id": f"mock-{self.n}", "provider": "postmark"}

    ok = OkProvider()
    monkeypatch.setattr(sched, "get_email_provider", lambda: ok)

    # First, enqueue due reminders (with outbox) — should NOT mark reminder as sent
    sched.job_enqueue_due_reminders()

    from app import models
    from app.database import SessionLocal

    db = SessionLocal()
    # Ensure outbox has at least one item
    ob = db.query(models.Outbox).order_by(models.Outbox.id.desc()).first()
    assert ob is not None and ob.topic == "email.send"
    # Reminder still scheduled
    r = db.query(models.Reminder).filter(models.Reminder.id == rid).first()
    assert r.status == models.ReminderStatus.scheduled
    db.close()

    # Dispatch outbox
    sched.job_outbox_dispatcher()

    db = SessionLocal()
    ob2 = db.query(models.Outbox).filter(models.Outbox.id == ob.id).first()
    assert ob2.dispatched_at is not None and ob2.status == "sent"
    r2 = db.query(models.Reminder).filter(models.Reminder.id == rid).first()
    assert r2.status == models.ReminderStatus.sent
    db.close()

    # Reset for other tests
    monkeypatch.setenv("OUTBOX_ENABLED", "false")
    importlib.reload(sched)
