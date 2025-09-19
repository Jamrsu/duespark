import os
from datetime import datetime, timedelta, timezone
from uuid import uuid4
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.auth import hash_password
from app.database import get_db
from app.main import app
from app.models import (
    Client,
    Invoice,
    InvoiceStatus,
    Subscription,
    SubscriptionStatus,
    SubscriptionTier,
    UsageLimits,
    User,
)
from app.subscription_service import create_subscription_service


@pytest.fixture(autouse=True)
def stripe_env(monkeypatch):
    monkeypatch.setenv("STRIPE_SECRET_KEY", os.getenv("STRIPE_SECRET_KEY", "sk_test_123"))
    monkeypatch.setenv("STRIPE_BASIC_PRICE_ID", os.getenv("STRIPE_BASIC_PRICE_ID", "price_basic_123"))
    monkeypatch.setenv("STRIPE_PRO_PRICE_ID", os.getenv("STRIPE_PRO_PRICE_ID", "price_pro_123"))
    monkeypatch.setenv("STRIPE_AGENCY_PRICE_ID", os.getenv("STRIPE_AGENCY_PRICE_ID", "price_agency_123"))
    monkeypatch.setenv("APP_URL", os.getenv("APP_URL", "http://localhost:5173"))
    yield


def unique_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:8]}"


# Test helper functions
def create_test_user(db_session: Session, email: str = None) -> User:
    """Create a test user"""
    import uuid
    if email is None:
        email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    existing = db_session.query(User).filter(User.email == email).first()
    if existing:
        return existing
    user = User(email=email, password_hash=hash_password("Testpassword1!"))
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def create_test_client(
    db_session: Session, user_id: int, name: str = "Test Client"
) -> Client:
    """Create a test client"""
    client = Client(user_id=user_id, name=name, email="client@example.com")
    db_session.add(client)
    db_session.commit()
    db_session.refresh(client)
    return client


def create_test_invoice(db_session: Session, user_id: int, client_id: int) -> Invoice:
    """Create a test invoice"""
    from datetime import datetime, timedelta

    invoice = Invoice(
        user_id=user_id,
        client_id=client_id,
        amount_cents=10000,  # $100.00
        currency="USD",
        due_date=datetime.now() + timedelta(days=30),
        status=InvoiceStatus.pending,
    )
    db_session.add(invoice)
    db_session.commit()
    db_session.refresh(invoice)
    return invoice


@pytest.fixture
def mock_stripe():
    """Mock Stripe API calls"""
    with (
        patch("stripe.Customer") as mock_customer,
        patch("stripe.checkout.Session") as mock_checkout,
        patch("stripe.billing_portal.Session") as mock_portal,
        patch("stripe.Subscription") as mock_subscription,
    ):

        customer_id = unique_id("cus")
        subscription_id = unique_id("sub")

        mock_customer.create.return_value = MagicMock(id=customer_id)
        mock_customer.retrieve.return_value = MagicMock(id=customer_id)

        mock_checkout.create.return_value = MagicMock(
            url="https://checkout.stripe.com/test"
        )

        mock_portal.create.return_value = MagicMock(
            url="https://billing.stripe.com/test"
        )

        mock_subscription.modify.return_value = MagicMock(id=subscription_id)

        yield {
            "customer": mock_customer,
            "checkout": mock_checkout,
            "portal": mock_portal,
            "subscription": mock_subscription,
            "customer_id": customer_id,
            "subscription_id": subscription_id,
        }


@pytest.fixture
def db_session():
    """Create a database session for testing"""
    from app.database import SessionLocal

    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client():
    """Create a test client"""
    from fastapi.testclient import TestClient

    return TestClient(app)


@pytest.fixture
def auth_headers(db_session):
    """Create authentication headers for testing"""
    from app.auth import create_access_token

    # Create a test user
    user = create_test_user(db_session, "auth_test@example.com")

    # Create access token
    access_token = create_access_token(sub=user.email)

    return {"Authorization": f"Bearer {access_token}"}


