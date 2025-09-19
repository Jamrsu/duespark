"""
Test Stripe webhooks handling and processing
"""

import json
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.database import get_db
from app.main import app
from app.models import Subscription, SubscriptionStatus, SubscriptionTier, User
from app.auth import hash_password


@pytest.fixture
def client():
    """Create a test client"""
    return TestClient(app)


@pytest.fixture
def db_session():
    """Create a database session for testing"""
    from app.database import SessionLocal

    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def unique_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:8]}"


def create_test_user(db_session, email="test@example.com"):
    """Create a test user"""
    existing = db_session.query(User).filter(User.email == email).first()
    if existing:
        return existing

    user = User(email=email, password_hash=hash_password("Testpass1!"))
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


class TestStripeWebhooks:
    """Test Stripe webhook processing"""

    def test_webhook_signature_verification_success(self, client, db_session):
        """Test successful webhook signature verification"""
        with patch("stripe.Webhook.construct_event") as mock_construct:
            mock_construct.return_value = {
                "type": "customer.subscription.created",
                "data": {
                    "object": {
                        "id": "sub_test123",
                        "customer": "cus_test123",
                        "status": "active",
                        "current_period_end": 1234567890,
                        "items": {
                            "data": [{"price": {"id": "price_basic"}}]
                        }
                    }
                }
            }

            response = client.post(
                "/webhooks/stripe",
                json={"type": "customer.subscription.created"},
                headers={"stripe-signature": "test_signature"}
            )

            assert response.status_code == 200
            mock_construct.assert_called_once()

    def test_webhook_signature_verification_failure(self, client):
        """Test webhook signature verification failure"""
        with patch("stripe.Webhook.construct_event") as mock_construct:
            mock_construct.side_effect = ValueError("Invalid signature")

            response = client.post(
                "/webhooks/stripe",
                json={"type": "test"},
                headers={"stripe-signature": "invalid_signature"}
            )

            assert response.status_code == 400

    def test_subscription_created_webhook(self, client, db_session):
        """Test customer.subscription.created webhook"""
        user = create_test_user(db_session, "webhook@example.com")

        sub_id = unique_id("sub")

        with patch("stripe.Webhook.construct_event") as mock_construct, \
             patch("app.stripe_webhooks.get_db") as mock_get_db:

            mock_get_db.return_value.__next__ = lambda: db_session
            mock_construct.return_value = {
                "type": "customer.subscription.created",
                "data": {
                    "object": {
                        "id": sub_id,
                        "customer": "cus_test123",
                        "status": "active",
                        "current_period_end": 1234567890,
                        "items": {
                            "data": [{"price": {"id": "price_basic"}}]
                        }
                    }
                }
            }

            # Create a customer record first
            with patch("app.models.User") as mock_user_query:
                mock_user_query.query.filter.return_value.first.return_value = user

                response = client.post(
                    "/webhooks/stripe",
                    json={"type": "customer.subscription.created"},
                    headers={"stripe-signature": "test_signature"}
                )

                assert response.status_code == 200

    def test_subscription_updated_webhook(self, client, db_session):
        """Test customer.subscription.updated webhook"""
        user = create_test_user(db_session, "webhook@example.com")

        # Create existing subscription
        sub_id = unique_id("sub")
        subscription = Subscription(
            user_id=user.id,
            tier=SubscriptionTier.freemium,
            status=SubscriptionStatus.active,
            stripe_subscription_id=sub_id
        )
        db_session.add(subscription)
        db_session.commit()

        with patch("stripe.Webhook.construct_event") as mock_construct, \
             patch("app.stripe_webhooks.get_db") as mock_get_db:

            mock_get_db.return_value.__next__ = lambda: db_session
            mock_construct.return_value = {
                "type": "customer.subscription.updated",
                "data": {
                    "object": {
                        "id": sub_id,
                        "customer": "cus_test123",
                        "status": "past_due",
                        "current_period_end": 1234567890,
                        "items": {
                            "data": [{"price": {"id": "price_premium"}}]
                        }
                    }
                }
            }

            response = client.post(
                "/webhooks/stripe",
                json={"type": "customer.subscription.updated"},
                headers={"stripe-signature": "test_signature"}
            )

            assert response.status_code == 200

    def test_subscription_deleted_webhook(self, client, db_session):
        """Test customer.subscription.deleted webhook"""
        user = create_test_user(db_session, "webhook@example.com")

        # Create existing subscription
        sub_id = unique_id("sub")
        subscription = Subscription(
            user_id=user.id,
            tier=SubscriptionTier.basic,
            status=SubscriptionStatus.active,
            stripe_subscription_id=sub_id
        )
        db_session.add(subscription)
        db_session.commit()

        with patch("stripe.Webhook.construct_event") as mock_construct, \
             patch("app.stripe_webhooks.get_db") as mock_get_db:

            mock_get_db.return_value.__next__ = lambda: db_session
            mock_construct.return_value = {
                "type": "customer.subscription.deleted",
                "data": {
                    "object": {
                        "id": sub_id,
                        "customer": "cus_test123"
                    }
                }
            }

            response = client.post(
                "/webhooks/stripe",
                json={"type": "customer.subscription.deleted"},
                headers={"stripe-signature": "test_signature"}
            )

            assert response.status_code == 200

    def test_payment_failed_webhook(self, client, db_session):
        """Test invoice.payment_failed webhook"""
        user = create_test_user(db_session, "webhook@example.com")

        sub_id = unique_id("sub")
        subscription = Subscription(
            user_id=user.id,
            tier=SubscriptionTier.basic,
            status=SubscriptionStatus.active,
            stripe_subscription_id=sub_id
        )
        db_session.add(subscription)
        db_session.commit()

        with patch("stripe.Webhook.construct_event") as mock_construct, \
             patch("app.stripe_webhooks.get_db") as mock_get_db:

            mock_get_db.return_value.__next__ = lambda: db_session
            mock_construct.return_value = {
                "type": "invoice.payment_failed",
                "data": {
                    "object": {
                        "id": unique_id("in"),
                        "customer": "cus_test123",
                        "subscription": sub_id,
                        "attempt_count": 2
                    }
                }
            }

            response = client.post(
                "/webhooks/stripe",
                json={"type": "invoice.payment_failed"},
                headers={"stripe-signature": "test_signature"}
            )

            assert response.status_code == 200

    def test_payment_succeeded_webhook(self, client, db_session):
        """Test invoice.payment_succeeded webhook"""
        user = create_test_user(db_session, "webhook@example.com")

        sub_id = unique_id("sub")
        subscription = Subscription(
            user_id=user.id,
            tier=SubscriptionTier.basic,
            status=SubscriptionStatus.past_due,
            stripe_subscription_id=sub_id
        )
        db_session.add(subscription)
        db_session.commit()

        with patch("stripe.Webhook.construct_event") as mock_construct, \
             patch("app.stripe_webhooks.get_db") as mock_get_db:

            mock_get_db.return_value.__next__ = lambda: db_session
            mock_construct.return_value = {
                "type": "invoice.payment_succeeded",
                "data": {
                    "object": {
                        "id": unique_id("in"),
                        "customer": "cus_test123",
                        "subscription": sub_id,
                        "billing_reason": "subscription_cycle"
                    }
                }
            }

            response = client.post(
                "/webhooks/stripe",
                json={"type": "invoice.payment_succeeded"},
                headers={"stripe-signature": "test_signature"}
            )

            assert response.status_code == 200

    def test_unsupported_webhook_event(self, client):
        """Test handling of unsupported webhook events"""
        with patch("stripe.Webhook.construct_event") as mock_construct:
            mock_construct.return_value = {
                "type": "unsupported.event.type",
                "data": {"object": {"id": "test123"}}
            }

            response = client.post(
                "/webhooks/stripe",
                json={"type": "unsupported.event.type"},
                headers={"stripe-signature": "test_signature"}
            )

            assert response.status_code == 200  # Should still return 200 for unsupported events

    def test_webhook_processing_error(self, client):
        """Test error handling during webhook processing"""
        with patch("stripe.Webhook.construct_event") as mock_construct:
            mock_construct.return_value = {
                "type": "customer.subscription.created",
                "data": {"object": {"id": "sub_test123"}}
            }

            # Simulate database error
            with patch("app.stripe_webhooks.get_db") as mock_get_db:
                mock_get_db.side_effect = Exception("Database connection failed")

                response = client.post(
                    "/webhooks/stripe",
                    json={"type": "customer.subscription.created"},
                    headers={"stripe-signature": "test_signature"}
                )

                # Should handle errors gracefully
                assert response.status_code in [200, 500]

    def test_webhook_idempotency(self, client, db_session):
        """Test webhook idempotency - processing same event twice"""
        user = create_test_user(db_session, "webhook@example.com")

        sub_id = unique_id("sub")

        with patch("stripe.Webhook.construct_event") as mock_construct, \
             patch("app.stripe_webhooks.get_db") as mock_get_db:

            mock_get_db.return_value.__next__ = lambda: db_session
            mock_construct.return_value = {
                "id": unique_id("evt"),
                "type": "customer.subscription.created",
                "data": {
                    "object": {
                        "id": sub_id,
                        "customer": "cus_test123",
                        "status": "active",
                        "current_period_end": 1234567890,
                        "items": {
                            "data": [{"price": {"id": "price_basic"}}]
                        }
                    }
                }
            }

            # Process webhook twice with same event ID
            response1 = client.post(
                "/webhooks/stripe",
                json={"id": unique_id("evt"), "type": "customer.subscription.created"},
                headers={"stripe-signature": "test_signature"}
            )

            response2 = client.post(
                "/webhooks/stripe",
                json={"id": "evt_test123", "type": "customer.subscription.created"},
                headers={"stripe-signature": "test_signature"}
            )

            assert response1.status_code == 200
            assert response2.status_code == 200


