"""
Pricing service for subscription tiers and credit calculations.
"""
import os
from typing import Dict
from .models import SubscriptionTier


class PricingService:
    """Service for handling subscription pricing and credit calculations."""

    def __init__(self):
        """Initialize pricing service with tier price mappings."""
        # Default pricing in cents (USD)
        self.default_prices = {
            SubscriptionTier.freemium: 0,
            SubscriptionTier.professional: 2900,   # $29.00
            SubscriptionTier.agency: 9900         # $99.00
        }

        # Allow environment variable overrides for flexibility
        self.prices = self._load_pricing_from_env()

    def _load_pricing_from_env(self) -> Dict[SubscriptionTier, int]:
        """Load pricing from environment variables with fallback to defaults."""
        prices = {}

        for tier in SubscriptionTier:
            env_key = f"PRICE_{tier.value.upper()}_CENTS"
            default_price = self.default_prices.get(tier, 0)

            try:
                # Try to get price from environment variable
                env_price = os.getenv(env_key)
                if env_price is not None:
                    prices[tier] = int(env_price)
                else:
                    prices[tier] = default_price
            except (ValueError, TypeError):
                # Fall back to default if env var is invalid
                prices[tier] = default_price

        return prices

    def get_tier_price_cents(self, tier: SubscriptionTier) -> int:
        """
        Get the price in cents for a given subscription tier.

        Args:
            tier: The subscription tier

        Returns:
            Price in cents (USD)
        """
        return self.prices.get(tier, 0)

    def get_tier_price_dollars(self, tier: SubscriptionTier) -> float:
        """
        Get the price in dollars for a given subscription tier.

        Args:
            tier: The subscription tier

        Returns:
            Price in dollars (USD)
        """
        return self.get_tier_price_cents(tier) / 100.0

    def calculate_referral_credit_cents(self, referrer_tier: SubscriptionTier) -> int:
        """
        Calculate referral credit amount based on referrer's current tier.
        Credit equals one month of the referrer's current plan.

        Args:
            referrer_tier: The referrer's current subscription tier

        Returns:
            Credit amount in cents
        """
        return self.get_tier_price_cents(referrer_tier)

    def format_price_display(self, amount_cents: int, currency: str = "USD") -> str:
        """
        Format price for display in UI.

        Args:
            amount_cents: Price in cents
            currency: Currency code (default: USD)

        Returns:
            Formatted price string (e.g., "$19.00 USD")
        """
        dollars = amount_cents / 100.0

        if currency == "USD":
            return f"${dollars:.2f}"
        else:
            return f"{dollars:.2f} {currency}"

    def cents_to_months_equivalent(self, amount_cents: int, tier: SubscriptionTier) -> float:
        """
        Convert dollar amount to equivalent months for a given tier.
        Useful for backward compatibility calculations.

        Args:
            amount_cents: Amount in cents
            tier: Subscription tier to calculate against

        Returns:
            Number of months equivalent
        """
        tier_price = self.get_tier_price_cents(tier)
        if tier_price == 0:
            return 0.0
        return amount_cents / tier_price

    def months_to_cents(self, months: int, tier: SubscriptionTier) -> int:
        """
        Convert months to dollar amount for a given tier.
        Useful for migrating existing month-based credits.

        Args:
            months: Number of months
            tier: Subscription tier to calculate against

        Returns:
            Amount in cents
        """
        return months * self.get_tier_price_cents(tier)

    def get_all_tier_prices(self) -> Dict[str, Dict[str, any]]:
        """
        Get pricing information for all tiers.
        Useful for admin interfaces and pricing displays.

        Returns:
            Dictionary with tier pricing information
        """
        result = {}

        for tier in SubscriptionTier:
            cents = self.get_tier_price_cents(tier)
            result[tier.value] = {
                'tier': tier.value,
                'price_cents': cents,
                'price_dollars': cents / 100.0,
                'price_display': self.format_price_display(cents),
                'is_free': cents == 0
            }

        return result


# Global pricing service instance
pricing_service = PricingService()