from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .auth import get_current_user
from .database import get_db
from .models import SubscriptionTier, User
from .subscription_service import (
    SubscriptionGate,
    SubscriptionService,
    get_subscription_gate,
    get_subscription_service,
)

router = APIRouter(prefix="/api/subscription", tags=["subscription"])
# Legacy router keeps backward-compatible endpoints for deployments without the /api prefix
legacy_router = APIRouter(prefix="/subscription", tags=["subscription"])


class UpgradePlanRequest(BaseModel):
    tier: SubscriptionTier


class ApplyCouponRequest(BaseModel):
    coupon_id: str


class SubscriptionResponse(BaseModel):
    tier: str
    status: str
    reminders_per_month: int
    reminders_sent_this_period: int
    current_period_end: Optional[str]
    stripe_customer_id: Optional[str]
    paused: bool
    cancel_at_period_end: bool


@router.get("/info")
async def get_subscription_info(
    current_user: User = Depends(get_current_user),
    gate: SubscriptionGate = Depends(get_subscription_gate),
):
    try:
        # Use our new Phase 3 subscription service
        subscription = gate.get_user_subscription(current_user)

        response_data = SubscriptionResponse(
            tier=subscription.tier.value,
            status=subscription.status,
            reminders_per_month=10000,  # Phase 3: No hard limits initially
            reminders_sent_this_period=0,  # Phase 3: Can be tracked later
            current_period_end=(
                subscription.current_period_end.isoformat()
                if subscription.current_period_end
                else None
            ),
            stripe_customer_id=subscription.stripe_customer_id,
            paused=False,  # Phase 3: Pause functionality can be added later
            cancel_at_period_end=False,
        )

        return {"data": response_data.model_dump(), "meta": {}}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get subscription info: {str(e)}",
        )


@router.post("/upgrade")
async def upgrade_subscription(
    request: UpgradePlanRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        import os

        # Check if Stripe is properly configured
        stripe_key = os.getenv("STRIPE_SECRET_KEY")
        if not stripe_key or stripe_key == "sk_test_demo_subscription_billing_key_here":
            return {
                "data": {
                    "message": "Stripe is not configured. This is a demo environment - upgrade functionality requires real Stripe credentials."
                },
                "meta": {"demo_mode": True},
            }

        service = get_subscription_service(db)
        try:
            checkout_url = service.create_checkout_session(
                current_user.id, request.tier, db
            )
        except Exception as upgrade_error:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unable to create checkout session: {upgrade_error}",
            )

        return {
            "checkout_url": checkout_url,
            "tier": request.tier.value,
        }
    except Exception as e:
        import traceback

        print(f"Upgrade error: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create checkout session: {str(e)}",
        )


@router.post("/billing-portal")
async def create_billing_portal_session(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    try:
        service = get_subscription_service(db)
        try:
            portal_url = service.create_billing_portal_session(current_user.id, db)
        except Exception as portal_error:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unable to create billing portal session: {portal_error}",
            )

        return {"portal_url": portal_url}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create billing portal session: {str(e)}",
        )


@router.post("/apply-coupon")
async def apply_coupon(
    request: ApplyCouponRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        # Phase 3: Placeholder for coupon functionality
        success = True  # Demo mode

        if success:
            return {"data": {"message": "Coupon applied successfully"}, "meta": {}}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to apply coupon"
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to apply coupon: {str(e)}",
        )


@router.post("/pause")
async def pause_subscription(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    try:
        service = get_subscription_service(db)
        if service.pause_subscription(current_user.id, db):
            return {"message": "Subscription paused successfully"}

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to pause subscription",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to pause subscription: {str(e)}",
        )


@router.post("/resume")
async def resume_subscription(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    try:
        service = get_subscription_service(db)
        if service.resume_subscription(current_user.id, db):
            return {"message": "Subscription resumed successfully"}

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to resume subscription",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to resume subscription: {str(e)}",
        )



# Expose legacy routes without the "/api" prefix for existing deployments.
legacy_router.add_api_route("/info", get_subscription_info, methods=["GET"])
legacy_router.add_api_route("/upgrade", upgrade_subscription, methods=["POST"])
legacy_router.add_api_route(
    "/billing-portal", create_billing_portal_session, methods=["POST"]
)
legacy_router.add_api_route("/apply-coupon", apply_coupon, methods=["POST"])
legacy_router.add_api_route("/pause", pause_subscription, methods=["POST"])
legacy_router.add_api_route("/resume", resume_subscription, methods=["POST"])

