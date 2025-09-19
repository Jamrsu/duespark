import uuid

from fastapi.testclient import TestClient

from app import models
from app.database import SessionLocal
from app.main import app

client = TestClient(app)


def make_user(is_admin=False):
    email = f"admin_{uuid.uuid4().hex[:8]}@example.com"
    password = "Secret123!"
    r = client.post("/auth/register", json={"email": email, "password": password})
    assert r.status_code in (200, 409)
    # promote to admin if requested
    if is_admin:
        db = SessionLocal()
        u = db.query(models.User).filter(models.User.email == email).first()
        u.role = models.UserRole.admin
        db.commit()
        db.close()
    r = client.post("/auth/login", data={"username": email, "password": password})
    token = r.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_admin_endpoints_require_admin():
    headers = make_user(is_admin=False)
    r = client.get("/admin/dead_letters", headers=headers)
    assert r.status_code == 403
    r2 = client.post("/admin/reminders/requeue-failed", headers=headers)
    assert r2.status_code == 403
    r3 = client.post("/admin/scheduler/run-adaptive", headers=headers)
    assert r3.status_code == 403


def test_admin_run_adaptive_ok():
    headers = make_user(is_admin=True)
    r = client.post("/admin/scheduler/run-adaptive", headers=headers)
    assert r.status_code == 200
    assert r.json()["data"]["triggered"] is True