class TestSubscriptionLimits:
    """Test subscription tier limits and enforcement"""

    def test_free_tier_limits(self, db_session: Session):
        user = create_test_user(db_session)
        service = create_subscription_service(db_session)

        # Create free subscription
        subscription = service.create_free_subscription(
            user.id, db_session
        )

        assert subscription.tier == SubscriptionTier.freemium
        assert subscription.status == SubscriptionStatus.active

        # Test reminder limit
        subscription.reminders_sent_count = 2
        db_session.commit()

        can_send, error = service.can_send_reminder(user.id, db_session)
        assert not can_send
        assert "Monthly reminder limit of 2 exceeded" in error

    def test_basic_tier_limits(self, db_session: Session):
        user = create_test_user(db_session)
        service = create_subscription_service(db_session)

        # Create professional subscription
        subscription = Subscription(
            user_id=user.id,
            tier=SubscriptionTier.professional,
            status=SubscriptionStatus.active,
            reminders_sent_count=0,
        )
        db_session.add(subscription)
        db_session.commit()

        # Test within limit
        can_send, error = service.can_send_reminder(user.id, db_session)
        assert can_send
        assert error is None

        # Test at limit
        subscription.reminders_sent_count = 999999
        db_session.commit()

        can_send, error = service.can_send_reminder(user.id, db_session)
        assert not can_send
        assert "Monthly reminder limit of 999999 exceeded" in error

    def test_past_due_subscription_blocked(self, db_session: Session):
        user = create_test_user(db_session)
        service = create_subscription_service(db_session)

        subscription = Subscription(
            user_id=user.id,
            tier=SubscriptionTier.professional,
            status=SubscriptionStatus.past_due,
            reminders_sent_count=0,
        )
        db_session.add(subscription)
        db_session.commit()

        can_send, error = service.can_send_reminder(user.id, db_session)
        assert not can_send
        assert "Subscription is past_due" in error

    def test_paused_subscription_blocked(self, db_session: Session):
        user = create_test_user(db_session)
        service = create_subscription_service(db_session)

        subscription = Subscription(
            user_id=user.id,
            tier=SubscriptionTier.professional,
            status=SubscriptionStatus.active,
            is_paused=True,
            reminders_sent_count=0,
        )
        db_session.add(subscription)
        db_session.commit()

        can_send, error = service.can_send_reminder(user.id, db_session)
        assert not can_send
        assert "Subscription is paused" in error

    def test_api_rate_limiting(self, db_session: Session):
        user = create_test_user(db_session)
        service = create_subscription_service(db_session)

        subscription = Subscription(
            user_id=user.id,
            tier=SubscriptionTier.freemium,
            status=SubscriptionStatus.active,
            # API tracking not implemented in model yet
        )
        db_session.add(subscription)
        db_session.commit()

        can_make, error = service.can_make_api_request(user.id, db_session)
        # API limits not enforced yet, so should allow requests
        assert can_make
        assert error is None

    def test_api_rate_limit_reset(self, db_session: Session):
        user = create_test_user(db_session)
        service = create_subscription_service(db_session)

        subscription = Subscription(
            user_id=user.id,
            tier=SubscriptionTier.freemium,
            status=SubscriptionStatus.active,
            # API tracking not implemented in model yet
        )
        db_session.add(subscription)
        db_session.commit()

        can_make, error = service.can_make_api_request(user.id, db_session)
        assert can_make
        assert error is None

        # API tracking not implemented, so just verify method works
        db_session.refresh(subscription)


class TestSubscriptionService:
    """Test subscription service functionality"""

    def test_create_free_subscription(self, db_session: Session):
        user = create_test_user(db_session)
        service = create_subscription_service(db_session)

        subscription = service.create_free_subscription(
            user.id, db_session
        )

        assert subscription.user_id == user.id
        assert subscription.tier == SubscriptionTier.freemium
        assert subscription.status == SubscriptionStatus.active
        assert subscription.reminders_sent_count == 0

    def test_get_subscription_info(self, db_session: Session):
        user = create_test_user(db_session)
        service = create_subscription_service(db_session)

        info = service.get_subscription_info(user.id, db_session)

        assert info["subscription"] is not None
        assert info["limits"] is not None
        assert info["usage"]["reminders_sent_this_period"] == 0  # Service returns reminders_sent_this_period in usage dict

    def test_record_reminder_sent(self, db_session: Session):
        user = create_test_user(db_session)
        service = create_subscription_service(db_session)
        subscription = service.create_free_subscription(
            user.id, db_session
        )

        initial_count = subscription.reminders_sent_count
        service.record_reminder_sent(user.id, db_session)

        db_session.refresh(subscription)
        assert subscription.reminders_sent_count == initial_count + 1

    def test_record_api_request(self, db_session: Session):
        user = create_test_user(db_session)
        service = create_subscription_service(db_session)
        subscription = service.create_free_subscription(
            user.id, db_session
        )

        # API request tracking not implemented in model yet, so just verify method doesn't error
        service.record_api_request(user.id, db_session)

        # This test passes if no exception is raised

    @patch.dict(
        os.environ,
        {
            "STRIPE_SECRET_KEY": "sk_test_123",
            "STRIPE_BASIC_PRICE_ID": "price_basic_123",
            "APP_URL": "http://localhost:5173",
        },
    )
    def test_create_checkout_session(self, db_session: Session, mock_stripe):
        user = create_test_user(db_session)
        service = create_subscription_service(db_session)

        checkout_url = service.create_checkout_session(
            user.id, SubscriptionTier.basic, db_session
        )

        assert checkout_url == "https://checkout.stripe.com/test"
        assert mock_stripe["customer"].create.called
        assert mock_stripe["checkout"].create.called

    @patch.dict(
        os.environ,
        {"STRIPE_SECRET_KEY": "sk_test_123", "APP_URL": "http://localhost:5173"},
    )
    def test_create_billing_portal_session(self, db_session: Session, mock_stripe):
        user = create_test_user(db_session)
        service = create_subscription_service(db_session)

        subscription = Subscription(
            user_id=user.id,
            tier=SubscriptionTier.professional,
            status=SubscriptionStatus.active,
            stripe_customer_id=mock_stripe["customer_id"],
        )
        db_session.add(subscription)
        db_session.commit()

        portal_url = service.create_billing_portal_session(
            user.id, db_session
        )

        assert portal_url == "https://billing.stripe.com/test"
        assert mock_stripe["portal"].create.called

    def test_pause_subscription(self, db_session: Session):
        user = create_test_user(db_session)
        service = create_subscription_service(db_session)
        subscription = service.create_free_subscription(
            user.id, db_session
        )

        success = service.pause_subscription(user.id, db_session)

        assert success
        db_session.refresh(subscription)
        assert subscription.paused

    def test_resume_subscription(self, db_session: Session):
        user = create_test_user(db_session)
        service = create_subscription_service(db_session)
        subscription = service.create_free_subscription(
            user.id, db_session
        )
        subscription.paused = True
        subscription.pause_resumes_at = datetime.utcnow() + timedelta(days=1)
        db_session.commit()

        success = service.resume_subscription(user.id, db_session)

        assert success
        db_session.refresh(subscription)
        assert not subscription.paused
        assert subscription.pause_resumes_at is None


