"""
Client Portal Service - Phase 3 Client-Facing Experience
Branded payment pages and self-service invoice management for clients
"""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple

from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from app.models import Client, Invoice, InvoiceStatus, Subscription, User
from app.subscription_service import SubscriptionGate


class ClientPortalService:
    """Service for client-facing portal functionality"""

    def __init__(self, db: Session):
        self.db = db
        self.subscription_gate = SubscriptionGate(db)

    def generate_client_access_token(
        self, client: Client, invoice_id: Optional[int] = None
    ) -> str:
        """Generate secure access token for client portal"""
        # Create unique token data
        token_data = (
            f"{client.id}:{client.email}:{datetime.now(timezone.utc).isoformat()}"
        )
        if invoice_id:
            token_data += f":{invoice_id}"

        # Generate secure token
        token = hashlib.sha256(token_data.encode()).hexdigest()[:32]
        return token

    def verify_client_access(
        self, token: str, client_email: str
    ) -> Tuple[bool, Optional[Client]]:
        """Verify client access token and return client if valid"""
        # In a production system, tokens would be stored in database with expiry
        # For now, we'll do a simple lookup by email
        client = self.db.query(Client).filter(Client.email == client_email).first()

        if not client:
            return False, None

        # Basic validation - in production, verify token timestamp and signature
        return len(token) == 32, client

    def get_client_portal_data(self, client: Client, access_token: str) -> Dict:
        """Get comprehensive client portal data"""
        # Get vendor information
        vendor = self.db.query(User).filter(User.id == client.user_id).first()
        if not vendor:
            raise ValueError("Vendor not found")

        # Get vendor's subscription for branding capabilities
        subscription = self.subscription_gate.get_user_subscription(vendor)

        # Get client's invoices (unpaid and recent paid)
        invoices = (
            self.db.query(Invoice)
            .filter(
                and_(
                    Invoice.client_id == client.id,
                    or_(
                        Invoice.status == InvoiceStatus.sent,
                        Invoice.status == InvoiceStatus.overdue,
                        and_(
                            Invoice.status == InvoiceStatus.paid,
                            Invoice.updated_at
                            >= datetime.now(timezone.utc) - timedelta(days=30),
                        ),
                    ),
                )
            )
            .order_by(Invoice.due_date.desc())
            .all()
        )

        # Calculate totals
        outstanding_amount = sum(
            inv.amount
            for inv in invoices
            if inv.status in [InvoiceStatus.sent, InvoiceStatus.overdue]
        )

        # Get branding configuration
        branding = self._get_vendor_branding(vendor, subscription.tier)

        # Portal configuration
        portal_config = self._get_portal_configuration(vendor, subscription.tier)

        return {
            "client": {
                "id": client.id,
                "name": client.name,
                "email": client.email,
                "company": getattr(client, "company", None),
            },
            "vendor": {
                "id": vendor.id,
                "name": vendor.name,
                "email": vendor.email,
                "company": getattr(vendor, "company", "DueSpark User"),
                "subscription_tier": subscription.tier.value,
            },
            "branding": branding,
            "portal_config": portal_config,
            "invoices": [self._format_invoice_for_client(inv) for inv in invoices],
            "summary": {
                "total_outstanding": float(outstanding_amount),
                "total_outstanding_display": f"${outstanding_amount:.2f}",
                "invoice_count": len(
                    [
                        inv
                        for inv in invoices
                        if inv.status in [InvoiceStatus.sent, InvoiceStatus.overdue]
                    ]
                ),
                "last_payment": self._get_last_payment_date(client),
            },
            "access_token": access_token,
            "portal_url": f"https://pay.duespark.com/client/{access_token}",
            "sharing": self._get_client_sharing_data(vendor, client),
        }

    def get_invoice_payment_page(self, invoice_id: int, access_token: str) -> Dict:
        """Get branded payment page data for specific invoice"""
        invoice = self.db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not invoice:
            raise ValueError("Invoice not found")

        client = self.db.query(Client).filter(Client.id == invoice.client_id).first()
        vendor = self.db.query(User).filter(User.id == invoice.user_id).first()

        if not client or not vendor:
            raise ValueError("Client or vendor not found")

        # Verify access
        is_valid, verified_client = self.verify_client_access(
            access_token, client.email
        )
        if not is_valid or verified_client.id != client.id:
            raise ValueError("Invalid access token")

        subscription = self.subscription_gate.get_user_subscription(vendor)
        branding = self._get_vendor_branding(vendor, subscription.tier)

        # Payment methods available based on subscription tier
        payment_methods = self._get_available_payment_methods(subscription.tier)

        return {
            "invoice": {
                "id": invoice.id,
                "number": invoice.number,
                "amount": float(invoice.amount),
                "amount_display": f"${invoice.amount:.2f}",
                "due_date": invoice.due_date.isoformat(),
                "status": invoice.status.value,
                "description": invoice.description or "Invoice Payment",
                "created_at": invoice.created_at.isoformat(),
            },
            "client": {"name": client.name, "email": client.email},
            "vendor": {
                "name": vendor.name,
                "company": getattr(vendor, "company", "DueSpark User"),
            },
            "branding": branding,
            "payment": {
                "methods": payment_methods,
                "processing_fee": self._calculate_processing_fee(
                    invoice.amount, subscription.tier
                ),
                "total_amount": self._calculate_total_with_fees(
                    invoice.amount, subscription.tier
                ),
                "success_redirect": f"https://pay.duespark.com/success/{access_token}",
                "cancel_redirect": f"https://pay.duespark.com/client/{access_token}",
            },
        }

    def process_payment(
        self, invoice_id: int, payment_data: Dict, access_token: str
    ) -> Dict:
        """Process payment for invoice (mock implementation)"""
        invoice = self.db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not invoice:
            raise ValueError("Invoice not found")

        client = self.db.query(Client).filter(Client.id == invoice.client_id).first()
        if not client:
            raise ValueError("Client not found")

        # Verify access
        is_valid, verified_client = self.verify_client_access(
            access_token, client.email
        )
        if not is_valid or verified_client.id != client.id:
            raise ValueError("Invalid access token")

        # Mock payment processing - in real implementation, integrate with Stripe
        payment_id = f"pay_{secrets.token_hex(12)}"

        # Update invoice status
        invoice.status = InvoiceStatus.paid
        invoice.paid_at = datetime.now(timezone.utc)
        invoice.updated_at = datetime.now(timezone.utc)

        self.db.commit()

        # Get vendor for notification
        vendor = self.db.query(User).filter(User.id == invoice.user_id).first()

        return {
            "success": True,
            "payment_id": payment_id,
            "invoice": {
                "id": invoice.id,
                "number": invoice.number,
                "amount": float(invoice.amount),
                "status": "paid",
            },
            "confirmation": {
                "message": f"Payment successful! Invoice #{invoice.number} has been paid.",
                "receipt_url": f"https://pay.duespark.com/receipt/{payment_id}",
                "vendor_notified": True,
            },
            "sharing": {
                "enabled": True,
                "message": f"Great experience with {vendor.name}! Paid my invoice quickly and easily through DueSpark.",
                "share_url": f"https://duespark.com/signup?ref=client-experience",
            },
        }

    def send_client_message(
        self,
        client: Client,
        vendor: User,
        message: str,
        invoice_id: Optional[int] = None,
    ) -> Dict:
        """Allow client to send message to vendor"""
        # In production, this would create a Message record and send notification
        message_id = f"msg_{secrets.token_hex(8)}"

        message_data = {
            "id": message_id,
            "from_client": True,
            "client_name": client.name,
            "client_email": client.email,
            "vendor_name": vendor.name,
            "message": message,
            "invoice_id": invoice_id,
            "sent_at": datetime.now(timezone.utc).isoformat(),
            "status": "sent",
        }

        return {
            "success": True,
            "message_id": message_id,
            "confirmation": "Your message has been sent to the vendor.",
            "data": message_data,
        }

    def get_client_communication_history(
        self, client: Client, access_token: str
    ) -> List[Dict]:
        """Get communication history between client and vendor"""
        # Mock communication history - in production, query Messages table
        return [
            {
                "id": "msg_001",
                "type": "payment_reminder",
                "from_vendor": True,
                "subject": "Payment Reminder: Invoice #INV-001",
                "preview": "Your invoice is due in 3 days...",
                "sent_at": "2024-09-10T10:00:00Z",
                "read": True,
            },
            {
                "id": "msg_002",
                "type": "client_message",
                "from_client": True,
                "subject": "Payment Question",
                "preview": "I have a question about the invoice...",
                "sent_at": "2024-09-11T14:30:00Z",
                "read": True,
            },
        ]

    # Private helper methods

    def _get_vendor_branding(self, vendor: User, tier) -> Dict:
        """Get vendor branding configuration based on subscription tier"""
        base_branding = {
            "logo_url": None,
            "company_name": getattr(vendor, "company", vendor.name),
            "primary_color": "#2563eb",  # DueSpark blue
            "secondary_color": "#f8fafc",
            "font_family": "Inter, system-ui, sans-serif",
        }

        if tier.value in ["professional", "agency"]:
            base_branding.update(
                {
                    "custom_branding_enabled": True,
                    "logo_url": f"https://avatars.duespark.com/{vendor.id}",
                    "primary_color": getattr(vendor, "brand_color", "#2563eb"),
                    "custom_domain_enabled": tier.value == "agency",
                }
            )

        if tier.value == "agency":
            base_branding.update(
                {
                    "white_label": True,
                    "powered_by_hidden": True,
                    "custom_footer": f"© 2024 {base_branding['company_name']}. All rights reserved.",
                }
            )
        else:
            base_branding.update(
                {
                    "powered_by_text": "Powered by DueSpark",
                    "powered_by_url": "https://duespark.com",
                }
            )

        return base_branding

    def _get_portal_configuration(self, vendor: User, tier) -> Dict:
        """Get portal configuration based on subscription tier"""
        config = {
            "features": {
                "invoice_history": True,
                "payment_methods": ["card", "ach"],
                "messaging": True,
                "automatic_receipts": True,
            },
            "customization": {
                "welcome_message": f"Welcome to {getattr(vendor, 'company', vendor.name)}'s payment portal",
                "payment_terms": "Payment is due within 30 days of invoice date",
                "contact_info": {
                    "email": vendor.email,
                    "phone": getattr(vendor, "phone", None),
                },
            },
        }

        if tier.value in ["professional", "agency"]:
            config["features"].update(
                {
                    "custom_messages": True,
                    "payment_plans": True,
                    "priority_support": True,
                }
            )

        if tier.value == "agency":
            config["features"].update(
                {
                    "multi_user_access": True,
                    "advanced_reporting": True,
                    "api_webhook": True,
                }
            )

        return config

    def _format_invoice_for_client(self, invoice: Invoice) -> Dict:
        """Format invoice data for client portal display"""
        return {
            "id": invoice.id,
            "number": invoice.number,
            "amount": float(invoice.amount),
            "amount_display": f"${invoice.amount:.2f}",
            "status": invoice.status.value,
            "status_display": invoice.status.value.replace("_", " ").title(),
            "due_date": invoice.due_date.isoformat(),
            "created_at": invoice.created_at.isoformat(),
            "paid_at": invoice.paid_at.isoformat() if invoice.paid_at else None,
            "description": invoice.description or "Invoice",
            "is_overdue": invoice.status == InvoiceStatus.overdue,
            "days_until_due": (
                invoice.due_date - datetime.now(timezone.utc).date()
            ).days,
            "payment_url": f"https://pay.duespark.com/invoice/{invoice.id}",
            "can_pay": invoice.status in [InvoiceStatus.sent, InvoiceStatus.overdue],
        }

    def _get_last_payment_date(self, client: Client) -> Optional[str]:
        """Get client's last payment date"""
        last_paid = (
            self.db.query(Invoice)
            .filter(
                and_(
                    Invoice.client_id == client.id,
                    Invoice.status == InvoiceStatus.paid,
                    Invoice.paid_at.isnot(None),
                )
            )
            .order_by(Invoice.paid_at.desc())
            .first()
        )

        return (
            last_paid.paid_at.isoformat() if last_paid and last_paid.paid_at else None
        )

    def _get_available_payment_methods(self, tier) -> List[Dict]:
        """Get available payment methods based on subscription tier"""
        methods = [
            {
                "id": "card",
                "name": "Credit/Debit Card",
                "icon": "💳",
                "processing_fee": "2.9% + $0.30",
                "enabled": True,
            }
        ]

        if tier.value in ["professional", "agency"]:
            methods.extend(
                [
                    {
                        "id": "ach",
                        "name": "Bank Transfer (ACH)",
                        "icon": "🏦",
                        "processing_fee": "0.8%",
                        "enabled": True,
                    },
                    {
                        "id": "paypal",
                        "name": "PayPal",
                        "icon": "💙",
                        "processing_fee": "3.49% + $0.49",
                        "enabled": True,
                    },
                ]
            )

        if tier.value == "agency":
            methods.append(
                {
                    "id": "wire",
                    "name": "Wire Transfer",
                    "icon": "🏛️",
                    "processing_fee": "Fixed $25",
                    "enabled": True,
                }
            )

        return methods

    def _calculate_processing_fee(self, amount: float, tier) -> float:
        """Calculate processing fee based on payment method and tier"""
        # Default credit card fee (2.9% + $0.30)
        fee = (amount * 0.029) + 0.30

        # Professional and Agency tiers get reduced fees
        if tier.value in ["professional", "agency"]:
            fee = (amount * 0.025) + 0.25  # Better rates

        return round(fee, 2)

    def _calculate_total_with_fees(self, amount: float, tier) -> float:
        """Calculate total amount including processing fees"""
        fee = self._calculate_processing_fee(amount, tier)
        return round(amount + fee, 2)

    def _get_client_sharing_data(self, vendor: User, client: Client) -> Dict:
        """Get sharing data for viral growth"""
        return {
            "enabled": True,
            "vendor_name": vendor.name,
            "testimonial_prompt": f"How was your payment experience with {vendor.name}?",
            "share_templates": {
                "positive": f"Just had a great payment experience with {vendor.name}! Super easy to pay through their professional portal. #{vendor.name.replace(' ', '')} #SmallBusiness",
                "referral": f"If you're a freelancer or small business, check out DueSpark - it's what {vendor.name} uses for invoicing. Makes payments so much easier! https://duespark.com",
            },
            "incentives": {
                "client_discount": "Leave a review and get 5% off your next service!",
                "vendor_credit": f"Client reviews help {vendor.name} grow their business",
            },
        }


# Dependency injection
def get_client_portal_service(db: Session) -> ClientPortalService:
    """Dependency to get client portal service"""
    return ClientPortalService(db)