@router.get("/billing-preview/{tier}")
async def get_billing_preview(
    tier: SubscriptionTier,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a preview of billing costs with credits applied"""
    try:
        # Phase 3: Use new pricing service for billing preview
        from app.subscription_service import SubscriptionLimits

        price_cents = SubscriptionLimits.TIER_PRICES[tier]
        preview = {
            "tier": tier.value,
            "price_cents": price_cents,
            "price_display": f"${price_cents/100:.0f}" if price_cents > 0 else "Free",
            "features_included": SubscriptionLimits.TIER_LIMITS[tier],
        }
        return {"data": preview, "meta": {}}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get billing preview: {str(e)}",
        )


# Phase 3: Advanced Feature Gating and Usage Tracking


@router.get("/usage")
async def get_usage_summary(
    current_user: User = Depends(get_current_user),
    gate: SubscriptionGate = Depends(get_subscription_gate),
):
    """Get comprehensive usage summary for the current user"""
    try:
        usage_data = gate.get_usage_summary(current_user)
        return {"data": usage_data, "meta": {}}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get usage summary: {str(e)}",
        )


@router.get("/tiers")
async def get_tier_comparison(
    service: SubscriptionService = Depends(get_subscription_service),
):
    """Get comparison of all subscription tiers (public endpoint)"""
    try:
        comparison = service.get_tier_comparison()
        return {"data": comparison, "meta": {}}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get tier comparison: {str(e)}",
        )


@router.post("/upgrade-tier/{tier}")
async def upgrade_subscription_tier(
    tier: SubscriptionTier,
    current_user: User = Depends(get_current_user),
    service: SubscriptionService = Depends(get_subscription_service),
):
    """Upgrade user's subscription to a new tier (direct upgrade)"""
    try:
        subscription = service.upgrade_subscription(current_user, tier)
        return {
            "data": {
                "message": f"Successfully upgraded to {tier.value} tier",
                "subscription": {
                    "tier": subscription.tier.value,
                    "price_cents": subscription.price_cents,
                    "status": subscription.status,
                    "updated_at": subscription.updated_at.isoformat(),
                },
            },
            "meta": {},
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upgrade subscription: {str(e)}",
        )


@router.get("/limits/check")
async def check_limits(
    current_user: User = Depends(get_current_user),
    gate: SubscriptionGate = Depends(get_subscription_gate),
):
    """Check current usage limits for clients and invoices"""
    try:
        can_create_clients, client_count, client_limit = gate.check_client_limit(
            current_user
        )
        can_create_invoices, invoice_count, invoice_limit = gate.check_invoice_limit(
            current_user
        )

        return {
            "data": {
                "clients": {
                    "can_create": can_create_clients,
                    "current": client_count,
                    "limit": client_limit,
                    "usage_percent": (
                        (client_count / client_limit * 100) if client_limit > 0 else 0
                    ),
                },
                "invoices": {
                    "can_create": can_create_invoices,
                    "current": invoice_count,
                    "limit": invoice_limit,
                    "usage_percent": (
                        (invoice_count / invoice_limit * 100)
                        if invoice_limit > 0
                        else 0
                    ),
                },
            },
            "meta": {},
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check limits: {str(e)}",
        )


@router.get("/features/{feature}/check")
async def check_feature_access(
    feature: str,
    current_user: User = Depends(get_current_user),
    gate: SubscriptionGate = Depends(get_subscription_gate),
):
    """Check if user has access to a specific feature"""
    try:
        has_access = gate.check_feature_access(current_user, feature)
        tier = gate.get_user_tier(current_user)

        return {
            "data": {
                "feature": feature,
                "has_access": has_access,
                "current_tier": tier.value,
                "required_upgrade": None if has_access else "professional",
            },
            "meta": {},
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check feature access: {str(e)}",
        )


@router.get("/suggestions")
async def get_upgrade_suggestions(
    current_user: User = Depends(get_current_user),
    gate: SubscriptionGate = Depends(get_subscription_gate),
):
    """Get personalized upgrade suggestions based on usage patterns"""
    try:
        suggestions = gate.get_upgrade_suggestions(current_user)
        return {
            "data": {
                "suggestions": suggestions,
                "current_tier": gate.get_user_tier(current_user).value,
            },
            "meta": {},
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get upgrade suggestions: {str(e)}",
        )


@router.get("/status")
async def get_subscription_status(
    current_user: User = Depends(get_current_user),
    gate: SubscriptionGate = Depends(get_subscription_gate),
):
    """Get current subscription status and basic info"""
    try:
        subscription = gate.get_user_subscription(current_user)
        return {
            "data": {
                "tier": subscription.tier.value,
                "status": subscription.status,
                "price_cents": subscription.price_cents,
                "created_at": subscription.created_at.isoformat(),
                "updated_at": (
                    subscription.updated_at.isoformat()
                    if subscription.updated_at
                    else None
                ),
                "stripe_subscription_id": subscription.stripe_subscription_id,
            },
            "meta": {},
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get subscription status: {str(e)}",
        )
