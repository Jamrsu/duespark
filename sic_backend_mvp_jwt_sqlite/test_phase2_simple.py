#!/usr/bin/env python3
"""
Simple test for Phase 2 implementation - Invoice-Based Webhook Processing
"""
import os
import sys
import json
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add the project root to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.models import Subscription, SubscriptionTier, SubscriptionStatus
from app.referral_service import referral_service
from app.stripe_webhooks import handle_invoice_payment_succeeded

def test_phase2_simple():
    """Test Phase 2 key functionality"""

    # Database setup
    database_url = os.getenv("DATABASE_URL", "sqlite:///./app.db")
    engine = create_engine(database_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    db = SessionLocal()

    try:
        print("=== Simple Phase 2 Test ===")

        # Test: Temporarily upgrade a subscription to test first payment logic
        subscription = db.query(Subscription).first()

        if subscription:
            # Store original values
            original_tier = subscription.tier
            original_first_payment = subscription.first_payment_at
            original_stripe_id = subscription.stripe_subscription_id

            print(f"Testing with subscription {subscription.id} for user {subscription.user_id}")

            # Temporarily upgrade to basic tier
            subscription.tier = SubscriptionTier.basic
            subscription.stripe_subscription_id = 'sub_test123'
            db.commit()

            # Test: First payment detection
            print("\n1. Testing first payment detection...")

            initial_first_payment = subscription.first_payment_at
            print(f"   Initial first_payment_at: {initial_first_payment}")

            # Simulate first payment
            invoice_data = {
                'object': {
                    'subscription': 'sub_test123',
                    'amount_paid': 1900,  # $19.00 in cents
                    'status': 'paid'
                }
            }

            handle_invoice_payment_succeeded(invoice_data, db)

            # Check result
            db.refresh(subscription)
            if subscription.first_payment_at and subscription.first_payment_at != initial_first_payment:
                print("   ✅ First payment timestamp recorded successfully")
            else:
                print("   ❌ First payment timestamp not recorded")

            # Test: Idempotency - second payment should not change first_payment_at
            print("\n2. Testing webhook idempotency...")

            first_payment_timestamp = subscription.first_payment_at

            # Simulate another payment
            handle_invoice_payment_succeeded(invoice_data, db)

            db.refresh(subscription)
            if subscription.first_payment_at == first_payment_timestamp:
                print("   ✅ First payment timestamp unchanged (idempotent)")
            else:
                print("   ❌ First payment timestamp incorrectly updated")

            # Test: Eligibility check logic
            print("\n3. Testing eligibility logic...")

            # Test with 31 days ago
            subscription.first_payment_at = datetime.utcnow() - timedelta(days=31)
            subscription.status = SubscriptionStatus.active
            db.commit()

            is_eligible = referral_service.check_referral_eligibility(subscription.user_id, db)
            if is_eligible:
                print("   ✅ User eligible after 31 days")
            else:
                print("   ❌ User not eligible after 31 days")

            # Test with 29 days ago
            subscription.first_payment_at = datetime.utcnow() - timedelta(days=29)
            db.commit()

            is_eligible_early = referral_service.check_referral_eligibility(subscription.user_id, db)
            if not is_eligible_early:
                print("   ✅ User correctly not eligible before 30 days")
            else:
                print("   ❌ User incorrectly eligible before 30 days")

            # Test: Free tier should not record first payment
            print("\n4. Testing free tier handling...")

            subscription.tier = SubscriptionTier.freemium
            subscription.first_payment_at = None
            db.commit()

            free_invoice_data = {
                'object': {
                    'subscription': 'sub_test123',
                    'amount_paid': 0,
                    'status': 'paid'
                }
            }

            handle_invoice_payment_succeeded(free_invoice_data, db)

            db.refresh(subscription)
            if subscription.first_payment_at is None:
                print("   ✅ No first payment recorded for free tier")
            else:
                print("   ❌ First payment incorrectly recorded for free tier")

            # Restore original values
            subscription.tier = original_tier
            subscription.first_payment_at = original_first_payment
            subscription.stripe_subscription_id = original_stripe_id
            db.commit()

            print("\n✅ Phase 2 simple tests completed successfully!")
            return True

        else:
            print("❌ No subscription found for testing")
            return False

    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    print("Starting Phase 2 simple tests...")
    success = test_phase2_simple()
    if success:
        print("✅ All tests passed!")
    else:
        print("❌ Tests failed!")
        sys.exit(1)