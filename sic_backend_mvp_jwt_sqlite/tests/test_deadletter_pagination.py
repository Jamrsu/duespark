import uuid

from fastapi.testclient import TestClient

from app import models
from app.database import SessionLocal
from app.main import app

client = TestClient(app)


def make_admin_headers():
    email = f"dlq_{uuid.uuid4().hex[:8]}@example.com"
    password = "Secret123!"
    r = client.post("/auth/register", json={"email": email, "password": password})
    assert r.status_code in (200, 409)
    # Promote to admin
    db = SessionLocal()
    u = db.query(models.User).filter(models.User.email == email).first()
    u.role = models.UserRole.admin
    db.commit()
    db.close()
    r = client.post("/auth/login", data={"username": email, "password": password})
    token = r.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_deadletter_cursor_pagination():
    headers = make_admin_headers()
    # Insert 3 DLQ rows with a unique kind to locate them amidst existing rows
    uniq_kind = f"test.kind.pagination.{uuid.uuid4().hex[:8]}"
    db = SessionLocal()
    for i in range(3):
        db.add(models.DeadLetter(kind=uniq_kind, payload={"i": i}, error=f"err-{i}"))
    db.commit()
    db.close()

    collected = []
    after = None
    pages = 0
    # Paginate until we collect the three inserted rows of our kind (or safety cap)
    for _ in range(10):
        params = {"limit": 2}
        if after:
            params["after_id"] = after
        r = client.get("/admin/dead_letters", headers=headers, params=params)
        assert r.status_code == 200
        body = r.json()
        items = body["data"]
        meta = body["meta"]
        pages += 1
        # collect our kind only
        for it in items:
            if it.get("kind") == uniq_kind:
                collected.append(it["id"])
        after = meta.get("next_cursor")
        if len(set(collected)) >= 3 or not after:
            break

    ids = set(collected)
    assert (
        len(ids) == 3
    ), f"Expected 3 test DLQs, got {len(ids)} from {pages} page(s) for kind {uniq_kind}"
