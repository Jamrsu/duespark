import secrets
import string
from datetime import datetime
from typing import Dict, List, Optional, Tuple

from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session

from .models import (
    Referral,
    Subscription,
    SubscriptionCredit,
    SubscriptionStatus,
    SubscriptionTier,
    User,
)


class ReferralService:
    def __init__(self):
        self.code_length = 8
        self.reward_months = 1

    def generate_referral_code(self) -> str:
        """Generate a unique referral code"""
        characters = string.ascii_uppercase + string.digits
        return "".join(secrets.choice(characters) for _ in range(self.code_length))

    def ensure_user_has_referral_code(self, user: User, db: Session) -> str:
        """Ensure user has a unique referral code"""
        if user.referral_code:
            return user.referral_code

        # Generate unique code
        attempts = 0
        max_attempts = 10
        while attempts < max_attempts:
            code = self.generate_referral_code()
            existing = db.query(User).filter(User.referral_code == code).first()
            if not existing:
                user.referral_code = code
                db.commit()
                return code
            attempts += 1

        raise Exception("Unable to generate unique referral code")

    def validate_referral_code(
        self, code: str, referred_user: User, db: Session
    ) -> Tuple[bool, str, Optional[User]]:
        """
        Validate referral code and check for abuse
        Returns: (is_valid, error_message, referrer_user)
        """
        if not code or len(code) != self.code_length:
            return False, "Invalid referral code format", None

        # Find the referrer
        referrer = db.query(User).filter(User.referral_code == code).first()
        if not referrer:
            return False, "Referral code not found", None

        # Check if user is trying to refer themselves
        if referrer.id == referred_user.id:
            return False, "Cannot use your own referral code", None

        # Check if user already used a referral code
        existing_referral = (
            db.query(Referral)
            .filter(Referral.referred_user_id == referred_user.id)
            .first()
        )
        if existing_referral:
            return False, "You have already used a referral code", None

        # Check for potential abuse - same email domain (simple check)
        referrer_domain = referrer.email.split("@")[-1]
        referred_domain = referred_user.email.split("@")[-1]
        if referrer_domain == referred_domain and referrer_domain not in [
            "gmail.com",
            "yahoo.com",
            "hotmail.com",
            "outlook.com",
        ]:
            # Log suspicious activity but don't block (could be legitimate company users)
            pass

        return True, "", referrer

    def create_referral(
        self, referrer: User, referred_user: User, referral_code: str, db: Session
    ) -> Referral:
        """Create a referral record"""
        referral = Referral(
            referrer_user_id=referrer.id,
            referred_user_id=referred_user.id,
            referral_code_used=referral_code,
            reward_granted=False,
            reward_months=self.reward_months,
        )
        db.add(referral)
        db.commit()
        db.refresh(referral)
        return referral

    def grant_referral_reward(self, referral: Referral, db: Session) -> bool:
        """Grant referral reward to referrer based on their current subscription tier"""
        if referral.reward_granted:
            return False

        # Get referrer's current subscription to determine credit amount
        from .pricing_service import pricing_service

        referrer = db.query(User).filter(User.id == referral.referrer_user_id).first()
        if not referrer:
            return False

        # Get referrer's current subscription tier
        subscription = (
            db.query(Subscription).filter(Subscription.user_id == referrer.id).first()
        )
        referrer_tier = subscription.tier if subscription else SubscriptionTier.freemium

        # Calculate credit amount based on referrer's current tier
        credit_amount_cents = pricing_service.calculate_referral_credit_cents(
            referrer_tier
        )

        # Create credit for referrer with both month and dollar amounts
        credit = SubscriptionCredit(
            user_id=referral.referrer_user_id,
            credit_months=referral.reward_months,  # Keep for backward compatibility
            remaining_months=referral.reward_months,  # Keep for backward compatibility
            amount_cents=credit_amount_cents,  # New dollar-based field
            currency="USD",
            remaining_amount_cents=credit_amount_cents,  # New dollar-based field
            source="referral",
            source_id=str(referral.id),
            description=f"Referral reward for inviting user {referral.referred_user_id} (${credit_amount_cents/100:.2f})",
        )
        db.add(credit)

        # Mark referral as rewarded
        referral.reward_granted = True
        referral.rewarded_at = datetime.utcnow()

        db.commit()
        return True

    def get_user_referral_stats(self, user_id: int, db: Session) -> Dict:
        """Get referral statistics for a user"""
        # Get referrals made by this user
        referrals_made = (
            db.query(Referral).filter(Referral.referrer_user_id == user_id).all()
        )

        # Count successful referrals (rewarded)
        successful_referrals = len([r for r in referrals_made if r.reward_granted])

        # Get total credits earned from referrals
        total_credits = (
            db.query(func.sum(SubscriptionCredit.credit_months))
            .filter(
                SubscriptionCredit.user_id == user_id,
                SubscriptionCredit.source == "referral",
            )
            .scalar()
            or 0
        )

        # Get remaining credits
        remaining_credits = (
            db.query(func.sum(SubscriptionCredit.remaining_months))
            .filter(
                SubscriptionCredit.user_id == user_id,
                SubscriptionCredit.source == "referral",
            )
            .scalar()
            or 0
        )

        return {
            "total_referrals": len(referrals_made),
            "successful_referrals": successful_referrals,
            "pending_referrals": len(referrals_made) - successful_referrals,
            "total_credits_earned": total_credits,
            "remaining_credits": remaining_credits,
            "referrals": [
                {
                    "id": r.id,
                    "referred_user_email": self._get_masked_email(
                        r.referred_user.email
                    ),
                    "created_at": r.created_at.isoformat(),
                    "reward_granted": r.reward_granted,
                    "rewarded_at": r.rewarded_at.isoformat() if r.rewarded_at else None,
                    "reward_months": r.reward_months,
                }
                for r in referrals_made
            ],
        }

    def get_user_credits_breakdown(self, user_id: int, db: Session) -> Dict:
        """Get detailed breakdown of user's subscription credits"""
        credits = (
            db.query(SubscriptionCredit)
            .filter(
                SubscriptionCredit.user_id == user_id,
                SubscriptionCredit.remaining_months > 0,
            )
            .order_by(SubscriptionCredit.created_at.desc())
            .all()
        )

        total_remaining = sum(c.remaining_months for c in credits)

        return {
            "total_remaining_months": total_remaining,
            "credits": [
                {
                    "id": c.id,
                    "source": c.source,
                    "description": c.description,
                    "credit_months": c.credit_months,
                    "remaining_months": c.remaining_months,
                    "created_at": c.created_at.isoformat(),
                    "expires_at": c.expires_at.isoformat() if c.expires_at else None,
                }
                for c in credits
            ],
        }

    def consume_credits(
        self, user_id: int, months_to_consume: int, db: Session
    ) -> bool:
        """
        Consume subscription credits for a user (backward compatibility method using months)
        DEPRECATED: Use consume_credits_cents for dollar-based consumption
        """
        from math import ceil
        from .pricing_service import pricing_service

        if months_to_consume <= 0:
            return True

        subscription = (
            db.query(Subscription).filter(Subscription.user_id == user_id).first()
        )
        user_tier = subscription.tier if subscription else SubscriptionTier.freemium

        credits = (
            db.query(SubscriptionCredit)
            .filter(SubscriptionCredit.user_id == user_id)
            .filter(SubscriptionCredit.remaining_months > 0)
            .order_by(SubscriptionCredit.created_at.asc())
            .all()
        )

        remaining_months = months_to_consume
        amount_per_month = pricing_service.get_tier_price_cents(user_tier)
        consumed_records: list[tuple[SubscriptionCredit, int, int]] = []

        for credit in credits:
            if remaining_months <= 0:
                break

            available = credit.remaining_months
            if available <= 0:
                continue

            use_months = min(available, remaining_months)
            remaining_months -= use_months
            credit.remaining_months -= use_months

            amount_used_cents = 0
            if credit.amount_cents and credit.credit_months:
                amount_per_credit_month = credit.amount_cents / credit.credit_months
                amount_used_cents = int(round(amount_per_credit_month * use_months))
                credit.remaining_amount_cents = max(
                    0, credit.remaining_amount_cents - amount_used_cents
                )
            else:
                if amount_per_month > 0:
                    amount_used_cents = pricing_service.months_to_cents(
                        use_months, user_tier
                    )
                credit.remaining_amount_cents = max(
                    0, credit.remaining_amount_cents - amount_used_cents
                )

            credit.updated_at = datetime.utcnow()
            consumed_records.append((credit, use_months, amount_used_cents))

        if remaining_months > 0:
            # Not enough months available; revert changes
            for credit, use_months, amount_used_cents in consumed_records:
                credit.remaining_months += use_months
                credit.remaining_amount_cents += amount_used_cents
            db.rollback()
            return False

        db.commit()
        return True

    def consume_credits_cents(
        self, user_id: int, amount_cents: int, db: Session
    ) -> bool:
        """Consume subscription credits for a user (dollar-based)"""
        if amount_cents <= 0:
            return True

        from math import ceil
        from .pricing_service import pricing_service

        subscription = (
            db.query(Subscription).filter(Subscription.user_id == user_id).first()
        )
        user_tier = subscription.tier if subscription else SubscriptionTier.freemium

        months_equivalent = pricing_service.cents_to_months_equivalent(
            amount_cents, user_tier
        )
        months_needed = max(1, int(ceil(months_equivalent)))
        return self.consume_credits(user_id, months_needed, db)

    def admin_grant_credit(
        self,
        user_id: int,
        months: int,
        description: str,
        admin_user_id: int,
        db: Session,
        override_amount_cents: int = None,
    ) -> SubscriptionCredit:
        """Admin function to grant credits to a user"""
        from .pricing_service import pricing_service

        # Get user's current subscription to determine credit value
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError(f"User with id {user_id} not found")

        # Get user's current subscription tier to calculate dollar amount
        subscription = (
            db.query(Subscription).filter(Subscription.user_id == user_id).first()
        )
        user_tier = subscription.tier if subscription else SubscriptionTier.freemium

        # Calculate dollar amount based on user's current tier or override
        if override_amount_cents is not None:
            credit_amount_cents = override_amount_cents
        else:
            credit_amount_cents = pricing_service.months_to_cents(months, user_tier)

        credit = SubscriptionCredit(
            user_id=user_id,
            credit_months=months,  # Keep for backward compatibility
            remaining_months=months,  # Keep for backward compatibility
            amount_cents=credit_amount_cents,  # New dollar-based field
            currency="USD",
            remaining_amount_cents=credit_amount_cents,  # New dollar-based field
            source="admin_grant",
            source_id=str(admin_user_id),
            description=f"{description} (${credit_amount_cents/100:.2f})",
        )
        db.add(credit)
        db.commit()
        db.refresh(credit)
        return credit

    def check_referral_eligibility(self, user_id: int, db: Session) -> bool:
        """
        Check if a user is eligible for referral reward (after 1 month of paid subscription)
        """
        # Get user's subscription
        subscription = (
            db.query(Subscription).filter(Subscription.user_id == user_id).first()
        )
        if not subscription:
            return False

        # Must be on a paid plan (not free)
        if subscription.tier == SubscriptionTier.freemium:
            return False

        # Must be active (not canceled, past_due, etc.)
        if subscription.status != SubscriptionStatus.active:
            return False

        # Must have first_payment_at (indicates they've had at least one successful payment)
        if not subscription.first_payment_at:
            return False

        # Check if they've maintained paid subscription for at least 30 days since first payment
        days_since_first_payment = (
            datetime.utcnow() - subscription.first_payment_at
        ).days
        if days_since_first_payment < 30:
            return False

        return True

    def process_pending_referral_rewards(self, db: Session) -> int:
        """
        Process all pending referral rewards for users who have maintained paid subscriptions for 1+ months
        Returns the number of rewards granted
        """
        # Get all pending referrals
        pending_referrals = (
            db.query(Referral).filter(Referral.reward_granted == False).all()
        )

        rewards_granted = 0

        for referral in pending_referrals:
            # Check if the referred user is eligible for reward
            if self.check_referral_eligibility(referral.referred_user_id, db):
                # Grant the reward
                if self.grant_referral_reward(referral, db):
                    rewards_granted += 1

        return rewards_granted

    def check_and_grant_referral_reward(self, user_id: int, db: Session) -> bool:
        """
        Check if a specific user's referral should be rewarded and grant it
        Called when a user's subscription status changes
        """
        # Find any pending referral for this user
        referral = (
            db.query(Referral)
            .filter(
                Referral.referred_user_id == user_id, Referral.reward_granted == False
            )
            .first()
        )

        if not referral:
            return False

        # Check eligibility
        if self.check_referral_eligibility(user_id, db):
            return self.grant_referral_reward(referral, db)

        return False

    def revoke_referral_reward(self, user_id: int, reason: str, db: Session) -> bool:
        """
        Revoke referral reward (e.g., due to refund or cancellation within 30 days)
        """
        # Find the referral
        referral = (
            db.query(Referral)
            .filter(
                Referral.referred_user_id == user_id, Referral.reward_granted == True
            )
            .first()
        )

        if not referral:
            return False

        # Find and deactivate the credit
        credit = (
            db.query(SubscriptionCredit)
            .filter(
                SubscriptionCredit.user_id == referral.referrer_user_id,
                SubscriptionCredit.source == "referral",
                SubscriptionCredit.source_id == str(referral.id),
            )
            .first()
        )

        if credit:
            # Mark credit as revoked by setting remaining months to 0
            credit.remaining_months = 0
            credit.description += f" (REVOKED: {reason})"
            credit.updated_at = datetime.utcnow()

        # Mark referral as not rewarded
        referral.reward_granted = False
        referral.rewarded_at = None

        db.commit()
        return True

    def _get_masked_email(self, email: str) -> str:
        """Mask email for privacy"""
        parts = email.split("@")
        if len(parts[0]) <= 2:
            return f"{parts[0][0]}*@{parts[1]}"
        return f"{parts[0][:2]}***@{parts[1]}"


# Global instance
referral_service = ReferralService()
