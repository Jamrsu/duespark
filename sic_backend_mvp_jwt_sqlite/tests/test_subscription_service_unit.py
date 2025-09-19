"""Unit tests for the modern subscription service and gate implementations."""

from __future__ import annotations

from datetime import date, datetime, timezone
from types import SimpleNamespace
import uuid

import pytest

from app.models import (
    Client,
    Invoice,
    Subscription,
    SubscriptionStatus,
    SubscriptionTier,
    User,
)
from app.subscription_service import SubscriptionGate, SubscriptionLimits, SubscriptionService


def create_user(db_session, email: str | None = None) -> User:
    """Persist and return a user helper for tests."""
    user = User(
        email=email or f"user-{uuid.uuid4().hex[:8]}@example.com",
        password_hash="hashed-password",
        email_verified=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


class TestSubscriptionGate:
    """Subscription gate behaviour against real database state."""

    def test_get_user_subscription_creates_freemium_subscription(self, db_session):
        user = create_user(db_session)

        gate = SubscriptionGate(db_session)
        subscription = gate.get_user_subscription(user)

        assert subscription.tier == SubscriptionTier.freemium
        assert subscription.status == SubscriptionStatus.active
        assert subscription.user_id == user.id
        assert db_session.query(Subscription).count() == 1

    def test_get_user_tier_returns_existing(self, db_session):
        user = create_user(db_session, email="pro@example.com")
        db_session.add(
            Subscription(
                user_id=user.id,
                tier=SubscriptionTier.professional,
                status=SubscriptionStatus.active,
            )
        )
        db_session.commit()

        gate = SubscriptionGate(db_session)
        assert gate.get_user_tier(user) == SubscriptionTier.professional

    def test_check_client_limit_enforces_freemium_cap(self, db_session):
        db_session.query(Client).delete()
        db_session.commit()

        user = create_user(db_session, email="client-limit@example.com")
        gate = SubscriptionGate(db_session)
        gate.get_user_subscription(user)  # Ensure baseline subscription exists

        for idx in range(4):
            db_session.add(
                Client(
                    user_id=user.id,
                    name=f"Client {idx}",
                    email=f"client{idx}@example.com",
                )
            )
        db_session.commit()

        can_create, count, limit = gate.check_client_limit(user)
        assert can_create is True
        assert count == 4
        assert limit == SubscriptionLimits.TIER_LIMITS[SubscriptionTier.freemium]["max_clients"]

        db_session.add(
            Client(user_id=user.id, name="Client 5", email="client5@example.com")
        )
        db_session.commit()

        can_create, count, _ = gate.check_client_limit(user)
        assert can_create is False
        assert count == 5

    def test_check_invoice_limit_counts_current_month(self, db_session):
        db_session.query(Invoice).delete()
        db_session.query(Client).delete()
        db_session.commit()

        user = create_user(db_session, email="invoice-limit@example.com")
        gate = SubscriptionGate(db_session)
        gate.get_user_subscription(user)

        client = Client(user_id=user.id, name="Billing Co", email="billing@example.com")
        db_session.add(client)
        db_session.commit()

        now = datetime.now(timezone.utc)
        for amount in (1000, 2000, 3000):
            db_session.add(
                Invoice(
                    user_id=user.id,
                    client_id=client.id,
                    amount_cents=amount,
                    due_date=date.today(),
                    created_at=now,
                )
            )
        db_session.commit()

        can_create, count, limit = gate.check_invoice_limit(user)
        assert can_create is True
        assert count == 3
        assert limit == SubscriptionLimits.TIER_LIMITS[SubscriptionTier.freemium][
            "max_invoices_per_month"
        ]

    def test_get_usage_summary_reports_expected_metrics(self, db_session):
        db_session.query(Invoice).delete()
        db_session.query(Client).delete()
        db_session.commit()

        user = create_user(db_session, email="usage@example.com")
        gate = SubscriptionGate(db_session)
        gate.get_user_subscription(user)

        for idx in range(2):
            db_session.add(
                Client(
                    user_id=user.id,
                    name=f"Client {idx}",
                    email=f"client{idx}@example.com",
                )
            )
        db_session.commit()

        client = db_session.query(Client).filter(Client.user_id == user.id).first()
        db_session.add(
            Invoice(
                user_id=user.id,
                client_id=client.id,
                amount_cents=5000,
                due_date=date.today(),
                created_at=datetime.now(timezone.utc),
            )
        )
        db_session.commit()

        summary = gate.get_usage_summary(user)

        assert summary["tier"] == SubscriptionTier.freemium.value
        assert summary["clients"]["current"] == 2
        assert summary["invoices"]["current"] == 1
        assert summary["features"]["ai_features"] is False


class TestSubscriptionService:
    """Subscription service lifecycle and Stripe interactions."""

    def test_create_subscription_persists_record(self, db_session):
        user = create_user(db_session, email="create-sub@example.com")
        service = SubscriptionService(db_session)

        subscription = service.create_subscription(user.id, SubscriptionTier.freemium)

        assert subscription.user_id == user.id
        assert subscription.status == SubscriptionStatus.active
        assert db_session.query(Subscription).count() == 1

    def test_create_subscription_raises_when_existing(self, db_session):
        user = create_user(db_session, email="create-sub-duplicate@example.com")
        service = SubscriptionService(db_session)
        service.create_subscription(user.id, SubscriptionTier.freemium)

        with pytest.raises(ValueError):
            service.create_subscription(user.id, SubscriptionTier.professional)

    def test_can_send_reminder_blocks_when_usage_exceeded(self, db_session):
        user = create_user(db_session, email="reminders@example.com")
        service = SubscriptionService(db_session)
        subscription = service.create_subscription(user.id, SubscriptionTier.freemium)

        limit = SubscriptionLimits.TIER_LIMITS[SubscriptionTier.freemium][
            "max_reminders_per_month"
        ]
        subscription.reminders_sent_count = limit
        db_session.commit()

        allowed, reason = service.can_send_reminder(user.id)
        assert allowed is False
        assert "Monthly reminder limit" in reason

    def test_record_reminder_sent_increments_usage(self, db_session):
        user = create_user(db_session, email="record-usage@example.com")
        service = SubscriptionService(db_session)
        subscription = service.create_subscription(user.id, SubscriptionTier.freemium)

        service.record_reminder_sent(user.id)
        service.record_reminder_sent(user.id)

        db_session.refresh(subscription)
        assert subscription.reminders_sent_count == 2

    def test_create_checkout_session_creates_customer_and_session(self, db_session, monkeypatch):
        user = create_user(db_session, email="checkout@example.com")
        service = SubscriptionService(db_session)

        monkeypatch.setenv("STRIPE_SECRET_KEY", "sk_test")
        monkeypatch.setenv("STRIPE_PRO_PRICE_ID", "price_pro")
        monkeypatch.setenv("APP_URL", "https://app.example.com")

        created_customers = []
        created_sessions = []

        def fake_customer_create(**kwargs):
            created_customers.append(kwargs)
            return SimpleNamespace(id="cus_test")

        def fake_checkout_session_create(**kwargs):
            created_sessions.append(kwargs)
            return SimpleNamespace(url="https://checkout.example.com/session")

        monkeypatch.setattr(
            "app.subscription_service.stripe.Customer.create", fake_customer_create
        )
        monkeypatch.setattr(
            "app.subscription_service.stripe.checkout.Session.create",
            fake_checkout_session_create,
        )

        url = service.create_checkout_session(user.id, SubscriptionTier.professional)

        assert url == "https://checkout.example.com/session"
        assert created_customers == [{"email": user.email}]
        assert created_sessions and created_sessions[0]["mode"] == "subscription"

        subscription = db_session.query(Subscription).filter_by(user_id=user.id).one()
        assert subscription.stripe_customer_id == "cus_test"

    def test_create_billing_portal_session_requires_customer(self, db_session, monkeypatch):
        user = create_user(db_session, email="portal@example.com")
        service = SubscriptionService(db_session)
        subscription = service.create_subscription(user.id, SubscriptionTier.freemium)
        subscription.stripe_customer_id = "cus_existing"
        db_session.commit()

        monkeypatch.setenv("STRIPE_SECRET_KEY", "sk_test")
        monkeypatch.setenv("APP_URL", "https://app.example.com")

        captured = {}

        def fake_portal_session_create(**kwargs):
            captured.update(kwargs)
            return SimpleNamespace(url="https://billing.example.com/session")

        monkeypatch.setattr(
            "app.subscription_service.stripe.billing_portal.Session.create",
            fake_portal_session_create,
        )

        url = service.create_billing_portal_session(user.id)

        assert url == "https://billing.example.com/session"
        assert captured == {
            "customer": "cus_existing",
            "return_url": "https://app.example.com/settings/subscription",
        }

    def test_create_billing_portal_session_raises_without_customer(self, db_session, monkeypatch):
        user = create_user(db_session, email="portal-missing@example.com")
        service = SubscriptionService(db_session)
        service.create_subscription(user.id, SubscriptionTier.freemium)

        monkeypatch.setenv("STRIPE_SECRET_KEY", "sk_test")

        with pytest.raises(ValueError):
            service.create_billing_portal_session(user.id)

    def test_pause_and_resume_subscription_toggle_flag(self, db_session):
        user = create_user(db_session, email="pause@example.com")
        service = SubscriptionService(db_session)
        subscription = service.create_subscription(user.id, SubscriptionTier.freemium)

        assert bool(subscription.is_paused) is False

        assert service.pause_subscription(user.id) is True
        db_session.refresh(subscription)
        assert bool(subscription.is_paused) is True

        assert service.resume_subscription(user.id) is True
        db_session.refresh(subscription)
        assert bool(subscription.is_paused) is False

    def test_upgrade_subscription_updates_tier_and_price(self, db_session):
        user = create_user(db_session, email="upgrade@example.com")
        service = SubscriptionService(db_session)
        subscription = service.create_subscription(user.id, SubscriptionTier.freemium)

        updated = service.upgrade_subscription(user, SubscriptionTier.professional)

        assert updated.tier == SubscriptionTier.professional
        db_session.refresh(subscription)
        assert subscription.tier == SubscriptionTier.professional
