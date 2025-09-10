import json
from app.email_provider import PostmarkProvider


class FakeResp:
    def __init__(self, status_code: int, json_data: dict | None = None, text: str = ""):
        self.status_code = status_code
        self._json = json_data or {}
        self.text = text
    def json(self):
        return self._json


class FakeClient:
    def __init__(self, sequence):
        self.sequence = list(sequence)
        self.calls = []
    def post(self, url, json=None, headers=None):
        self.calls.append({"url": url, "json": json, "headers": headers})
        return self.sequence.pop(0)
    def __enter__(self):
        return self
    def __exit__(self, *args):
        return False


def test_postmark_payload_and_retry(monkeypatch):
    # Arrange: first 500 then 200
    sequence = [
        FakeResp(500, {"ErrorCode": 500, "Message": "Server error"}),
        FakeResp(200, {"MessageID": "pm-123", "SubmittedAt": "2025-01-01"}),
    ]
    fp = FakeClient(sequence)

    import httpx
    monkeypatch.setattr(httpx, "Client", lambda timeout: fp)

    p = PostmarkProvider(server_token="tok", from_email="DueSpark <no-reply@example.com>")
    res = p.send(
        to_email="dest@example.com",
        subject="Subj",
        html="<b>Hi</b>",
        text="Hi",
        headers={"X-App-Reminder-Id": "1", "X-App-User-Id": "2"},
    )
    assert res["message_id"] == "pm-123"
    # Verify two attempts were made
    assert len(fp.calls) == 2
    payload = fp.calls[-1]["json"]
    assert payload["From"].startswith("DueSpark")
    assert payload["To"] == "dest@example.com"
    assert payload["Subject"] == "Subj"
    assert payload["HtmlBody"].startswith("<b>")
    assert payload["TextBody"] == "Hi"
    hdrs = {h["Name"]: h["Value"] for h in payload.get("Headers", [])}
    assert hdrs["X-App-Reminder-Id"] == "1"
    assert hdrs["X-App-User-Id"] == "2"


def test_postmark_no_retry_on_4xx(monkeypatch):
    sequence = [FakeResp(422, {"ErrorCode": 300, "Message": "Invalid"})]
    fp = FakeClient(sequence)
    import httpx
    monkeypatch.setattr(httpx, "Client", lambda timeout: fp)
    p = PostmarkProvider(server_token="tok", from_email="DueSpark <no-reply@example.com>")
    try:
        p.send(to_email="dest@example.com", subject="s", html="<b>h</b>", text="h")
        assert False, "Expected exception"
    except RuntimeError as e:
        assert "Invalid" in str(e)
    # Only one attempt
    assert len(fp.calls) == 1

