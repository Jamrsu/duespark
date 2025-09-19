"""
Subscription Service - Feature Gating and Tier Management
Implements the Phase 3 Revenue & Growth Engine subscription strategy
"""

import os
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

import stripe
from fastapi import Depends, HTTPException
from sqlalchemy import extract, func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    Client,
    Invoice,
    Subscription,
    SubscriptionStatus,
    SubscriptionTier,
    User,
)


class SubscriptionLimits:
    """Define limits for each subscription tier"""

    TIER_LIMITS = {
        SubscriptionTier.freemium: {
            "max_clients": 5,
            "max_invoices_per_month": 20,
            "max_reminders_per_month": 2,
            "max_api_requests_per_hour": 100,
            "ai_features": False,
            "custom_branding": False,
            "advanced_analytics": False,
            "priority_support": False,
            "multi_user": False,
            "api_access": False,
            "white_label": False,
            "integrations": ["basic"],
            "templates": 3,
            "reminder_frequency": "daily",  # Minimum frequency
        },
        SubscriptionTier.basic: {
            "max_clients": 50,
            "max_invoices_per_month": 200,
            "max_reminders_per_month": 20,
            "max_api_requests_per_hour": 300,
            "ai_features": True,
            "custom_branding": True,
            "advanced_analytics": False,
            "priority_support": False,
            "multi_user": False,
            "api_access": False,
            "white_label": False,
            "integrations": ["stripe", "quickbooks"],
            "templates": 10,
            "reminder_frequency": "hourly",
        },
        SubscriptionTier.professional: {
            "max_clients": 999999,  # Large number instead of infinity
            "max_invoices_per_month": 999999,
            "max_reminders_per_month": 999999,
            "max_api_requests_per_hour": 1000,
            "ai_features": True,
            "custom_branding": True,
            "advanced_analytics": True,
            "priority_support": True,
            "multi_user": False,
            "api_access": False,
            "white_label": False,
            "integrations": ["stripe", "quickbooks", "xero"],
            "templates": 999999,
            "reminder_frequency": "hourly",
        },
        SubscriptionTier.agency: {
            "max_clients": 999999,  # Large number instead of infinity
            "max_invoices_per_month": 999999,
            "max_reminders_per_month": 999999,
            "max_api_requests_per_hour": 5000,
            "ai_features": True,
            "custom_branding": True,
            "advanced_analytics": True,
            "priority_support": True,
            "multi_user": True,
            "api_access": True,
            "white_label": True,
            "integrations": ["stripe", "quickbooks", "xero", "zapier", "webhooks"],
            "templates": 999999,
            "reminder_frequency": "realtime",
        },
    }

    TIER_PRICES = {
        SubscriptionTier.freemium: 0,
        SubscriptionTier.basic: 1900,  # $19.00 in cents
        SubscriptionTier.professional: 2900,  # $29.00 in cents
        SubscriptionTier.agency: 9900,  # $99.00 in cents
    }


