from fastapi.testclient import TestClient
from app.main import app
import uuid

client = TestClient(app)

def make_headers():
    email = f"tone_{uuid.uuid4().hex[:8]}@example.com"
    password = "secret123"
    r = client.post("/auth/register", json={"email": email, "password": password})
    assert r.status_code in (200, 409)
    r = client.post("/auth/login", data={"username": email, "password": password})
    assert r.status_code == 200
    token = r.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_preview_variables_missing_keys():
    body = {
        "template": "reminder",
        "tone": "friendly",
        "variables": {
            # missing several required keys on purpose
            "client_name": "Acme AP",
            "invoice_number": "INV-1024",
        },
    }
    headers = make_headers()
    r = client.post("/reminders/preview", headers=headers, json=body)
    assert r.status_code == 400
    detail = r.json().get("detail")
    assert "missing" in detail
    missing = set(detail["missing"]) if isinstance(detail, dict) else set()
    assert {"amount_formatted", "due_date_iso", "pay_link", "from_name"}.issubset(missing)


def test_preview_returns_html_and_text_and_tone_affects_subject():
    full_vars = {
        "client_name": "Acme AP",
        "invoice_number": "INV-1024",
        "amount_formatted": "£1,250.00",
        "due_date_iso": "2025-09-15",
        "pay_link": "https://pay.example/abc123",
        "from_name": "Your Studio",
    }
    headers = make_headers()
    friendly = client.post("/reminders/preview", headers=headers, json={"template": "reminder", "tone": "friendly", "variables": full_vars})
    firm = client.post("/reminders/preview", headers=headers, json={"template": "reminder", "tone": "firm", "variables": full_vars})
    assert friendly.status_code == 200 and firm.status_code == 200
    f1 = friendly.json()["data"]
    f2 = firm.json()["data"]
    assert f1["subject"].lower().startswith("quick nudge")
    assert f2["subject"].lower().startswith("action required")
    assert "<strong>" in f1["html"].lower() or "<b>" in f1["html"].lower()
    assert "£1,250.00" in f1["text"]
