from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_repo_template_loader_used(monkeypatch):
    # Monkeypatch loader to return a unique subject/body so we can assert it flows through.
    import app.main as m

    def fake_loader(name: str):
        assert name == "reminder"
        return (
            "SPECIAL SUBJECT {{ invoice_number }}",
            "Hello {{ client_name }}! Click [here]({{ pay_link }}). <script>alert(1)</script>",
        )

    monkeypatch.setattr(m, "load_markdown_template", fake_loader)

    vars = {
        "client_name": "Acme AP",
        "invoice_number": "INV-42",
        "amount_formatted": "$10.00",
        "due_date_iso": "2025-12-01",
        "pay_link": "https://pay.example/abc",
        "from_name": "Your Studio",
    }
    r = client.post(
        "/reminders/preview",
        json={"template": "reminder", "tone": "friendly", "variables": vars},
    )
    assert r.status_code == 200
    data = r.json()["data"]
    assert data["subject"].startswith("SPECIAL SUBJECT INV-42")
    # Sanitizer should strip script tags, link preserved
    assert "<script" not in data["html"].lower()
    assert ">here<" in data["html"].lower()
    # text should not include script and should include link text
    assert "here" in data["text"].lower()
