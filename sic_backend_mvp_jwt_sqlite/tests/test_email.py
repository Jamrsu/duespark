import uuid
from fastapi.testclient import TestClient
from app.main import app


client = TestClient(app)


def make_user():
    email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    password = "secret123"
    r = client.post("/auth/register", json={"email": email, "password": password})
    assert r.status_code in (200, 409)
    r = client.post("/auth/login", data={"username": email, "password": password})
    assert r.status_code == 200
    token = r.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_preview_and_send_now(monkeypatch):
    headers = make_user()
    # Create client/invoice/template/reminder
    rc = client.post("/clients", headers=headers, json={"name": "Alpha Co", "email": f"{uuid.uuid4().hex[:6]}@ex.com"})
    assert rc.status_code == 200
    cid = rc.json()["data"]["id"]
    ri = client.post("/invoices", headers=headers, json={
        "client_id": cid,
        "amount_cents": 4599,
        "currency": "USD",
        "due_date": "2031-01-01"
    })
    assert ri.status_code == 200
    inv_id = ri.json()["data"]["id"]
    rt = client.post("/templates", headers=headers, json={
        "name": "Neutral",
        "tone": "neutral",
        "subject": "Invoice {{invoice_number}} is due",
        "body_markdown": "Hi {{client_name}}, please pay **{{amount}} {{currency}}**."
    })
    assert rt.status_code == 200
    tid = rt.json()["data"]["id"]
    rr = client.post("/reminders", headers=headers, json={
        "invoice_id": inv_id,
        "send_at": "2031-01-01T09:00:00Z",
        "channel": "email"
    })
    assert rr.status_code == 200
    rid = rr.json()["data"]["id"]
    # Attach template to reminder
    _ = client.put(f"/reminders/{rid}", headers=headers, json={"status": "scheduled"})

    # Preview should return HTML + text
    rp = client.post("/reminders/preview", headers=headers, json={"invoice_id": inv_id, "template_id": tid, "tone": "neutral"})
    assert rp.status_code == 200
    body_html = rp.json()["data"]["html"].lower()
    text_md = rp.json()["data"]["text"].lower()
    assert "<strong>" in body_html or "<b>" in body_html
    assert "please pay" in text_md

    # Mock provider to avoid real network
    class FakeProvider:
        def __init__(self):
            self.n = 0
        def send(self, **kwargs):
            self.n += 1
            return {"message_id": f"mock-{self.n}", "provider": "postmark", "tracking_links": None}

    import app.main as m
    monkeypatch.setattr(m, "get_email_provider", lambda: FakeProvider())

    # Send now
    sn = client.post("/reminders/send-now", headers=headers, json={"reminder_id": rid})
    assert sn.status_code == 200
    data = sn.json()["data"]
    assert data["status"] == "sent"
    assert data["message_id"].startswith("mock-")

    # Idempotency: immediate re-send without force should 409
    sn2 = client.post("/reminders/send-now", headers=headers, json={"reminder_id": rid})
    assert sn2.status_code == 409
    # With force=true it should re-send and yield a new message id
    sn3 = client.post("/reminders/send-now", headers=headers, json={"reminder_id": rid, "force": True})
    assert sn3.status_code == 200
    data3 = sn3.json()["data"]
    assert data3["message_id"].startswith("mock-")