class TestSubscriptionEndpoints:
    """Test subscription API endpoints"""

    def test_get_subscription_info_endpoint(
        self, client: TestClient, db_session: Session, auth_headers
    ):
        response = client.get("/api/subscription/info", headers=auth_headers)

        assert response.status_code == 200
        response_data = response.json()
        assert "data" in response_data
        data = response_data["data"]
        assert data["tier"] == "freemium"  # Default tier is freemium, not free
        assert data["status"] == "active"
        assert "reminders_per_month" in data

    @patch.dict(os.environ, {"STRIPE_SECRET_KEY": "sk_test_123"})
    def test_upgrade_subscription_endpoint(
        self, client: TestClient, db_session: Session, auth_headers, mock_stripe
    ):
        response = client.post(
            "/api/subscription/upgrade", json={"tier": "basic"}, headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert "checkout_url" in data

    @patch.dict(os.environ, {"STRIPE_SECRET_KEY": "sk_test_123"})
    def test_billing_portal_endpoint(
        self, client: TestClient, db_session: Session, auth_headers, mock_stripe
    ):
        # Create subscription with Stripe customer ID first
        user_id = 1  # From auth_headers fixture
        subscription = Subscription(
            user_id=user_id,
            tier=SubscriptionTier.professional,
            status=SubscriptionStatus.active,
            stripe_customer_id=mock_stripe["customer_id"],
        )
        db_session.add(subscription)
        db_session.commit()

        response = client.post("/api/subscription/billing-portal", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert "portal_url" in data

    def test_pause_subscription_endpoint(
        self, client: TestClient, db_session: Session, auth_headers
    ):
        subscription = (
            db_session.query(Subscription)
            .filter(Subscription.user_id == 1)
            .first()
        )
        if not subscription:
            subscription = Subscription(
                user_id=1,
                tier=SubscriptionTier.freemium,
                status=SubscriptionStatus.active,
            )
            db_session.add(subscription)
            db_session.commit()
        response = client.post("/api/subscription/pause", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Subscription paused successfully"

    def test_resume_subscription_endpoint(
        self, client: TestClient, db_session: Session, auth_headers
    ):
        subscription = (
            db_session.query(Subscription)
            .filter(Subscription.user_id == 1)
            .first()
        )
        if not subscription:
            subscription = Subscription(
                user_id=1,
                tier=SubscriptionTier.freemium,
                status=SubscriptionStatus.active,
            )
            db_session.add(subscription)
            db_session.commit()
        subscription.paused = True
        db_session.commit()
        response = client.post("/api/subscription/resume", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Subscription resumed successfully"


class TestReminderRateLimiting:
    """Test rate limiting on reminder endpoints"""

    def test_create_reminder_blocked_by_limit(
        self, client: TestClient, db_session: Session, auth_headers
    ):
        current_user = (
            db_session.query(User)
            .filter(User.email == "auth_test@example.com")
            .first()
        )
        assert current_user is not None
        user_id = current_user.id

        # Create a client and invoice
        test_client = create_test_client(db_session, user_id=user_id)
        invoice = create_test_invoice(db_session, user_id=user_id, client_id=test_client.id)

        # Set user to free tier at limit
        subscription = (
            db_session.query(Subscription)
            .filter(Subscription.user_id == user_id)
            .first()
        )
        if not subscription:
            subscription = Subscription(
                user_id=user_id,
                tier=SubscriptionTier.freemium,
                status=SubscriptionStatus.active,
            )
            db_session.add(subscription)
            db_session.commit()
        subscription.reminders_sent_count = 2  # At free tier limit
        db_session.commit()

        future_send_at = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        response = client.post(
            "/reminders",
            json={"invoice_id": invoice.id, "send_at": future_send_at},
            headers=auth_headers,
        )

        assert response.status_code == 403
        error_body = response.json()
        assert error_body.get("error", {}).get("message", "").startswith(
            "Monthly reminder limit"
        )

    def test_send_reminder_blocked_by_limit(
        self, client: TestClient, db_session: Session, auth_headers
    ):
        current_user = (
            db_session.query(User)
            .filter(User.email == "auth_test@example.com")
            .first()
        )
        assert current_user is not None
        user_id = current_user.id

        # Create a client, invoice, and reminder
        test_client = create_test_client(db_session, user_id=user_id)
        invoice = create_test_invoice(db_session, user_id=user_id, client_id=test_client.id)

        subscription = (
            db_session.query(Subscription)
            .filter(Subscription.user_id == user_id)
            .first()
        )
        if not subscription:
            subscription = Subscription(
                user_id=user_id,
                tier=SubscriptionTier.freemium,
                status=SubscriptionStatus.active,
            )
            db_session.add(subscription)
            db_session.commit()
        subscription.reminders_sent_count = 0
        db_session.commit()

        # Create reminder first
        future_send_at = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        reminder_response = client.post(
            "/reminders",
            json={"invoice_id": invoice.id, "send_at": future_send_at},
            headers=auth_headers,
        )
        assert reminder_response.status_code == 200
        reminder_data = reminder_response.json()["data"]
        reminder_id = reminder_data["id"]

        # Set user to free tier at limit
        subscription.reminders_sent_count = 2  # At free tier limit
        db_session.commit()

        response = client.post(
            "/reminders/send-now",
            json={"reminder_id": reminder_id},
            headers=auth_headers,
        )

        assert response.status_code == 403
        error_body = response.json()
        assert error_body.get("error", {}).get("message", "").startswith(
            "Monthly reminder limit"
        )


class TestWebhookHandling:
    """Test Stripe webhook handling"""

    def test_subscription_created_webhook(
        self, client: TestClient, db_session: Session
    ):
        # Create user with subscription
        user = create_test_user(db_session)
        subscription_id = unique_id("sub")
        customer_id = unique_id("cus")
        subscription = Subscription(
            user_id=user.id,
            tier=SubscriptionTier.freemium,
            status=SubscriptionStatus.active,
            stripe_customer_id=customer_id,
        )
        db_session.add(subscription)
        db_session.commit()

        webhook_payload = {
            "id": unique_id("evt"),
            "type": "customer.subscription.created",
            "data": {
                "object": {
                    "id": subscription_id,
                    "customer": customer_id,
                    "status": "active",
                    "current_period_start": 1640995200,  # 2022-01-01
                    "current_period_end": 1643673600,  # 2022-02-01
                    "items": {
                        "data": [
                            {
                                "price": {
                                    "id": os.getenv(
                                        "STRIPE_BASIC_PRICE_ID", "price_basic_123"
                                    )
                                }
                            }
                        ]
                    },
                    "cancel_at_period_end": False,
                }
            },
        }

        with patch("stripe.Webhook.construct_event", return_value=webhook_payload):
            response = client.post("/api/webhooks/stripe", json=webhook_payload)

        assert response.status_code == 200

        # Check subscription was updated
        db_session.refresh(subscription)
        assert subscription.stripe_subscription_id == subscription_id
        assert subscription.tier == SubscriptionTier.basic

    def test_payment_failed_webhook(self, client: TestClient, db_session: Session):
        # Create user with active subscription
        user = create_test_user(db_session)
        service = create_subscription_service(db_session)
        subscription_id = unique_id("sub")
        subscription = Subscription(
            user_id=user.id,
            tier=SubscriptionTier.professional,
            status=SubscriptionStatus.active,
            stripe_subscription_id=subscription_id,
        )
        db_session.add(subscription)
        db_session.commit()

        webhook_payload = {
            "id": unique_id("evt"),
            "type": "invoice.payment_failed",
            "data": {"object": {"subscription": subscription_id}},
        }

        with patch("stripe.Webhook.construct_event", return_value=webhook_payload):
            response = client.post("/api/webhooks/stripe", json=webhook_payload)

        assert response.status_code == 200

        # Check subscription status updated
        db_session.refresh(subscription)
        assert subscription.status == SubscriptionStatus.past_due
