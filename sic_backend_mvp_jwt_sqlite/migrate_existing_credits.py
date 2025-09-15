#!/usr/bin/env python3
"""
Migration script to populate dollar amounts for existing subscription credits.
This ensures backward compatibility by calculating dollar values from existing month-based credits.
"""
import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add the project root to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.models import SubscriptionCredit, Subscription, SubscriptionTier
from app.pricing_service import pricing_service

def migrate_existing_credits():
    """Populate dollar amounts for existing credits that don't have them."""

    # Database setup
    database_url = os.getenv("DATABASE_URL", "sqlite:///./app.db")
    engine = create_engine(database_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    db = SessionLocal()

    try:
        # Find credits without dollar amounts (amount_cents = 0)
        credits_to_update = db.query(SubscriptionCredit).filter(
            SubscriptionCredit.amount_cents == 0
        ).all()

        print(f"Found {len(credits_to_update)} credits to update with dollar amounts")

        for credit in credits_to_update:
            # Get the user's subscription to determine their tier at credit time
            subscription = db.query(Subscription).filter(
                Subscription.user_id == credit.user_id
            ).first()

            # Default to basic tier if no subscription found (conservative approach)
            user_tier = subscription.tier if subscription else SubscriptionTier.basic

            # Calculate dollar amount based on credit months and user tier
            credit_amount_cents = pricing_service.months_to_cents(credit.credit_months, user_tier)
            remaining_amount_cents = pricing_service.months_to_cents(credit.remaining_months, user_tier)

            # Update the credit
            credit.amount_cents = credit_amount_cents
            credit.remaining_amount_cents = remaining_amount_cents
            credit.currency = 'USD'

            print(f"Updated credit ID {credit.id}: {credit.credit_months} months -> ${credit_amount_cents/100:.2f}")

        # Commit changes
        db.commit()
        print(f"Successfully updated {len(credits_to_update)} credits")

    except Exception as e:
        db.rollback()
        print(f"Error during migration: {e}")
        return False
    finally:
        db.close()

    return True

if __name__ == "__main__":
    print("Starting migration of existing credits...")
    success = migrate_existing_credits()
    if success:
        print("Migration completed successfully!")
    else:
        print("Migration failed!")
        sys.exit(1)