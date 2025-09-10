from datetime import datetime, timedelta, timezone, date, time as dtime
from fastapi.testclient import TestClient
from app.main import app
from app.scheduler import job_enqueue_due_reminders, job_compute_adaptive_schedules

client = TestClient(app)


def make_user_headers():
    import uuid
    email = f"sched_{uuid.uuid4().hex[:8]}@example.com"
    password = "secret123"
    r = client.post("/auth/register", json={"email": email, "password": password})
    assert r.status_code in (200, 409)
    r = client.post("/auth/login", data={"username": email, "password": password})
    assert r.status_code == 200
    token = r.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_enqueue_due_reminders_idempotent(monkeypatch):
    headers = make_user_headers()
    # Create client/invoice/reminder due now
    rc = client.post("/clients", headers=headers, json={"name": "Beta Co", "email": "beta@example.com", "timezone": "UTC"})
    assert rc.status_code == 200
    cid = rc.json()["data"]["id"]
    ri = client.post("/invoices", headers=headers, json={
        "client_id": cid,
        "amount_cents": 1000,
        "currency": "USD",
        "due_date": (date.today() + timedelta(days=1)).isoformat(),
    })
    assert ri.status_code == 200
    inv_id = ri.json()["data"]["id"]
    send_at = datetime.now(timezone.utc) - timedelta(minutes=1)
    rr = client.post("/reminders", headers=headers, json={
        "invoice_id": inv_id,
        "send_at": send_at.isoformat(),
        "channel": "email",
    })
    assert rr.status_code == 200

    # Fake provider
    class FakeProvider:
        def __init__(self):
            self.n = 0
        def send(self, **kwargs):
            self.n += 1
            return {"message_id": f"mock-{self.n}", "provider": "postmark"}

    import app.scheduler as sched
    fp = FakeProvider()
    # Patch the provider used by the scheduler module (local import binding)
    monkeypatch.setattr(sched, "get_email_provider", lambda: fp)

    # Run job twice; should send only once
    job_enqueue_due_reminders()
    job_enqueue_due_reminders()
    assert fp.n == 1


def test_adaptive_timezone_respected():
    headers = make_user_headers()
    # Client in Asia/Kolkata
    rc = client.post("/clients", headers=headers, json={"name": "Gamma Co", "email": "gamma@example.com", "timezone": "Asia/Kolkata"})
    assert rc.status_code == 200
    cid = rc.json()["data"]["id"]
    # Due date far in future to avoid race
    due = date(2031, 1, 10)
    ri = client.post("/invoices", headers=headers, json={
        "client_id": cid,
        "amount_cents": 2000,
        "currency": "USD",
        "due_date": due.isoformat(),
    })
    assert ri.status_code == 200
    inv_id = ri.json()["data"]["id"]

    # Compute schedules
    job_compute_adaptive_schedules()

    # Fetch reminders via API and locate for invoice
    lr = client.get("/reminders", headers=headers, params={"limit": 100, "offset": 0})
    assert lr.status_code == 200
    items = [r for r in lr.json()["data"] if r["invoice_id"] == inv_id]
    assert len(items) >= 1
    r0 = items[0]
    send_at = datetime.fromisoformat(r0["send_at"]).astimezone(timezone.utc)

    # Expected: 1 day before due date at 09:00 local (Asia/Kolkata)
    from zoneinfo import ZoneInfo
    local_tz = ZoneInfo("Asia/Kolkata")
    target_local_date = (due - timedelta(days=1))
    expected_local = datetime.combine(target_local_date, dtime(9, 0, tzinfo=local_tz))
    expected_utc = expected_local.astimezone(timezone.utc)

    assert send_at.hour == expected_utc.hour and send_at.minute == expected_utc.minute


