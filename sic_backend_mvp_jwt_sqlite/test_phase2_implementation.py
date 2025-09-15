#!/usr/bin/env python3
"""
Test script for Phase 2 implementation - Invoice-Based Webhook Processing
"""
import os
import sys
import json
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add the project root to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.models import User, Referral, Subscription, SubscriptionTier, SubscriptionStatus
from app.referral_service import referral_service
from app.stripe_webhooks import handle_invoice_payment_succeeded

def test_phase2_implementation():
    """Test Phase 2: Invoice-Based Webhook Processing"""

    # Database setup
    database_url = os.getenv("DATABASE_URL", "sqlite:///./test.db")
    engine = create_engine(database_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    db = SessionLocal()

    try:
        print("=== Testing Phase 2: Invoice-Based Webhook Processing ===\n")

        # Test 1: First payment detection and referral reward triggering
        print("Test 1: First payment detection and referral reward triggering")

        # Find a user with a subscription but no first_payment_at
        subscription = db.query(Subscription).filter(
            Subscription.first_payment_at == None,
            Subscription.tier != SubscriptionTier.freemium
        ).first()

        if subscription:
            print(f"Found subscription {subscription.id} for user {subscription.user_id} without first payment")

            # Check if this user has a pending referral
            referral = db.query(Referral).filter(
                Referral.referred_user_id == subscription.user_id,
                Referral.reward_granted == False
            ).first()

            if referral:
                print(f"User has pending referral from user {referral.referrer_user_id}")

                # Simulate a successful invoice payment webhook
                invoice_data = {
                    'object': {
                        'subscription': subscription.stripe_subscription_id or 'sub_test123',
                        'amount_paid': 1900,  # $19.00 in cents
                        'status': 'paid'
                    }
                }

                # Make sure the subscription has a stripe_subscription_id for the test
                if not subscription.stripe_subscription_id:
                    subscription.stripe_subscription_id = 'sub_test123'
                    db.commit()

                print("Simulating invoice.payment_succeeded webhook...")
                handle_invoice_payment_succeeded(invoice_data, db)

                # Refresh the subscription and referral
                db.refresh(subscription)
                db.refresh(referral)

                # Check results
                if subscription.first_payment_at:
                    print(f"✅ First payment timestamp recorded: {subscription.first_payment_at}")
                else:
                    print("❌ First payment timestamp not recorded")

                if referral.reward_granted:
                    print("✅ Referral reward granted after first payment")
                else:
                    print("❌ Referral reward NOT granted after first payment")

                # Clean up - rollback to original state
                db.rollback()

            else:
                print("⚠️  No pending referral found for this user")
        else:
            print("⚠️  No suitable subscription found for first payment test")

        print()

        # Test 2: Eligibility check using first_payment_at
        print("Test 2: Referral eligibility based on first_payment_at")

        # Find an existing subscription to modify temporarily
        test_subscription = db.query(Subscription).filter(
            Subscription.tier != SubscriptionTier.freemium,
            Subscription.status == SubscriptionStatus.active
        ).first()

        if test_subscription:
            # Store original values
            original_first_payment = test_subscription.first_payment_at

            # Test with 31 days since first payment
            test_subscription.first_payment_at = datetime.utcnow() - timedelta(days=31)
            db.commit()

            # Test eligibility
            is_eligible = referral_service.check_referral_eligibility(test_subscription.user_id, db)
            if is_eligible:
                print("✅ User eligible for referral reward after 31 days")
            else:
                print("❌ User NOT eligible despite 31 days since first payment")

            # Test with user who paid only 29 days ago
            test_subscription.first_payment_at = datetime.utcnow() - timedelta(days=29)
            db.commit()

            is_eligible_early = referral_service.check_referral_eligibility(test_subscription.user_id, db)
            if not is_eligible_early:
                print("✅ User correctly NOT eligible before 30 days")
            else:
                print("❌ User incorrectly eligible before 30 days")

            # Restore original values
            test_subscription.first_payment_at = original_first_payment
            db.commit()
        else:
            print("⚠️  No suitable subscription found for eligibility test")

        print()

        # Test 3: Webhook idempotency
        print("Test 3: Webhook idempotency (no duplicate rewards)")

        subscription = db.query(Subscription).filter(
            Subscription.first_payment_at != None
        ).first()

        if subscription:
            print(f"Testing idempotency with subscription {subscription.id}")

            # Find any existing referral (could be granted or pending)
            referral = db.query(Referral).filter(
                Referral.referred_user_id == subscription.user_id
            ).first()

            initial_reward_status = referral.reward_granted if referral else None
            initial_first_payment = subscription.first_payment_at

            # Simulate another invoice payment (should not create duplicate rewards)
            invoice_data = {
                'object': {
                    'subscription': subscription.stripe_subscription_id,
                    'amount_paid': 1900,
                    'status': 'paid'
                }
            }

            print("Simulating duplicate invoice.payment_succeeded webhook...")
            handle_invoice_payment_succeeded(invoice_data, db)

            # Refresh objects
            db.refresh(subscription)
            if referral:
                db.refresh(referral)

            # Check that first_payment_at didn't change
            if subscription.first_payment_at == initial_first_payment:
                print("✅ First payment timestamp unchanged (idempotent)")
            else:
                print("❌ First payment timestamp incorrectly updated")

            # Check that referral status didn't change unexpectedly
            if referral:
                if referral.reward_granted == initial_reward_status:
                    print("✅ Referral reward status unchanged (idempotent)")
                else:
                    print("❌ Referral reward status unexpectedly changed")

        print()

        # Test 4: No reward for free tier
        print("Test 4: No referral processing for free tier subscriptions")

        free_subscription = db.query(Subscription).filter(
            Subscription.tier == SubscriptionTier.freemium
        ).first()

        if free_subscription:
            initial_first_payment = free_subscription.first_payment_at

            # Simulate invoice for free tier (should not trigger anything)
            invoice_data = {
                'object': {
                    'subscription': free_subscription.stripe_subscription_id or 'sub_free123',
                    'amount_paid': 0,  # Free tier
                    'status': 'paid'
                }
            }

            if not free_subscription.stripe_subscription_id:
                free_subscription.stripe_subscription_id = 'sub_free123'
                db.commit()

            print("Simulating invoice for free tier...")
            handle_invoice_payment_succeeded(invoice_data, db)

            db.refresh(free_subscription)

            if free_subscription.first_payment_at == initial_first_payment:
                print("✅ No first payment recorded for free tier (correct)")
            else:
                print("❌ First payment incorrectly recorded for free tier")

            # Clean up
            db.rollback()

        print("\n=== Phase 2 Testing Complete ===")

    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

    return True

if __name__ == "__main__":
    print("Starting Phase 2 implementation tests...")
    success = test_phase2_implementation()
    if success:
        print("✅ Phase 2 tests completed!")
    else:
        print("❌ Phase 2 tests failed!")
        sys.exit(1)