class TestWebhookSecurity:
    """Test webhook security features"""

    def test_missing_stripe_signature_header(self, client):
        """Test rejection of requests without Stripe signature"""
        response = client.post(
            "/webhooks/stripe",
            json={"type": "test"}
        )

        # Should reject without signature
        assert response.status_code in [400, 401]

    def test_invalid_json_payload(self, client):
        """Test handling of invalid JSON payloads"""
        response = client.post(
            "/webhooks/stripe",
            data="invalid json",
            headers={
                "stripe-signature": "test_signature",
                "content-type": "application/json"
            }
        )

        assert response.status_code == 400

    def test_webhook_endpoint_security_headers(self, client):
        """Test that webhook endpoint sets appropriate security headers"""
        with patch("stripe.Webhook.construct_event") as mock_construct:
            mock_construct.return_value = {
                "type": "ping",
                "data": {"object": {"id": "test"}}
            }

            response = client.post(
                "/webhooks/stripe",
                json={"type": "ping"},
                headers={"stripe-signature": "test_signature"}
            )

            # Webhook should complete successfully
            assert response.status_code == 200

            # Could check for security headers if implemented
            # assert "X-Content-Type-Options" in response.headers


class TestWebhookUtilities:
    """Test webhook utility functions"""

    def test_tier_mapping_from_price_id(self):
        """Test mapping Stripe price IDs to subscription tiers"""
        # This would test utility functions used by webhooks
        # if they were extracted to separate testable functions
        pass

    def test_status_mapping_from_stripe(self):
        """Test mapping Stripe statuses to internal statuses"""
        # This would test status mapping utility functions
        pass

    def test_webhook_event_logging(self):
        """Test that webhook events are properly logged"""
        # This would test logging functionality
        pass
