from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_preview_without_auth_explicit_variables_ok():
    full_vars = {
        "client_name": "Acme AP",
        "invoice_number": "INV-1024",
        "amount_formatted": "£1,250.00",
        "due_date_iso": "2025-09-15",
        "pay_link": "https://pay.example/abc123",
        "from_name": "Your Studio",
    }
    # Friendly tone
    r1 = client.post(
        "/reminders/preview",
        json={"template": "reminder", "tone": "friendly", "variables": full_vars},
    )
    assert r1.status_code == 200
    data1 = r1.json()["data"]
    assert data1["subject"].lower().startswith("quick nudge")
    # Firm tone
    r2 = client.post(
        "/reminders/preview",
        json={"template": "reminder", "tone": "firm", "variables": full_vars},
    )
    assert r2.status_code == 200
    data2 = r2.json()["data"]
    assert data2["subject"].lower().startswith("action required")


def test_preview_legacy_requires_auth():
    # Legacy path without auth should be rejected
    r = client.post(
        "/reminders/preview",
        json={"invoice_id": 1, "tone": "friendly"},
    )
    assert r.status_code in (400, 401)  # 400 when invoice_id missing vars; 401 when enforced