class SubscriptionGate:
    """Feature gating service for subscription tiers"""

    def __init__(self, db: Session):
        self.db = db

    def get_user_subscription(self, user: User) -> Subscription:
        """Get user's current subscription or create a default freemium one"""
        subscription = (
            self.db.query(Subscription).filter(Subscription.user_id == user.id).first()
        )

        if not subscription:
            # Create default freemium subscription
            subscription = Subscription(
                user_id=user.id,
                tier=SubscriptionTier.freemium,
                status=SubscriptionStatus.active,
            )
            self.db.add(subscription)
            self.db.commit()
            self.db.refresh(subscription)

        return subscription

    def get_user_tier(self, user: User) -> SubscriptionTier:
        """Get user's current subscription tier"""
        subscription = self.get_user_subscription(user)
        return subscription.tier

    def check_client_limit(self, user: User) -> Tuple[bool, int, int]:
        """Check if user can create more clients
        Returns: (can_create, current_count, limit)
        """
        tier = self.get_user_tier(user)
        current_count = self.db.query(Client).filter(Client.user_id == user.id).count()
        limit = SubscriptionLimits.TIER_LIMITS[tier]["max_clients"]

        can_create = current_count < limit
        return can_create, current_count, int(limit) if limit != 999999 else -1

    def check_invoice_limit(self, user: User) -> Tuple[bool, int, int]:
        """Check if user can create more invoices this month
        Returns: (can_create, current_count, limit)
        """
        tier = self.get_user_tier(user)

        # Count invoices created this month
        now = datetime.now(timezone.utc)
        current_count = (
            self.db.query(Invoice)
            .filter(
                Invoice.user_id == user.id,
                extract("year", Invoice.created_at) == now.year,
                extract("month", Invoice.created_at) == now.month,
            )
            .count()
        )

        limit = SubscriptionLimits.TIER_LIMITS[tier]["max_invoices_per_month"]
        can_create = current_count < limit
        return can_create, current_count, int(limit) if limit != 999999 else -1

    def check_feature_access(self, user: User, feature: str) -> bool:
        """Check if user has access to a specific feature"""
        tier = self.get_user_tier(user)
        tier_limits = SubscriptionLimits.TIER_LIMITS[tier]
        return tier_limits.get(feature, False)

    def get_upgrade_suggestions(self, user: User) -> List[Dict]:
        """Get personalized upgrade suggestions based on usage"""
        tier = self.get_user_tier(user)
        suggestions = []

        if tier == SubscriptionTier.freemium:
            # Check if user is hitting limits
            can_create_clients, client_count, client_limit = self.check_client_limit(
                user
            )
            can_create_invoices, invoice_count, invoice_limit = (
                self.check_invoice_limit(user)
            )

            if not can_create_clients or client_count >= client_limit * 0.8:
                suggestions.append(
                    {
                        "type": "client_limit",
                        "message": f"You're using {client_count}/{client_limit} clients. Upgrade to Professional for unlimited clients!",
                        "recommended_tier": SubscriptionTier.professional,
                        "priority": "high" if not can_create_clients else "medium",
                    }
                )

            if not can_create_invoices or invoice_count >= invoice_limit * 0.8:
                suggestions.append(
                    {
                        "type": "invoice_limit",
                        "message": f"You've used {invoice_count}/{invoice_limit} invoices this month. Upgrade for unlimited invoicing!",
                        "recommended_tier": SubscriptionTier.professional,
                        "priority": "high" if not can_create_invoices else "medium",
                    }
                )

            # Feature-based suggestions
            suggestions.append(
                {
                    "type": "ai_features",
                    "message": "Unlock AI-powered adaptive scheduling and smart reminder tones!",
                    "recommended_tier": SubscriptionTier.professional,
                    "priority": "low",
                }
            )

        elif tier == SubscriptionTier.professional:
            suggestions.append(
                {
                    "type": "team_features",
                    "message": "Need to collaborate with your team? Upgrade to Agency for multi-user access!",
                    "recommended_tier": SubscriptionTier.agency,
                    "priority": "medium",
                }
            )

            suggestions.append(
                {
                    "type": "white_label",
                    "message": "Brand everything with your company logo and colors with Agency tier!",
                    "recommended_tier": SubscriptionTier.agency,
                    "priority": "low",
                }
            )

        return suggestions

    def get_usage_summary(self, user: User) -> Dict:
        """Get comprehensive usage summary for the user"""
        tier = self.get_user_tier(user)
        tier_limits = SubscriptionLimits.TIER_LIMITS[tier]

        # Get current usage
        can_create_clients, client_count, client_limit = self.check_client_limit(user)
        can_create_invoices, invoice_count, invoice_limit = self.check_invoice_limit(
            user
        )

        # Calculate usage percentages
        client_usage_percent = (
            (client_count / client_limit * 100) if client_limit > 0 else 0
        )
        invoice_usage_percent = (
            (invoice_count / invoice_limit * 100) if invoice_limit > 0 else 0
        )

        return {
            "tier": tier.value,
            "tier_display": tier.value.title(),
            "price_cents": SubscriptionLimits.TIER_PRICES[tier],
            "clients": {
                "current": client_count,
                "limit": client_limit if client_limit != 999999 else -1,
                "usage_percent": client_usage_percent,
                "can_create_more": can_create_clients,
            },
            "invoices": {
                "current": invoice_count,
                "limit": invoice_limit if invoice_limit != 999999 else -1,
                "usage_percent": invoice_usage_percent,
                "can_create_more": can_create_invoices,
            },
            "features": {
                "ai_features": tier_limits["ai_features"],
                "custom_branding": tier_limits["custom_branding"],
                "advanced_analytics": tier_limits["advanced_analytics"],
                "priority_support": tier_limits["priority_support"],
                "multi_user": tier_limits["multi_user"],
                "api_access": tier_limits["api_access"],
                "white_label": tier_limits["white_label"],
            },
            "integrations": tier_limits["integrations"],
            "upgrade_suggestions": self.get_upgrade_suggestions(user),
        }


