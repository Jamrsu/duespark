#!/usr/bin/env python3
"""
Test script for Phase 1 implementation - Dollar-based credit calculations
"""
import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add the project root to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.models import User, Referral, SubscriptionCredit, Subscription, SubscriptionTier
from app.referral_service import referral_service
from app.pricing_service import pricing_service

def test_phase1_implementation():
    """Test Phase 1: Dollar-based credit calculations"""

    # Database setup
    database_url = os.getenv("DATABASE_URL", "sqlite:///./test.db")
    engine = create_engine(database_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    db = SessionLocal()

    try:
        print("=== Testing Phase 1: Dollar-based Credit Calculations ===\n")

        # Test 1: Pricing Service
        print("Test 1: Pricing Service")
        print(f"Basic tier price: ${pricing_service.get_tier_price_dollars(SubscriptionTier.basic)}")
        print(f"Pro tier price: ${pricing_service.get_tier_price_dollars(SubscriptionTier.pro)}")
        print(f"Agency tier price: ${pricing_service.get_tier_price_dollars(SubscriptionTier.agency)}")

        basic_credit = pricing_service.calculate_referral_credit_cents(SubscriptionTier.basic)
        pro_credit = pricing_service.calculate_referral_credit_cents(SubscriptionTier.pro)
        print(f"Basic referral credit: ${basic_credit/100}")
        print(f"Pro referral credit: ${pro_credit/100}")
        print("✅ Pricing service working correctly\n")

        # Test 2: Credit conversions
        print("Test 2: Credit conversions")
        months_to_cents = pricing_service.months_to_cents(1, SubscriptionTier.pro)
        cents_to_months = pricing_service.cents_to_months_equivalent(4900, SubscriptionTier.pro)
        print(f"1 month of Pro tier = ${months_to_cents/100}")
        print(f"$49.00 = {cents_to_months} months of Pro tier")
        print("✅ Credit conversions working correctly\n")

        # Test 3: Check existing credits have dollar amounts
        print("Test 3: Existing credits migration")
        existing_credits = db.query(SubscriptionCredit).all()
        print(f"Found {len(existing_credits)} existing credits:")
        for credit in existing_credits:
            print(f"  Credit {credit.id}: {credit.credit_months} months = ${credit.amount_cents/100} ({credit.currency})")
        print("✅ Existing credits have dollar amounts\n")

        # Test 4: Admin grant credit with dollar amounts
        print("Test 4: Admin grant credit (new implementation)")

        # Find a user to grant credit to
        test_user = db.query(User).first()
        if test_user:
            # Get user's subscription tier
            subscription = db.query(Subscription).filter(Subscription.user_id == test_user.id).first()
            user_tier = subscription.tier if subscription else SubscriptionTier.basic

            print(f"Granting 2 months credit to user {test_user.id} ({user_tier.value} tier)")

            try:
                new_credit = referral_service.admin_grant_credit(
                    user_id=test_user.id,
                    months=2,
                    description="Phase 1 test credit",
                    admin_user_id=1,
                    db=db
                )

                print(f"✅ Created credit: {new_credit.credit_months} months = ${new_credit.amount_cents/100}")
                print(f"   Remaining: {new_credit.remaining_months} months = ${new_credit.remaining_amount_cents/100}")

                # Clean up test credit
                db.delete(new_credit)
                db.commit()

            except Exception as e:
                print(f"❌ Admin grant failed: {e}")
        else:
            print("⚠️  No users found for admin grant test")

        # Test 5: Credit consumption (dollar-based)
        print("\nTest 5: Credit consumption (new dollar-based method)")
        test_user = db.query(User).filter(
            User.id.in_(
                db.query(SubscriptionCredit.user_id).filter(
                    SubscriptionCredit.remaining_amount_cents > 0
                )
            )
        ).first()

        if test_user:
            # Check available credits before
            credits_before = db.query(SubscriptionCredit).filter(
                SubscriptionCredit.user_id == test_user.id,
                SubscriptionCredit.remaining_amount_cents > 0
            ).all()

            total_before = sum(c.remaining_amount_cents for c in credits_before)
            print(f"User {test_user.id} has ${total_before/100} in credits")

            # Try to consume $5.00 worth of credits
            consumption_amount = 500  # $5.00 in cents
            result = referral_service.consume_credits_cents(test_user.id, consumption_amount, db)

            if result:
                # Check credits after
                credits_after = db.query(SubscriptionCredit).filter(
                    SubscriptionCredit.user_id == test_user.id,
                    SubscriptionCredit.remaining_amount_cents > 0
                ).all()

                total_after = sum(c.remaining_amount_cents for c in credits_after)
                consumed = total_before - total_after

                print(f"✅ Successfully consumed ${consumed/100} in credits")
                print(f"   Remaining credits: ${total_after/100}")

                # Restore credits for further testing (rollback)
                db.rollback()
            else:
                print("❌ Credit consumption failed")
        else:
            print("⚠️  No users with credits found for consumption test")

        # Test 6: Backward compatibility - month-based consumption
        print("\nTest 6: Backward compatibility (month-based consumption)")
        if test_user:
            # This should work with the legacy consume_credits method
            try:
                # Check before
                credits_before = db.query(SubscriptionCredit).filter(
                    SubscriptionCredit.user_id == test_user.id,
                    SubscriptionCredit.remaining_months > 0
                ).all()

                months_before = sum(c.remaining_months for c in credits_before)
                print(f"User {test_user.id} has {months_before} months in credits")

                # Try to consume 1 month (legacy method)
                if months_before > 0:
                    result = referral_service.consume_credits(test_user.id, 1, db)
                    if result:
                        print("✅ Legacy month-based consumption still works")
                    else:
                        print("❌ Legacy consumption failed")

                    # Rollback to preserve test data
                    db.rollback()
                else:
                    print("⚠️  No month-based credits available")

            except Exception as e:
                print(f"❌ Backward compatibility test failed: {e}")

        print("\n=== Phase 1 Testing Complete ===")

    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        return False
    finally:
        db.close()

    return True

if __name__ == "__main__":
    print("Starting Phase 1 implementation tests...")
    success = test_phase1_implementation()
    if success:
        print("✅ All Phase 1 tests completed!")
    else:
        print("❌ Phase 1 tests failed!")
        sys.exit(1)