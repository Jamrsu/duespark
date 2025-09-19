import uuid

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def make_user():
    email = f"ses_{uuid.uuid4().hex[:8]}@example.com"
    password = "Secret123!"
    r = client.post("/auth/register", json={"email": email, "password": password})
    assert r.status_code in (200, 409)
    r = client.post("/auth/login", data={"username": email, "password": password})
    assert r.status_code == 200
    token = r.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_send_now_with_ses(monkeypatch):
    # Force SES provider
    monkeypatch.setenv("EMAIL_PROVIDER", "ses")
    monkeypatch.setenv("AWS_REGION", "us-east-1")
    monkeypatch.setenv("EMAIL_FROM", "DueSpark <no-reply@example.com>")

    # Fake SES client
    class FakeSESClient:
        def send_email(self, **kwargs):
            return {"MessageId": "ses-mock-123"}

    # Patch SESProvider._client to avoid real AWS
    import app.email_provider as ep

    monkeypatch.setattr(ep.SESProvider, "_client", lambda self: FakeSESClient())

    headers = make_user()
    # Make minimal client/invoice/reminder
    rc = client.post(
        "/clients",
        headers=headers,
        json={"name": "Beta Co", "email": f"{uuid.uuid4().hex[:6]}@ex.com"},
    )
    assert rc.status_code == 200
    cid = rc.json()["data"]["id"]
    ri = client.post(
        "/invoices",
        headers=headers,
        json={
            "client_id": cid,
            "amount_cents": 9900,
            "currency": "USD",
            "due_date": "2025-12-01",
        },
    )
    assert ri.status_code == 200
    inv_id = ri.json()["data"]["id"]
    rr = client.post(
        "/reminders",
        headers=headers,
        json={
            "invoice_id": inv_id,
            "send_at": "2025-12-01T09:00:00Z",
            "channel": "email",
        },
    )
    assert rr.status_code == 200
    rid = rr.json()["data"]["id"]

    sn = client.post("/reminders/send-now", headers=headers, json={"reminder_id": rid})
    assert sn.status_code == 200
    data = sn.json()["data"]
    assert data["status"] == "sent"
    assert data["message_id"].startswith("ses-")
