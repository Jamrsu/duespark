"""
Stub implementation for referral service to resolve import errors
"""

from typing import Tuple, Optional
from sqlalchemy.orm import Session
from app import models


class ReferralService:
    """Stub referral service to prevent import errors"""

    def validate_referral_code(
        self,
        referral_code: str,
        user: models.User,
        db: Session
    ) -> Tuple[bool, Optional[str], Optional[models.User]]:
        """
        Validate referral code - stub implementation
        Returns: (is_valid, error_message, referrer_user)
        """
        # Stub: Always return invalid for now
        return False, "Referral system not implemented", None

    def create_referral(
        self,
        referrer: models.User,
        referee: models.User,
        referral_code: str,
        db: Session
    ) -> Optional[models.User]:
        """
        Create referral record - stub implementation
        """
        # Stub: Do nothing for now
        return None

    def process_pending_referral_rewards(self, db: Session) -> int:
        """
        Process pending referral rewards - stub implementation
        Returns: Number of rewards processed
        """
        # Stub: Return 0 for now
        return 0


# Create singleton instance
referral_service = ReferralService()