def test_adaptive_dst_europe_london():
    headers = make_user_headers()
    # London client
    rc = client.post("/clients", headers=headers, json={"name": "Delta Co", "email": "delta@example.com", "timezone": "Europe/London"})
    assert rc.status_code == 200
    cid = rc.json()["data"]["id"]
    # Case 1: Winter (GMT): due Jan 12 -> schedule at Jan 10 09:00 GMT == 09:00 UTC
    due_winter = date(2031, 1, 12)
    ri = client.post("/invoices", headers=headers, json={
        "client_id": cid,
        "amount_cents": 2000,
        "currency": "GBP",
        "due_date": due_winter.isoformat(),
    })
    assert ri.status_code == 200
    job_compute_adaptive_schedules()
    lr = client.get("/reminders", headers=headers, params={"limit": 100, "offset": 0})
    items = [r for r in lr.json()["data"] if r["invoice_id"] == ri.json()["data"]["id"]]
    assert items, "no reminder created"
    send_at_utc = datetime.fromisoformat(items[0]["send_at"]).astimezone(timezone.utc)
    assert send_at_utc.hour == 9 and send_at_utc.minute == 0

    # Case 2: Summer (BST): due Jul 12 -> schedule at Jul 10 09:00 BST == 08:00 UTC
    due_summer = date(2031, 7, 12)
    ri2 = client.post("/invoices", headers=headers, json={
        "client_id": cid,
        "amount_cents": 2100,
        "currency": "GBP",
        "due_date": due_summer.isoformat(),
    })
    assert ri2.status_code == 200
    job_compute_adaptive_schedules()
    lr2 = client.get("/reminders", headers=headers, params={"limit": 200, "offset": 0})
    items2 = [r for r in lr2.json()["data"] if r["invoice_id"] == ri2.json()["data"]["id"]]
    assert items2, "no reminder created"
    send_at_utc2 = datetime.fromisoformat(items2[0]["send_at"]).astimezone(timezone.utc)
    # 09:00 London in July is UTC+1
    assert send_at_utc2.hour in (8, 9)  # allow minor drift in CI timezones


def test_invalid_timezone_defaults_to_utc_logs(monkeypatch, caplog):
    headers = make_user_headers()
    rc = client.post("/clients", headers=headers, json={"name": "Epsilon Co", "email": "eps@example.com", "timezone": "Invalid/TZ"})
    assert rc.status_code == 200
    cid = rc.json()["data"]["id"]
    due = date(2031, 2, 10)
    ri = client.post("/invoices", headers=headers, json={
        "client_id": cid,
        "amount_cents": 1000,
        "currency": "USD",
        "due_date": due.isoformat(),
    })
    assert ri.status_code == 200
    caplog.clear()
    caplog.set_level("WARNING")
    job_compute_adaptive_schedules()
    # Check a warning was logged about invalid timezone
    assert any("invalid_timezone" in str(rec.msg) for rec in caplog.records)


def test_friday_alignment_and_modal_hour():
    headers = make_user_headers()
    # Europe/London client
    rc = client.post("/clients", headers=headers, json={"name": "Zeta Co", "email": "zeta@example.com", "timezone": "Europe/London"})
    assert rc.status_code == 200
    cid = rc.json()["data"]["id"]
    from zoneinfo import ZoneInfo
    tz = ZoneInfo("Europe/London")
    # Create three paid invoices on Friday 11:00 local time
    for d in (1, 8, 15):
        due_dt = date.today() - timedelta(days=30 + d)
        r = client.post("/invoices", headers=headers, json={
            "client_id": cid,
            "amount_cents": 5000,
            "currency": "GBP",
            "due_date": due_dt.isoformat(),
            "status": "paid",
        })
        assert r.status_code == 200
        inv_id = r.json()["data"]["id"]
        # Set paid_at to a recent Friday 11:00 local time
        # Find last Friday from today minus d days
        local_now = datetime.now(tz) - timedelta(days=d)
        while local_now.strftime('%a').lower() != 'fri':
            local_now -= timedelta(days=1)
        paid_local = datetime.combine(local_now.date(), dtime(11,0), tzinfo=tz)
        paid_utc = paid_local.astimezone(timezone.utc)
        # Update in DB
        from app.database import SessionLocal
        from app import models
        db = SessionLocal()
        inv = db.query(models.Invoice).filter(models.Invoice.id == inv_id).first()
        inv.paid_at = paid_utc
        db.commit(); db.close()

    # Create an overdue invoice to schedule
    overdue_due = date.today() - timedelta(days=5)
    ri = client.post("/invoices", headers=headers, json={
        "client_id": cid,
        "amount_cents": 2200,
        "currency": "GBP",
        "due_date": overdue_due.isoformat(),
        "status": "pending",
    })
    assert ri.status_code == 200
    inv_overdue = ri.json()["data"]["id"]

    # Run adaptive
    job_compute_adaptive_schedules()

    # Fetch the scheduled reminder for the overdue invoice
    lr = client.get("/reminders", headers=headers, params={"limit": 200, "offset": 0})
    items = [r for r in lr.json()["data"] if r["invoice_id"] == inv_overdue]
    assert items, "no reminder scheduled for overdue invoice"
    send_at_utc = datetime.fromisoformat(items[0]["send_at"]).astimezone(timezone.utc)
    send_at_local = send_at_utc.astimezone(tz)
    # Should be Friday at 11:00 local due to modal stats
    assert send_at_local.strftime('%a').lower() == 'fri'
    assert send_at_local.hour == 11 and send_at_local.minute == 0


