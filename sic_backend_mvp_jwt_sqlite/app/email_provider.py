import os
import typing as _t
from typing import Any, Dict

import httpx


class EmailProvider:
    def send(
        self,
        *,
        to_email: str,
        subject: str,
        html: str,
        text: str,
        headers: Dict[str, str] | None = None,
    ) -> Dict[str, Any]:
        """Send an email and return a normalized result.
        Return shape: { "message_id": str, "provider": str, "tracking_links": dict | None }
        """
        raise NotImplementedError


class PostmarkProvider(EmailProvider):
    BASE_URL = "https://api.postmarkapp.com/email"

    def __init__(self, server_token: str, from_email: str):
        if not server_token:
            raise ValueError("POSTMARK_SERVER_TOKEN is required")
        if not from_email:
            raise ValueError("EMAIL_FROM is required")
        self.server_token = server_token
        self.from_email = from_email

    def send(
        self,
        *,
        to_email: str,
        subject: str,
        html: str,
        text: str,
        headers: Dict[str, str] | None = None,
    ) -> Dict[str, Any]:
        base_headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-Postmark-Server-Token": self.server_token,
        }
        payload: Dict[str, Any] = {
            "From": self.from_email,
            "To": to_email,
            "Subject": subject,
            "HtmlBody": html,
            "TextBody": text,
            "TrackOpens": True,
            "TrackLinks": "HtmlAndText",
        }
        # Optional MessageStream, ReplyTo, custom headers
        stream = os.getenv("POSTMARK_MESSAGE_STREAM")
        if stream:
            payload["MessageStream"] = stream
        reply_to = os.getenv("MAIL_REPLY_TO") or os.getenv("EMAIL_REPLY_TO")
        if reply_to:
            payload["ReplyTo"] = reply_to
        if headers:
            payload["Headers"] = [{"Name": k, "Value": v} for k, v in headers.items()]

        # Retry on 5xx with exponential backoff; no retry on 4xx
        timeout = float(os.getenv("EMAIL_HTTP_TIMEOUT", "10"))
        max_attempts = int(os.getenv("EMAIL_HTTP_MAX_ATTEMPTS", "3"))
        backoff_base = float(os.getenv("EMAIL_HTTP_BACKOFF", "0.5"))
        last_exc = None
        with httpx.Client(timeout=timeout) as client:
            for attempt in range(1, max_attempts + 1):
                resp = client.post(self.BASE_URL, json=payload, headers=base_headers)
                status = resp.status_code
                if 200 <= status < 300:
                    data = resp.json()
                    return {
                        "message_id": data.get("MessageID"),
                        "provider": "postmark",
                        "tracking_links": None,
                    }
                if 400 <= status < 500:
                    # no retry
                    try:
                        data = resp.json()
                    except Exception:
                        data = {"message": resp.text}
                    raise RuntimeError(f"Postmark send failed: {data}")
                # 5xx retry
                last_exc = RuntimeError(f"Postmark 5xx: {status}")
                if attempt < max_attempts:
                    import time

                    time.sleep(backoff_base * (2 ** (attempt - 1)))
            # exhausted
            if last_exc:
                raise last_exc
            raise RuntimeError("Postmark send failed: unknown error")


def get_email_provider() -> EmailProvider:
    provider = (os.getenv("EMAIL_PROVIDER") or "postmark").lower()

    def _from_addr() -> str:
        name = os.getenv("MAIL_FROM_NAME")
        addr = os.getenv("MAIL_FROM") or os.getenv("EMAIL_FROM") or ""
        if name and addr and "<" not in addr:
            return f"{name} <{addr}>"
        return addr

    if provider == "postmark":
        return PostmarkProvider(
            server_token=os.getenv("POSTMARK_SERVER_TOKEN", ""),
            from_email=_from_addr(),
        )
    if provider == "ses":
        return SESProvider(
            region=os.getenv("AWS_REGION", "us-east-1"),
            from_email=_from_addr(),
            configuration_set=os.getenv("SES_CONFIGURATION_SET", ""),
        )
    raise ValueError(f"Unsupported EMAIL_PROVIDER: {provider}")


class SESProvider(EmailProvider):
    def __init__(
        self, region: str, from_email: str, configuration_set: str | None = None
    ):
        if not from_email:
            raise ValueError("EMAIL_FROM is required")
        self.region = region or "us-east-1"
        self.from_email = from_email
        self.configuration_set = configuration_set or None

    def _client(self):
        import boto3  # boto3 uses env/instance credentials

        return boto3.client("sesv2", region_name=self.region)

    def send(
        self,
        *,
        to_email: str,
        subject: str,
        html: str,
        text: str,
        headers: Dict[str, str] | None = None,
    ) -> Dict[str, Any]:
        # Note: SES doesn't natively track links; `track_*` are stored as metadata only.
        client = self._client()
        content: Dict[str, Any] = {
            "Simple": {
                "Subject": {"Data": subject, "Charset": "UTF-8"},
                "Body": {
                    "Html": {"Data": html, "Charset": "UTF-8"},
                },
            }
        }
        if text:
            content["Simple"]["Body"]["Text"] = {"Data": text, "Charset": "UTF-8"}
        args: Dict[str, Any] = {
            "FromEmailAddress": self.from_email,
            "Destination": {"ToAddresses": [to_email]},
            "Content": content,
        }
        if self.configuration_set:
            args["ConfigurationSetName"] = self.configuration_set
        if headers:
            # SES supports headers via Raw emails; for Simple, pass tags for limited metadata
            args["EmailTags"] = [{"Name": k, "Value": v} for k, v in headers.items()]
        resp = client.send_email(**args)
        message_id = resp.get("MessageId") or resp.get("MessageID")
        return {"message_id": message_id, "provider": "ses", "tracking_links": None}
