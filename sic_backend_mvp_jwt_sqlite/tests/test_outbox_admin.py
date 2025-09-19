import uuid

from fastapi.testclient import TestClient

from app import models
from app.database import SessionLocal
from app.main import app

client = TestClient(app)


def make_user():
    email = f"outadmin_{uuid.uuid4().hex[:8]}@example.com"
    password = "Secret123!"
    r = client.post("/auth/register", json={"email": email, "password": password})
    assert r.status_code in (200, 409)
    r = client.post("/auth/login", data={"username": email, "password": password})
    assert r.status_code == 200
    token = r.json()["data"]["access_token"]
    return email, {"Authorization": f"Bearer {token}"}


def test_outbox_admin_requires_admin():
    email, headers = make_user()
    r = client.get("/admin/outbox", headers=headers)
    assert r.status_code == 403
    r2 = client.post("/admin/outbox/999999/retry", headers=headers)
    assert r2.status_code == 403


def test_outbox_admin_list_and_retry(monkeypatch):
    # Create admin user
    email, headers = make_user()
    # Promote via DB for test
    db = SessionLocal()
    u = db.query(models.User).filter(models.User.email == email).first()
    u.role = models.UserRole.admin
    db.commit()
    db.close()

    # Insert an outbox row directly
    db = SessionLocal()
    ob = models.Outbox(
        topic="email.send",
        payload={
            "to_email": "x@y.z",
            "subject": "s",
            "html": "<b>h</b>",
            "text": "t",
            "headers": {},
        },
        status="pending",
    )
    db.add(ob)
    db.commit()
    db.refresh(ob)
    db.close()

    # List
    r = client.get("/admin/outbox", headers=headers, params={"limit": 5})
    assert r.status_code == 200
    data = r.json()["data"]
    assert any(i["id"] == ob.id for i in data)

    # Retry
    rr = client.post(f"/admin/outbox/{ob.id}/retry", headers=headers)
    assert rr.status_code == 200
    body = rr.json()["data"]
    assert body["id"] == ob.id and body["status"] == "pending"


def test_dev_promote_admin_endpoint(monkeypatch):
    # Enable dev endpoint
    monkeypatch.setenv("DEV_ENABLE_ADMIN_PROMOTE", "true")
    email, headers = make_user()
    # Non-admin should get 403 on /admin/outbox
    r = client.get("/admin/outbox", headers=headers)
    assert r.status_code == 403
    # Promote via dev endpoint
    pr = client.post("/dev/admin/promote", json={"email": email})
    assert pr.status_code == 200
    # Now admin list should succeed
    r2 = client.get("/admin/outbox", headers=headers)
    assert r2.status_code == 200
    # Disable flag for safety
    monkeypatch.delenv("DEV_ENABLE_ADMIN_PROMOTE", raising=False)