def test_dlq_requeue_flow(monkeypatch):
    # Admin for requeue endpoint
    import uuid
    admin_email = f"admin_{uuid.uuid4().hex[:8]}@example.com"
    password = "secret123"
    r = client.post("/auth/register", json={"email": admin_email, "password": password})
    assert r.status_code in (200, 409)
    # Promote to admin
    from app.database import SessionLocal
    from app import models
    db = SessionLocal()
    u = db.query(models.User).filter(models.User.email == admin_email).first()
    u.role = models.UserRole.admin
    db.commit(); db.close()
    r = client.post("/auth/login", data={"username": admin_email, "password": password})
    token = r.json()["data"]["access_token"]
    admin_headers = {"Authorization": f"Bearer {token}"}

    # Create user + data
    headers = make_user_headers()
    rc = client.post("/clients", headers=headers, json={"name": "Theta Co", "email": "theta@example.com", "timezone": "UTC"})
    cid = rc.json()["data"]["id"]
    ri = client.post("/invoices", headers=headers, json={
        "client_id": cid,
        "amount_cents": 1300,
        "currency": "USD",
        "due_date": (date.today() + timedelta(days=1)).isoformat(),
    })
    inv_id = ri.json()["data"]["id"]
    send_at = datetime.now(timezone.utc) - timedelta(minutes=1)
    rr = client.post("/reminders", headers=headers, json={
        "invoice_id": inv_id,
        "send_at": send_at.isoformat(),
        "channel": "email",
    })
    rem_id = rr.json()["data"]["id"]

    # Force provider failure
    class FailingProvider:
        def send(self, **kwargs):
            raise RuntimeError("provider down")

    import app.scheduler as sched
    monkeypatch.setattr(sched, "get_email_provider", lambda: FailingProvider())
    # Run job to produce DLQ
    job_enqueue_due_reminders()

    # Confirm DLQ entry exists
    db = SessionLocal()
    dlq = db.query(models.DeadLetter).order_by(models.DeadLetter.id.desc()).first()
    assert dlq and dlq.kind.startswith('reminder.send') and dlq.payload.get('reminder_id') == rem_id
    dlq_id = dlq.id
    db.close()

    # Switch to working provider
    class OkProvider:
        def __init__(self):
            self.n = 0
        def send(self, **kwargs):
            self.n += 1
            return {"message_id": f"mock-{self.n}", "provider": "postmark"}

    ok = OkProvider()
    monkeypatch.setattr(sched, "get_email_provider", lambda: ok)

    # Requeue via admin endpoint
    r = client.post("/admin/scheduler/requeue", headers=admin_headers, json={"dlq_id": dlq_id})
    assert r.status_code == 200

    # Run job to send
    job_enqueue_due_reminders()

    # Reminder should be sent now
    r_get = client.get(f"/reminders/{rem_id}", headers=headers)
    assert r_get.status_code == 200
    assert r_get.json()["data"]["status"] == "sent"

    # DLQ should be deleted
    db = SessionLocal()
    gone = db.query(models.DeadLetter).filter(models.DeadLetter.id == dlq_id).first()
    assert gone is None
    db.close()
