import os
import stripe
import json
from datetime import datetime
from fastapi import APIRouter, Request, HTTPException, status, Depends
from sqlalchemy.orm import Session

from .database import get_db
from .models import Subscription, BillingEvent, SubscriptionTier, SubscriptionStatus

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])


def get_subscription_tier_from_price_id(price_id: str) -> SubscriptionTier:
    price_mapping = {
        os.getenv("STRIPE_PROFESSIONAL_PRICE_ID"): SubscriptionTier.professional,
        os.getenv("STRIPE_AGENCY_PRICE_ID"): SubscriptionTier.agency,
    }
    return price_mapping.get(price_id, SubscriptionTier.freemium)


def handle_subscription_created(event_data: dict, db: Session):
    subscription_data = event_data['object']
    customer_id = subscription_data['customer']
    subscription_id = subscription_data['id']
    price_id = subscription_data['items']['data'][0]['price']['id']

    subscription = db.query(Subscription).filter(
        Subscription.stripe_customer_id == customer_id
    ).first()

    if subscription:
        subscription.stripe_subscription_id = subscription_id
        subscription.stripe_price_id = price_id
        subscription.tier = get_subscription_tier_from_price_id(price_id)
        subscription.status = SubscriptionStatus.active
        subscription.current_period_start = datetime.fromtimestamp(subscription_data['current_period_start'])
        subscription.current_period_end = datetime.fromtimestamp(subscription_data['current_period_end'])
        subscription.cancel_at_period_end = subscription_data.get('cancel_at_period_end', False)

        if subscription_data.get('trial_start'):
            subscription.trial_start = datetime.fromtimestamp(subscription_data['trial_start'])
        if subscription_data.get('trial_end'):
            subscription.trial_end = datetime.fromtimestamp(subscription_data['trial_end'])

        db.commit()


def handle_subscription_updated(event_data: dict, db: Session):
    subscription_data = event_data['object']
    stripe_subscription_id = subscription_data['id']

    subscription = db.query(Subscription).filter(
        Subscription.stripe_subscription_id == stripe_subscription_id
    ).first()

    if subscription:
        price_id = subscription_data['items']['data'][0]['price']['id']
        subscription.stripe_price_id = price_id
        subscription.tier = get_subscription_tier_from_price_id(price_id)
        subscription.status = SubscriptionStatus(subscription_data['status'])
        subscription.current_period_start = datetime.fromtimestamp(subscription_data['current_period_start'])
        subscription.current_period_end = datetime.fromtimestamp(subscription_data['current_period_end'])
        subscription.cancel_at_period_end = subscription_data.get('cancel_at_period_end', False)

        if subscription_data.get('canceled_at'):
            subscription.canceled_at = datetime.fromtimestamp(subscription_data['canceled_at'])
        if subscription_data.get('ended_at'):
            subscription.ended_at = datetime.fromtimestamp(subscription_data['ended_at'])

        # Handle discount/coupon
        discount = subscription_data.get('discount')
        if discount:
            subscription.coupon_id = discount['coupon']['id']
            if discount['end']:
                subscription.discount_end = datetime.fromtimestamp(discount['end'])
        else:
            subscription.coupon_id = None
            subscription.discount_end = None

        db.commit()


def handle_subscription_deleted(event_data: dict, db: Session):
    subscription_data = event_data['object']
    stripe_subscription_id = subscription_data['id']

    subscription = db.query(Subscription).filter(
        Subscription.stripe_subscription_id == stripe_subscription_id
    ).first()

    if subscription:
        subscription.status = SubscriptionStatus.canceled
        subscription.ended_at = datetime.fromtimestamp(subscription_data.get('ended_at', int(datetime.utcnow().timestamp())))
        db.commit()

        # Check if we should revoke referral reward due to early cancellation
        from .referral_service import referral_service
        # If subscription hasn't been active for 30 days since first payment, revoke any referral reward
        if subscription.first_payment_at:
            days_since_first_payment = (datetime.utcnow() - subscription.first_payment_at).days
            if days_since_first_payment < 30:
                referral_service.revoke_referral_reward(subscription.user_id, "Subscription canceled within 30 days of first payment", db)


def handle_invoice_payment_succeeded(event_data: dict, db: Session):
    invoice_data = event_data['object']
    subscription_id = invoice_data.get('subscription')

    if subscription_id:
        subscription = db.query(Subscription).filter(
            Subscription.stripe_subscription_id == subscription_id
        ).first()

        if subscription:
            # Update subscription status if it was past due
            if subscription.status == SubscriptionStatus.past_due:
                subscription.status = SubscriptionStatus.active

            # Check if this is the first successful payment
            is_first_payment = (
                subscription.first_payment_at is None and
                subscription.tier != SubscriptionTier.freemium and
                invoice_data.get('amount_paid', 0) > 0
            )

            if is_first_payment:
                # Mark the first payment timestamp
                subscription.first_payment_at = datetime.utcnow()

                # Process any pending referral rewards
                from .referral_service import referral_service
                referral_service.check_and_grant_referral_reward(subscription.user_id, db)

            db.commit()


def handle_invoice_payment_failed(event_data: dict, db: Session):
    invoice_data = event_data['object']
    subscription_id = invoice_data.get('subscription')

    if subscription_id:
        subscription = db.query(Subscription).filter(
            Subscription.stripe_subscription_id == subscription_id
        ).first()

        if subscription:
            subscription.status = SubscriptionStatus.past_due
            db.commit()


def handle_checkout_session_completed(event_data: dict, db: Session):
    session_data = event_data['object']
    customer_id = session_data.get('customer')
    user_id = session_data.get('metadata', {}).get('user_id')

    if customer_id and user_id:
        subscription = db.query(Subscription).filter(
            Subscription.user_id == int(user_id)
        ).first()

        if subscription and not subscription.stripe_customer_id:
            subscription.stripe_customer_id = customer_id
            db.commit()


@router.post("/stripe")
async def stripe_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    payload = await request.body()
    sig_header = request.headers.get('stripe-signature')
    endpoint_secret = os.getenv('STRIPE_WEBHOOK_SECRET')

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, endpoint_secret
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Check if we've already processed this event
    existing_event = db.query(BillingEvent).filter(
        BillingEvent.stripe_event_id == event['id']
    ).first()

    if existing_event and existing_event.processed:
        return {"status": "already processed"}

    # Create or update billing event record
    if not existing_event:
        billing_event = BillingEvent(
            stripe_event_id=event['id'],
            event_type=event['type'],
            processed=False,
            raw_data=json.dumps(event),
        )
        db.add(billing_event)
        db.commit()
    else:
        billing_event = existing_event

    try:
        # Process the event
        if event['type'] == 'customer.subscription.created':
            handle_subscription_created(event['data'], db)
        elif event['type'] == 'customer.subscription.updated':
            handle_subscription_updated(event['data'], db)
        elif event['type'] == 'customer.subscription.deleted':
            handle_subscription_deleted(event['data'], db)
        elif event['type'] == 'invoice.payment_succeeded':
            handle_invoice_payment_succeeded(event['data'], db)
        elif event['type'] == 'invoice.payment_failed':
            handle_invoice_payment_failed(event['data'], db)
        elif event['type'] == 'checkout.session.completed':
            handle_checkout_session_completed(event['data'], db)

        # Mark event as processed
        billing_event.processed = True
        billing_event.processed_at = datetime.utcnow()
        db.commit()

        return {"status": "success"}

    except Exception as e:
        # Mark event as failed
        billing_event.error_message = str(e)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Webhook processing failed: {str(e)}"
        )