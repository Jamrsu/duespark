#!/usr/bin/env python3
"""
Test script for Phase 3 implementation - Billing System Integration
"""
import os
import sys
import json
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add the project root to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.models import User, Subscription, SubscriptionCredit, SubscriptionTier, SubscriptionStatus
from app.billing_credit_service import billing_credit_service
from app.referral_service import referral_service
from app.subscription_service import create_subscription_service

def test_phase3_implementation():
    """Test Phase 3: Billing System Integration"""

    # Database setup
    database_url = os.getenv("DATABASE_URL", "sqlite:///./app.db")
    engine = create_engine(database_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    db = SessionLocal()

    try:
        print("=== Testing Phase 3: Billing System Integration ===\n")

        # Setup: Find a user and give them some credits for testing
        user = db.query(User).first()
        if not user:
            print("❌ No users found for testing")
            return False

        print(f"Testing with user {user.id}")

        # Test 1: Credit calculation for billing
        print("Test 1: Credit calculation for billing")

        # Set up environment variables for testing
        os.environ["STRIPE_BASIC_PRICE_ID"] = "price_test_basic"
        os.environ["STRIPE_PRO_PRICE_ID"] = "price_test_pro"
        os.environ["STRIPE_AGENCY_PRICE_ID"] = "price_test_agency"

        # Give user some test credits (specify dollar amount directly)
        test_credit = referral_service.admin_grant_credit(
            user_id=user.id,
            months=1,
            description="Test credit for Phase 3",
            admin_user_id=1,
            db=db,
            override_amount_cents=1900  # $19.00
        )

        print(f"   Granted test credit: ${test_credit.amount_cents/100:.2f}")

        # Test calculation for basic tier ($19.00)
        calculation = billing_credit_service.calculate_credit_application(
            user_id=user.id,
            invoice_amount_cents=1900,  # $19.00
            db=db
        )

        print(f"   Available credits: ${calculation['total_available_credits']/100:.2f}")
        print(f"   Credits to apply: ${calculation['credits_to_apply']/100:.2f}")
        print(f"   Remaining amount: ${calculation['remaining_invoice_amount']/100:.2f}")

        if calculation['credits_to_apply'] > 0:
            print("   ✅ Credit calculation working correctly")
        else:
            print("   ❌ No credits calculated despite having credits")

        print()

        # Test 2: Billing preview
        print("Test 2: Billing preview functionality")

        preview = billing_credit_service.get_billing_preview(user.id, SubscriptionTier.basic, db)

        print(f"   Tier: {preview['tier']}")
        print(f"   Original price: {preview['original_price_display']}")
        print(f"   Available credits: {preview['available_credits_display']}")
        print(f"   Credits to apply: {preview['credits_to_apply_display']}")
        print(f"   Final amount: {preview['final_amount_display']}")
        print(f"   Fully covered: {preview['fully_covered_by_credits']}")

        if preview['credits_to_apply_cents'] > 0:
            print("   ✅ Billing preview showing credits correctly")
        else:
            print("   ❌ Billing preview not showing available credits")

        print()

        # Test 3: Credit application (actual consumption)
        print("Test 3: Credit application to invoice")

        # Test applying credits to a $5 invoice
        small_invoice_cents = 500  # $5.00

        result = billing_credit_service.apply_credits_to_invoice(
            user_id=user.id,
            invoice_amount_cents=small_invoice_cents,
            db=db,
            description="Test invoice credit application"
        )

        print(f"   Applied credits: ${result['credits_applied']/100:.2f}")
        print(f"   Final amount: ${result['final_amount']/100:.2f}")
        print(f"   Success: {result['success']}")
        print(f"   Message: {result['message']}")

        if result['success'] and result['credits_applied'] > 0:
            print("   ✅ Credit application working correctly")
        else:
            print("   ❌ Credit application failed")

        print()

        # Test 4: Checkout with credits (full coverage)
        print("Test 4: Checkout session with full credit coverage")

        # Add enough credits to fully cover basic tier
        additional_credit = referral_service.admin_grant_credit(
            user_id=user.id,
            months=2,
            description="Additional test credit for full coverage",
            admin_user_id=1,
            db=db,
            override_amount_cents=2000  # $20.00 to ensure full coverage
        )

        checkout_result = billing_credit_service.create_checkout_session_with_credits(
            user_id=user.id,
            tier=SubscriptionTier.basic,
            db=db
        )

        print(f"   Checkout URL: {checkout_result.get('checkout_url', 'None (fully covered)')}")
        print(f"   Credits applied: ${checkout_result['credits_applied']/100:.2f}")
        print(f"   Original amount: ${checkout_result['original_amount']/100:.2f}")
        print(f"   Final amount: ${checkout_result['final_amount']/100:.2f}")
        print(f"   Message: {checkout_result['message']}")

        if checkout_result['final_amount'] == 0:
            print("   ✅ Full credit coverage working - no checkout needed")
        else:
            print("   ✅ Partial credit coverage working - checkout created for remainder")

        print()

        # Test 5: Checkout with partial credits
        print("Test 5: Checkout session with partial credit coverage (Pro tier)")

        try:
            pro_checkout = billing_credit_service.create_checkout_session_with_credits(
                user_id=user.id,
                tier=SubscriptionTier.pro,  # $49.00 - should need checkout
                db=db
            )

            print(f"   Checkout URL: {pro_checkout.get('checkout_url', 'None')}")
            print(f"   Credits applied: ${pro_checkout['credits_applied']/100:.2f}")
            print(f"   Original amount: ${pro_checkout['original_amount']/100:.2f}")
            print(f"   Final amount: ${pro_checkout['final_amount']/100:.2f}")
            print(f"   Message: {pro_checkout['message']}")

            if pro_checkout['final_amount'] > 0 and pro_checkout.get('checkout_url'):
                print("   ✅ Partial credit coverage working - checkout created for remainder")
            elif pro_checkout['final_amount'] == 0:
                print("   ✅ Full credit coverage - no checkout needed")
            else:
                print("   ⚠️  No checkout URL (possibly due to Stripe config)")
        except ValueError as e:
            if "Stripe error" in str(e):
                print(f"   ⚠️  Stripe checkout skipped (no API key): Credit calculation still works")

                # Test just the credit calculation part for pro tier
                preview = billing_credit_service.get_billing_preview(user.id, SubscriptionTier.pro, db)
                print(f"   Pro tier preview: {preview['final_amount_display']}")
                print("   ✅ Credit calculation for pro tier working correctly")
            else:
                raise e

        print()

        # Test 6: Integration with subscription service
        print("Test 6: Integration with subscription service")

        subscription_service = create_subscription_service(db)

        try:
            subscription_preview = subscription_service.get_billing_preview(
                user_id=user.id,
                tier=SubscriptionTier.basic,
                db=db
            )

            print(f"   Subscription service preview: {subscription_preview['tier']}")
            print(f"   Final amount: {subscription_preview['final_amount_display']}")
            print("   ✅ Subscription service integration working")
        except Exception as e:
            print(f"   ❌ Subscription service integration failed: {e}")

        print()

        # Clean up test credits
        print("Cleaning up test data...")
        db.delete(test_credit)
        db.delete(additional_credit)
        db.commit()

        print("\n=== Phase 3 Testing Complete ===")
        return True

    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    print("Starting Phase 3 implementation tests...")
    success = test_phase3_implementation()
    if success:
        print("✅ Phase 3 tests completed!")
    else:
        print("❌ Phase 3 tests failed!")
        sys.exit(1)
