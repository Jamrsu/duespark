import uuid

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def make_user():
    email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    password = "Secret123!"
    r = client.post("/auth/register", json={"email": email, "password": password})
    assert r.status_code in (200, 409)
    # login
    r = client.post("/auth/login", data={"username": email, "password": password})
    assert r.status_code == 200
    token = r.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_crud_and_pagination_flow():
    headers = make_user()

    # Create clients
    r = client.post(
        "/clients", headers=headers, json={"name": "Acme", "email": "acme@example.com"}
    )
    assert r.status_code == 200
    client_id = r.json()["data"]["id"]

    # List clients with envelope and meta
    r = client.get("/clients?limit=10&offset=0", headers=headers)
    assert r.status_code == 200
    body = r.json()
    assert "data" in body and "meta" in body
    assert isinstance(body["data"], list)
    assert {"limit", "offset", "total"}.issubset(body["meta"].keys())

    # Update client
    r = client.put(
        f"/clients/{client_id}", headers=headers, json={"timezone": "Europe/London"}
    )
    assert r.status_code == 200
    assert r.json()["data"]["timezone"] == "Europe/London"

    # Create invoice
    r = client.post(
        "/invoices",
        headers=headers,
        json={
            "client_id": client_id,
            "amount_cents": 12345,
            "currency": "USD",
            "due_date": "2025-12-01",
        },
    )
    assert r.status_code == 200
    invoice_id = r.json()["data"]["id"]

    # List invoices paginated
    r = client.get("/invoices?limit=50&offset=0", headers=headers)
    assert r.status_code == 200
    assert "data" in r.json() and "meta" in r.json()

    # Create reminder
    r = client.post(
        "/reminders",
        headers=headers,
        json={
            "invoice_id": invoice_id,
            "send_at": "2025-11-30T09:00:00Z",
            "channel": "email",
            "subject": "Reminder",
            "body": "Please pay",
        },
    )
    assert r.status_code == 200
    reminder_id = r.json()["data"]["id"]

    # List reminders
    r = client.get("/reminders?limit=10&offset=0", headers=headers)
    assert r.status_code == 200
    assert "data" in r.json() and "meta" in r.json()

    # Update reminder
    r = client.put(
        f"/reminders/{reminder_id}", headers=headers, json={"subject": "New Subject"}
    )
    assert r.status_code == 200
    assert r.json()["data"]["subject"] == "New Subject"

    # Delete reminder
    r = client.delete(f"/reminders/{reminder_id}", headers=headers)
    assert r.status_code == 200
    assert r.json()["data"]["id"] == reminder_id

    # Delete invoice
    r = client.delete(f"/invoices/{invoice_id}", headers=headers)
    assert r.status_code == 200
    assert r.json()["data"]["id"] == invoice_id

    # Delete client
    r = client.delete(f"/clients/{client_id}", headers=headers)
    assert r.status_code == 200
    assert r.json()["data"]["id"] == client_id

    # Pagination behavior: create 2 clients and fetch with limit=1 offset=1
    _ = client.post(
        "/clients",
        headers=headers,
        json={"name": "C1", "email": f"c1-{uuid.uuid4().hex[:6]}@example.com"},
    )
    _ = client.post(
        "/clients",
        headers=headers,
        json={"name": "C2", "email": f"c2-{uuid.uuid4().hex[:6]}@example.com"},
    )
    r = client.get("/clients?limit=1&offset=1", headers=headers)
    assert r.status_code == 200
    body = r.json()
    assert len(body["data"]) == 1
    assert body["meta"]["limit"] == 1 and body["meta"]["offset"] == 1


def test_templates_preview_and_events():
    headers = make_user()
    # Create minimal client+invoice for preview
    rc = client.post(
        "/clients",
        headers=headers,
        json={"name": "ACo", "email": f"{uuid.uuid4().hex[:6]}@ex.com"},
    )
    assert rc.status_code == 200
    cid = rc.json()["data"]["id"]
    ri = client.post(
        "/invoices",
        headers=headers,
        json={
            "client_id": cid,
            "amount_cents": 2000,
            "currency": "USD",
            "due_date": "2025-12-02",
        },
    )
    assert ri.status_code == 200
    inv_id = ri.json()["data"]["id"]

    # Create a template
    rt = client.post(
        "/templates",
        headers=headers,
        json={
            "name": "Friendly",
            "tone": "friendly",
            "subject": "Hello {{client_name}}",
            "body_markdown": "Invoice {{invoice_id}} due {{due_date}}",
        },
    )
    assert rt.status_code == 200
    tid = rt.json()["data"]["id"]

    # List templates
    rt2 = client.get("/templates?limit=10&offset=0", headers=headers)
    assert rt2.status_code == 200
    assert "data" in rt2.json() and "meta" in rt2.json()

    # Preview using template
    rp = client.post(
        "/reminders/preview",
        headers=headers,
        json={"invoice_id": inv_id, "template_id": tid},
    )
    assert rp.status_code == 200
    pv = rp.json()["data"]
    assert str(inv_id) in pv["html"]

    # Events should exist (at least invoice created)
    re = client.get("/events?limit=50&offset=0", headers=headers)
    assert re.status_code == 200
    assert "data" in re.json() and isinstance(re.json()["data"], list)