class SubscriptionService:
    """Service for subscription management operations"""

    PRICE_ENV_MAP = {
        SubscriptionTier.basic: "STRIPE_BASIC_PRICE_ID",
        SubscriptionTier.professional: "STRIPE_PRO_PRICE_ID",
        SubscriptionTier.agency: "STRIPE_AGENCY_PRICE_ID",
    }

    def __init__(self, db: Session):
        self.db = db
        self.gate = SubscriptionGate(db)

    def _ensure_stripe_configured(self) -> str:
        stripe_key = os.getenv("STRIPE_SECRET_KEY")
        if not stripe_key:
            raise ValueError("Stripe is not configured")
        stripe.api_key = stripe_key
        return stripe_key

    def _get_price_id(self, tier: SubscriptionTier) -> str:
        env_key = self.PRICE_ENV_MAP.get(tier)
        if not env_key:
            raise ValueError(f"No Stripe price mapping for tier {tier.value}")
        price_id = os.getenv(env_key)
        if not price_id:
            raise ValueError(f"{env_key} environment variable not configured")
        return price_id

    def create_subscription(
        self,
        user_id: int,
        tier: SubscriptionTier,
        stripe_subscription_id: Optional[str] = None,
    ) -> Subscription:
        """Create a new subscription for a user"""
        # Check if user already has a subscription
        existing = (
            self.db.query(Subscription).filter(Subscription.user_id == user_id).first()
        )

        if existing:
            raise ValueError("User already has a subscription")

        subscription = Subscription(
            user_id=user_id,
            tier=tier,
            status=SubscriptionStatus.active,
            stripe_subscription_id=stripe_subscription_id,
        )

        self.db.add(subscription)
        self.db.commit()
        self.db.refresh(subscription)
        return subscription

    def upgrade_subscription(
        self, user: User, new_tier: SubscriptionTier
    ) -> Subscription:
        """Upgrade user's subscription to a new tier"""
        subscription = self.gate.get_user_subscription(user)

        # Validate upgrade path
        if new_tier == subscription.tier:
            raise ValueError("User is already on this tier")

        tier_hierarchy = [
            SubscriptionTier.freemium,
            SubscriptionTier.professional,
            SubscriptionTier.agency,
        ]
        if tier_hierarchy.index(new_tier) <= tier_hierarchy.index(subscription.tier):
            raise ValueError("Cannot downgrade subscription")

        # Update subscription
        subscription.tier = new_tier
        subscription.price_cents = SubscriptionLimits.TIER_PRICES[new_tier]
        subscription.updated_at = func.now()

        self.db.commit()
        self.db.refresh(subscription)
        return subscription

    def get_tier_limits(self, tier: SubscriptionTier) -> Dict:
        """Get limits for a specific tier"""
        return SubscriptionLimits.TIER_LIMITS[tier]

    def get_tier_comparison(self) -> Dict:
        """Get comparison of all subscription tiers"""
        return {
            "tiers": [
                {
                    "id": tier.value,
                    "name": tier.value.title(),
                    "price_cents": SubscriptionLimits.TIER_PRICES[tier],
                    "price_display": (
                        f"${SubscriptionLimits.TIER_PRICES[tier]/100:.0f}"
                        if SubscriptionLimits.TIER_PRICES[tier] > 0
                        else "Free"
                    ),
                    "features": SubscriptionLimits.TIER_LIMITS[tier],
                    "popular": tier == SubscriptionTier.professional,
                    "description": self._get_tier_description(tier),
                }
                for tier in SubscriptionTier
            ]
        }

    def _get_tier_description(self, tier: SubscriptionTier) -> str:
        """Get marketing description for each tier"""
        descriptions = {
            SubscriptionTier.freemium: "Perfect for getting started with basic invoice reminders",
            SubscriptionTier.professional: "Everything you need to scale your business with AI-powered features",
            SubscriptionTier.agency: "Advanced collaboration and white-label options for agencies and teams",
        }
        return descriptions.get(tier, "")

    def create_free_subscription(self, user_id: int, db_session: Session = None) -> Subscription:
        """Create a free subscription for a user"""
        if db_session is None:
            db_session = self.db
        return self.create_subscription(user_id, SubscriptionTier.freemium)

    def can_send_reminder(self, user_id: int, db_session: Session = None) -> Tuple[bool, Optional[str]]:
        """Check if user can send a reminder based on subscription limits"""
        if db_session is None:
            db_session = self.db

        subscription = db_session.query(Subscription).filter(Subscription.user_id == user_id).first()
        if not subscription:
            # Create free subscription if none exists
            subscription = self.create_free_subscription(user_id, db_session)

        # Check subscription status
        if subscription.status == SubscriptionStatus.past_due:
            return False, "Subscription is past_due"

        if subscription.is_paused:
            return False, "Subscription is paused"

        # Check reminder limits
        limits = self.get_tier_limits(subscription.tier)
        if subscription.reminders_sent_count >= limits["max_reminders_per_month"]:
            return False, f"Monthly reminder limit of {limits['max_reminders_per_month']} exceeded"

        return True, None

    def can_make_api_request(self, user_id: int, db_session: Session = None) -> Tuple[bool, Optional[str]]:
        """Check if user can make an API request based on subscription limits"""
        if db_session is None:
            db_session = self.db

        subscription = db_session.query(Subscription).filter(Subscription.user_id == user_id).first()
        if not subscription:
            subscription = self.create_free_subscription(user_id, db_session)

        # For now, allow all API requests - API rate limiting not yet implemented in model
        return True, None

    def get_subscription_info(self, user_id: int, db_session: Session = None) -> Dict:
        """Get subscription information for a user"""
        if db_session is None:
            db_session = self.db

        subscription = db_session.query(Subscription).filter(Subscription.user_id == user_id).first()
        if not subscription:
            subscription = self.create_free_subscription(user_id, db_session)

        limits = self.get_tier_limits(subscription.tier)

        return {
            "subscription": subscription,
            "limits": limits,
            "usage": {
                "reminders_sent_this_period": subscription.reminders_sent_count,
                "api_requests_this_hour": 0  # API tracking not yet implemented
            }
        }

    def record_reminder_sent(self, user_id: int, db_session: Session = None):
        """Record that a reminder was sent"""
        if db_session is None:
            db_session = self.db

        subscription = db_session.query(Subscription).filter(Subscription.user_id == user_id).first()
        if subscription:
            subscription.reminders_sent_count += 1
            db_session.commit()

    def record_api_request(self, user_id: int, db_session: Session = None):
        """Record that an API request was made"""
        if db_session is None:
            db_session = self.db

        # API request tracking not yet implemented in model
        pass

    def create_checkout_session(self, user_id: int, tier: SubscriptionTier, db_session: Session = None) -> str:
        """Create a Stripe checkout session for subscription upgrade"""
        if db_session is None:
            db_session = self.db

        self._ensure_stripe_configured()
        price_id = self._get_price_id(tier)

        subscription = (
            db_session.query(Subscription)
            .filter(Subscription.user_id == user_id)
            .first()
        )
        if not subscription:
            subscription = self.create_subscription(user_id, SubscriptionTier.freemium)

        user = db_session.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found")

        if not subscription.stripe_customer_id:
            customer = stripe.Customer.create(email=user.email)
            subscription.stripe_customer_id = customer.id
            db_session.commit()

        app_url = os.getenv("APP_URL", "https://app.duespark.local")
        session = stripe.checkout.Session.create(
            customer=subscription.stripe_customer_id,
            mode="subscription",
            success_url=f"{app_url}/billing/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{app_url}/billing/cancel",
            line_items=[{"price": price_id, "quantity": 1}],
        )

        return session.url

    def create_billing_portal_session(self, user_id: int, db_session: Session = None) -> str:
        """Create a Stripe billing portal session"""
        if db_session is None:
            db_session = self.db

        self._ensure_stripe_configured()

        subscription = (
            db_session.query(Subscription)
            .filter(Subscription.user_id == user_id)
            .first()
        )
        if not subscription or not subscription.stripe_customer_id:
            raise ValueError("Stripe customer not linked")

        app_url = os.getenv("APP_URL", "https://app.duespark.local")
        session = stripe.billing_portal.Session.create(
            customer=subscription.stripe_customer_id,
            return_url=f"{app_url}/settings/subscription",
        )

        return session.url

    def pause_subscription(self, user_id: int, db_session: Session = None) -> bool:
        """Pause a user's subscription"""
        if db_session is None:
            db_session = self.db

        subscription = db_session.query(Subscription).filter(Subscription.user_id == user_id).first()
        if subscription:
            subscription.is_paused = True
            if hasattr(subscription, "pause_resumes_at"):
                subscription.pause_resumes_at = None
            db_session.commit()
            return True
        return False

    def resume_subscription(self, user_id: int, db_session: Session = None) -> bool:
        """Resume a user's paused subscription"""
        if db_session is None:
            db_session = self.db

        subscription = db_session.query(Subscription).filter(Subscription.user_id == user_id).first()
        if subscription:
            subscription.is_paused = False
            if hasattr(subscription, "pause_resumes_at"):
                subscription.pause_resumes_at = None
            db_session.commit()
            return True
        return False


# Dependency injection
def get_subscription_gate(db: Session = Depends(get_db)) -> SubscriptionGate:
    """Dependency to get subscription gating service"""
    return SubscriptionGate(db)


def get_subscription_service(db: Session = Depends(get_db)) -> SubscriptionService:
    """Dependency to get subscription service"""
    return SubscriptionService(db)


# Create a service factory for tests - tests should create their own instance with their db session
def create_subscription_service(db: Session) -> SubscriptionService:
    """Factory function to create subscription service for tests"""
    return SubscriptionService(db)
