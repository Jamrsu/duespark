import pytest
import os
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.models import User, Subscription, UsageLimits, SubscriptionTier, SubscriptionStatus
from app.subscription_service import subscription_service
from app.database import get_db
from app.models import User, Client, Invoice, InvoiceStatus
from app.auth import hash_password


# Test helper functions
def create_test_user(db_session: Session, email: str = "test@example.com") -> User:
    """Create a test user"""
    user = User(
        email=email,
        password_hash=hash_password("testpassword")
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def create_test_client(db_session: Session, user_id: int, name: str = "Test Client") -> Client:
    """Create a test client"""
    client = Client(
        user_id=user_id,
        name=name,
        email="client@example.com"
    )
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
        status=InvoiceStatus.pending
    )
    db_session.add(invoice)
    db_session.commit()
    db_session.refresh(invoice)
    return invoice


@pytest.fixture
def mock_stripe():
    """Mock Stripe API calls"""
    with patch('stripe.Customer') as mock_customer, \
         patch('stripe.checkout.Session') as mock_checkout, \
         patch('stripe.billing_portal.Session') as mock_portal, \
         patch('stripe.Subscription') as mock_subscription:

        mock_customer.create.return_value = MagicMock(id='cus_test123')
        mock_customer.retrieve.return_value = MagicMock(id='cus_test123')

        mock_checkout.create.return_value = MagicMock(url='https://checkout.stripe.com/test')

        mock_portal.create.return_value = MagicMock(url='https://billing.stripe.com/test')

        mock_subscription.modify.return_value = MagicMock(id='sub_test123')

        yield {
            'customer': mock_customer,
            'checkout': mock_checkout,
            'portal': mock_portal,
            'subscription': mock_subscription
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
    access_token = create_access_token(data={"sub": user.email})

    return {"Authorization": f"Bearer {access_token}"}


class TestSubscriptionLimits:
    """Test subscription tier limits and enforcement"""

    def test_free_tier_limits(self, db_session: Session):
        user = create_test_user(db_session)

        # Create free subscription
        subscription = subscription_service.create_free_subscription(user.id, db_session)

        assert subscription.tier == SubscriptionTier.freemium
        assert subscription.status == SubscriptionStatus.active

        # Test reminder limit
        subscription.reminders_sent_this_period = 2
        db_session.commit()

        can_send, error = subscription_service.can_send_reminder(user.id, db_session)
        assert not can_send
        assert "Monthly reminder limit of 2 exceeded" in error

    def test_basic_tier_limits(self, db_session: Session):
        user = create_test_user(db_session)

        # Create basic subscription
        subscription = Subscription(
            user_id=user.id,
            tier=SubscriptionTier.basic,
            status=SubscriptionStatus.active,
            reminders_sent_this_period=0
        )
        db_session.add(subscription)
        db_session.commit()

        # Test within limit
        can_send, error = subscription_service.can_send_reminder(user.id, db_session)
        assert can_send
        assert error is None

        # Test at limit
        subscription.reminders_sent_this_period = 100
        db_session.commit()

        can_send, error = subscription_service.can_send_reminder(user.id, db_session)
        assert not can_send
        assert "Monthly reminder limit of 100 exceeded" in error

    def test_past_due_subscription_blocked(self, db_session: Session):
        user = create_test_user(db_session)

        subscription = Subscription(
            user_id=user.id,
            tier=SubscriptionTier.basic,
            status=SubscriptionStatus.past_due,
            reminders_sent_this_period=0
        )
        db_session.add(subscription)
        db_session.commit()

        can_send, error = subscription_service.can_send_reminder(user.id, db_session)
        assert not can_send
        assert "Subscription is past_due" in error

    def test_paused_subscription_blocked(self, db_session: Session):
        user = create_test_user(db_session)

        subscription = Subscription(
            user_id=user.id,
            tier=SubscriptionTier.basic,
            status=SubscriptionStatus.active,
            paused=True,
            reminders_sent_this_period=0
        )
        db_session.add(subscription)
        db_session.commit()

        can_send, error = subscription_service.can_send_reminder(user.id, db_session)
        assert not can_send
        assert "Subscription is paused" in error

    def test_api_rate_limiting(self, db_session: Session):
        user = create_test_user(db_session)

        subscription = Subscription(
            user_id=user.id,
            tier=SubscriptionTier.freemium,
            status=SubscriptionStatus.active,
            api_requests_this_hour=100,
            last_api_reset=datetime.utcnow()
        )
        db_session.add(subscription)
        db_session.commit()

        can_make, error = subscription_service.can_make_api_request(user.id, db_session)
        assert not can_make
        assert "Hourly API limit of 100 exceeded" in error

    def test_api_rate_limit_reset(self, db_session: Session):
        user = create_test_user(db_session)

        subscription = Subscription(
            user_id=user.id,
            tier=SubscriptionTier.freemium,
            status=SubscriptionStatus.active,
            api_requests_this_hour=100,
            last_api_reset=datetime.utcnow() - timedelta(hours=2)  # 2 hours ago
        )
        db_session.add(subscription)
        db_session.commit()

        can_make, error = subscription_service.can_make_api_request(user.id, db_session)
        assert can_make
        assert error is None

        # Check that counter was reset
        db_session.refresh(subscription)
        assert subscription.api_requests_this_hour == 0


class TestSubscriptionService:
    """Test subscription service functionality"""

    def test_create_free_subscription(self, db_session: Session):
        user = create_test_user(db_session)

        subscription = subscription_service.create_free_subscription(user.id, db_session)

        assert subscription.user_id == user.id
        assert subscription.tier == SubscriptionTier.freemium
        assert subscription.status == SubscriptionStatus.active
        assert subscription.reminders_sent_this_period == 0

    def test_get_subscription_info(self, db_session: Session):
        user = create_test_user(db_session)

        info = subscription_service.get_subscription_info(user.id, db_session)

        assert info["subscription"] is not None
        assert info["limits"] is not None
        assert info["usage"]["reminders_sent_this_period"] == 0

    def test_record_reminder_sent(self, db_session: Session):
        user = create_test_user(db_session)
        subscription = subscription_service.create_free_subscription(user.id, db_session)

        initial_count = subscription.reminders_sent_this_period
        subscription_service.record_reminder_sent(user.id, db_session)

        db_session.refresh(subscription)
        assert subscription.reminders_sent_this_period == initial_count + 1

    def test_record_api_request(self, db_session: Session):
        user = create_test_user(db_session)
        subscription = subscription_service.create_free_subscription(user.id, db_session)

        initial_count = subscription.api_requests_this_hour
        subscription_service.record_api_request(user.id, db_session)

        db_session.refresh(subscription)
        assert subscription.api_requests_this_hour == initial_count + 1

    @patch.dict(os.environ, {
        'STRIPE_SECRET_KEY': 'sk_test_123',
        'STRIPE_BASIC_PRICE_ID': 'price_basic_123',
        'APP_URL': 'http://localhost:5173'
    })
    def test_create_checkout_session(self, db_session: Session, mock_stripe):
        user = create_test_user(db_session)

        checkout_url = subscription_service.create_checkout_session(
            user.id, SubscriptionTier.basic, db_session
        )

        assert checkout_url == 'https://checkout.stripe.com/test'
        assert mock_stripe['customer'].create.called
        assert mock_stripe['checkout'].create.called

    @patch.dict(os.environ, {
        'STRIPE_SECRET_KEY': 'sk_test_123',
        'APP_URL': 'http://localhost:5173'
    })
    def test_create_billing_portal_session(self, db_session: Session, mock_stripe):
        user = create_test_user(db_session)

        subscription = Subscription(
            user_id=user.id,
            tier=SubscriptionTier.basic,
            status=SubscriptionStatus.active,
            stripe_customer_id='cus_test123'
        )
        db_session.add(subscription)
        db_session.commit()

        portal_url = subscription_service.create_billing_portal_session(user.id, db_session)

        assert portal_url == 'https://billing.stripe.com/test'
        assert mock_stripe['portal'].create.called

    def test_pause_subscription(self, db_session: Session):
        user = create_test_user(db_session)
        subscription = subscription_service.create_free_subscription(user.id, db_session)

        success = subscription_service.pause_subscription(user.id, db_session)

        assert success
        db_session.refresh(subscription)
        assert subscription.paused

    def test_resume_subscription(self, db_session: Session):
        user = create_test_user(db_session)
        subscription = subscription_service.create_free_subscription(user.id, db_session)
        subscription.paused = True
        subscription.pause_resumes_at = datetime.utcnow() + timedelta(days=1)
        db_session.commit()

        success = subscription_service.resume_subscription(user.id, db_session)

        assert success
        db_session.refresh(subscription)
        assert not subscription.paused
        assert subscription.pause_resumes_at is None


class TestSubscriptionEndpoints:
    """Test subscription API endpoints"""

    def test_get_subscription_info_endpoint(self, client: TestClient, db_session: Session, auth_headers):
        response = client.get("/api/subscription/info", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["tier"] == "free"
        assert data["status"] == "active"
        assert "reminders_per_month" in data

    @patch.dict(os.environ, {'STRIPE_SECRET_KEY': 'sk_test_123'})
    def test_upgrade_subscription_endpoint(self, client: TestClient, db_session: Session, auth_headers, mock_stripe):
        response = client.post("/api/subscription/upgrade", json={
            "tier": "basic"
        }, headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert "checkout_url" in data

    @patch.dict(os.environ, {'STRIPE_SECRET_KEY': 'sk_test_123'})
    def test_billing_portal_endpoint(self, client: TestClient, db_session: Session, auth_headers, mock_stripe):
        # Create subscription with Stripe customer ID first
        user_id = 1  # From auth_headers fixture
        subscription = Subscription(
            user_id=user_id,
            tier=SubscriptionTier.basic,
            status=SubscriptionStatus.active,
            stripe_customer_id='cus_test123'
        )
        db_session.add(subscription)
        db_session.commit()

        response = client.post("/api/subscription/billing-portal", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert "portal_url" in data

    def test_pause_subscription_endpoint(self, client: TestClient, db_session: Session, auth_headers):
        response = client.post("/api/subscription/pause", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Subscription paused successfully"

    def test_resume_subscription_endpoint(self, client: TestClient, db_session: Session, auth_headers):
        response = client.post("/api/subscription/resume", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Subscription resumed successfully"


class TestReminderRateLimiting:
    """Test rate limiting on reminder endpoints"""

    def test_create_reminder_blocked_by_limit(self, client: TestClient, db_session: Session, auth_headers):
        # Create a client and invoice
        test_client = create_test_client(db_session, user_id=1)
        invoice = create_test_invoice(db_session, user_id=1, client_id=test_client.id)

        # Set user to free tier at limit
        user_id = 1  # From auth_headers fixture
        subscription = Subscription(
            user_id=user_id,
            tier=SubscriptionTier.freemium,
            status=SubscriptionStatus.active,
            reminders_sent_this_period=2  # At free tier limit
        )
        db_session.add(subscription)
        db_session.commit()

        response = client.post("/reminders", json={
            "invoice_id": invoice.id,
            "send_at": "2024-12-01T10:00:00Z"
        }, headers=auth_headers)

        assert response.status_code == 403
        assert "Monthly reminder limit" in response.json()["detail"]

    def test_send_reminder_blocked_by_limit(self, client: TestClient, db_session: Session, auth_headers):
        # Create a client, invoice, and reminder
        test_client = create_test_client(db_session, user_id=1)
        invoice = create_test_invoice(db_session, user_id=1, client_id=test_client.id)

        # Create reminder first
        reminder_response = client.post("/reminders", json={
            "invoice_id": invoice.id,
            "send_at": "2024-12-01T10:00:00Z"
        }, headers=auth_headers)
        reminder_id = reminder_response.json()["data"]["id"]

        # Set user to free tier at limit
        user_id = 1  # From auth_headers fixture
        subscription = db_session.query(Subscription).filter(Subscription.user_id == user_id).first()
        subscription.reminders_sent_this_period = 2  # At free tier limit
        db_session.commit()

        response = client.post("/reminders/send-now", json={
            "reminder_id": reminder_id
        }, headers=auth_headers)

        assert response.status_code == 403
        assert "Monthly reminder limit" in response.json()["detail"]


class TestWebhookHandling:
    """Test Stripe webhook handling"""

    def test_subscription_created_webhook(self, client: TestClient, db_session: Session):
        # Create user with subscription
        user = create_test_user(db_session)
        subscription = Subscription(
            user_id=user.id,
            tier=SubscriptionTier.freemium,
            status=SubscriptionStatus.active,
            stripe_customer_id='cus_test123'
        )
        db_session.add(subscription)
        db_session.commit()

        webhook_payload = {
            "id": "evt_test123",
            "type": "customer.subscription.created",
            "data": {
                "object": {
                    "id": "sub_test123",
                    "customer": "cus_test123",
                    "status": "active",
                    "current_period_start": 1640995200,  # 2022-01-01
                    "current_period_end": 1643673600,    # 2022-02-01
                    "items": {
                        "data": [
                            {"price": {"id": os.getenv("STRIPE_BASIC_PRICE_ID", "price_basic_123")}}
                        ]
                    },
                    "cancel_at_period_end": False
                }
            }
        }

        with patch('stripe.Webhook.construct_event', return_value=webhook_payload):
            response = client.post("/api/webhooks/stripe", json=webhook_payload)

        assert response.status_code == 200

        # Check subscription was updated
        db_session.refresh(subscription)
        assert subscription.stripe_subscription_id == "sub_test123"
        assert subscription.tier == SubscriptionTier.basic

    def test_payment_failed_webhook(self, client: TestClient, db_session: Session):
        # Create user with active subscription
        user = create_test_user(db_session)
        subscription = Subscription(
            user_id=user.id,
            tier=SubscriptionTier.basic,
            status=SubscriptionStatus.active,
            stripe_subscription_id='sub_test123'
        )
        db_session.add(subscription)
        db_session.commit()

        webhook_payload = {
            "id": "evt_test456",
            "type": "invoice.payment_failed",
            "data": {
                "object": {
                    "subscription": "sub_test123"
                }
            }
        }

        with patch('stripe.Webhook.construct_event', return_value=webhook_payload):
            response = client.post("/api/webhooks/stripe", json=webhook_payload)

        assert response.status_code == 200

        # Check subscription status updated
        db_session.refresh(subscription)
        assert subscription.status == SubscriptionStatus.past_due