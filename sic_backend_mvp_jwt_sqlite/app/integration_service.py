"""
Integration Service - Phase 3 Integration Ecosystem
Enhanced Stripe Connect, QuickBooks/Xero sync, Zapier webhooks
"""

import hashlib
import hmac
import json
import secrets
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional

from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from app.models import Client, Invoice, InvoiceStatus, User
from app.subscription_service import SubscriptionGate


class IntegrationType(str, Enum):
    stripe_connect = "stripe_connect"
    quickbooks = "quickbooks"
    xero = "xero"
    zapier = "zapier"
    webhooks = "webhooks"


class IntegrationStatus(str, Enum):
    connected = "connected"
    disconnected = "disconnected"
    error = "error"
    pending = "pending"


class IntegrationService:
    """Service for managing third-party integrations"""

    def __init__(self, db: Session):
        self.db = db
        self.subscription_gate = SubscriptionGate(db)

    def get_user_integrations(self, user: User) -> Dict:
        """Get all integrations for user with status and capabilities"""
        tier = self.subscription_gate.get_user_tier(user)

        # Base integrations available to all tiers
        integrations = {
            "stripe_connect": {
                "name": "Stripe Connect",
                "description": "Direct payment processing with your Stripe account",
                "status": "disconnected",
                "available": True,
                "tier_required": "freemium",
                "features": ["payment_processing", "automatic_reconciliation"],
                "setup_url": f"/integrations/stripe/connect?user_id={user.id}",
                "icon": "💳",
            },
            "webhooks": {
                "name": "Webhook Endpoints",
                "description": "Real-time event notifications to your systems",
                "status": "disconnected",
                "available": tier.value in ["professional", "agency"],
                "tier_required": "professional",
                "features": ["real_time_events", "custom_endpoints"],
                "setup_url": f"/integrations/webhooks/setup?user_id={user.id}",
                "icon": "🔗",
            },
        }

        # Professional tier integrations
        if tier.value in ["professional", "agency"]:
            integrations.update(
                {
                    "quickbooks": {
                        "name": "QuickBooks Online",
                        "description": "Sync invoices and payments with QuickBooks",
                        "status": "disconnected",
                        "available": True,
                        "tier_required": "professional",
                        "features": ["invoice_sync", "payment_sync", "customer_sync"],
                        "setup_url": f"/integrations/quickbooks/oauth?user_id={user.id}",
                        "icon": "📊",
                    },
                    "xero": {
                        "name": "Xero Accounting",
                        "description": "Sync invoices and payments with Xero",
                        "status": "disconnected",
                        "available": True,
                        "tier_required": "professional",
                        "features": ["invoice_sync", "payment_sync", "customer_sync"],
                        "setup_url": f"/integrations/xero/oauth?user_id={user.id}",
                        "icon": "🔵",
                    },
                }
            )

        # Agency tier integrations
        if tier.value == "agency":
            integrations.update(
                {
                    "zapier": {
                        "name": "Zapier",
                        "description": "Connect with 5000+ apps through Zapier",
                        "status": "disconnected",
                        "available": True,
                        "tier_required": "agency",
                        "features": [
                            "custom_workflows",
                            "multi_app_sync",
                            "advanced_automation",
                        ],
                        "setup_url": f"/integrations/zapier/connect?user_id={user.id}",
                        "icon": "⚡",
                    }
                }
            )

        return {
            "user_tier": tier.value,
            "integrations": integrations,
            "summary": {
                "total_available": len(
                    [i for i in integrations.values() if i["available"]]
                ),
                "connected": len(
                    [i for i in integrations.values() if i["status"] == "connected"]
                ),
                "upgrade_message": (
                    "Upgrade to Professional for accounting integrations"
                    if tier.value == "freemium"
                    else None
                ),
            },
        }

    def initiate_stripe_connect(self, user: User) -> Dict:
        """Initiate Stripe Connect onboarding"""
        try:
            # Mock Stripe Connect setup - in production, use actual Stripe API
            connect_url = f"https://connect.stripe.com/oauth/authorize?response_type=code&client_id=ca_test&scope=read_write&redirect_uri=https://duespark.com/integrations/stripe/callback&state={user.id}"

            return {
                "success": True,
                "integration_type": "stripe_connect",
                "connect_url": connect_url,
                "state": str(user.id),
                "message": "Redirecting to Stripe Connect...",
                "benefits": [
                    "Process payments directly to your bank account",
                    "Reduced processing fees",
                    "Automatic payment reconciliation",
                    "Advanced reporting and analytics",
                ],
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "message": "Failed to initiate Stripe Connect",
            }

    def setup_quickbooks_integration(self, user: User) -> Dict:
        """Setup QuickBooks Online integration"""
        tier = self.subscription_gate.get_user_tier(user)

        if tier.value not in ["professional", "agency"]:
            return {
                "success": False,
                "error": "upgrade_required",
                "message": "QuickBooks integration requires Professional or Agency subscription",
                "upgrade_url": "/subscription/upgrade",
            }

        try:
            # Mock QuickBooks OAuth setup
            oauth_url = f"https://appcenter.intuit.com/connect/oauth2?client_id=QB_CLIENT_ID&scope=com.intuit.quickbooks.accounting&redirect_uri=https://duespark.com/integrations/quickbooks/callback&response_type=code&state={user.id}"

            return {
                "success": True,
                "integration_type": "quickbooks",
                "oauth_url": oauth_url,
                "state": str(user.id),
                "message": "Redirecting to QuickBooks authorization...",
                "sync_features": [
                    "Automatic invoice creation in QuickBooks",
                    "Payment status synchronization",
                    "Customer data sync",
                    "Real-time financial reporting",
                ],
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "message": "Failed to setup QuickBooks integration",
            }

    def setup_xero_integration(self, user: User) -> Dict:
        """Setup Xero accounting integration"""
        tier = self.subscription_gate.get_user_tier(user)

        if tier.value not in ["professional", "agency"]:
            return {
                "success": False,
                "error": "upgrade_required",
                "message": "Xero integration requires Professional or Agency subscription",
            }

        try:
            # Mock Xero OAuth setup
            oauth_url = f"https://login.xero.com/identity/connect/authorize?response_type=code&client_id=XERO_CLIENT_ID&redirect_uri=https://duespark.com/integrations/xero/callback&scope=accounting.transactions&state={user.id}"

            return {
                "success": True,
                "integration_type": "xero",
                "oauth_url": oauth_url,
                "state": str(user.id),
                "message": "Redirecting to Xero authorization...",
                "sync_features": [
                    "Bi-directional invoice synchronization",
                    "Automatic payment recording",
                    "Contact management sync",
                    "Real-time accounting updates",
                ],
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "message": "Failed to setup Xero integration",
            }

    def setup_zapier_integration(self, user: User) -> Dict:
        """Setup Zapier integration for workflow automation"""
        tier = self.subscription_gate.get_user_tier(user)

        if tier.value != "agency":
            return {
                "success": False,
                "error": "upgrade_required",
                "message": "Zapier integration requires Agency subscription",
            }

        try:
            # Generate API key for Zapier
            api_key = f"zap_{secrets.token_hex(16)}"

            return {
                "success": True,
                "integration_type": "zapier",
                "api_key": api_key,
                "webhook_url": f"https://hooks.zapier.com/hooks/catch/{user.id}/duespark/",
                "setup_instructions": [
                    "1. Go to Zapier.com and create a new Zap",
                    "2. Search for 'DueSpark' as your trigger app",
                    "3. Use this API key to authenticate",
                    "4. Choose your trigger event (invoice created, payment received, etc.)",
                    "5. Connect to any of 5000+ apps for automation",
                ],
                "available_triggers": [
                    "invoice_created",
                    "invoice_paid",
                    "payment_overdue",
                    "client_added",
                    "reminder_sent",
                ],
                "popular_workflows": [
                    "Add new clients to CRM when invoice is created",
                    "Send Slack notification when payment is received",
                    "Create calendar event for overdue follow-ups",
                    "Update spreadsheet with payment data",
                ],
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "message": "Failed to setup Zapier integration",
            }

    def setup_webhook_endpoints(self, user: User, endpoints: List[Dict]) -> Dict:
        """Setup custom webhook endpoints"""
        tier = self.subscription_gate.get_user_tier(user)

        if tier.value not in ["professional", "agency"]:
            return {
                "success": False,
                "error": "upgrade_required",
                "message": "Custom webhooks require Professional or Agency subscription",
            }

        try:
            webhook_secret = secrets.token_hex(32)
            configured_endpoints = []

            for endpoint in endpoints:
                webhook_id = f"wh_{secrets.token_hex(8)}"
                configured_endpoints.append(
                    {
                        "id": webhook_id,
                        "url": endpoint.get("url"),
                        "events": endpoint.get("events", []),
                        "status": "active",
                        "secret": webhook_secret,
                        "created_at": datetime.now(timezone.utc).isoformat(),
                    }
                )

            return {
                "success": True,
                "integration_type": "webhooks",
                "endpoints": configured_endpoints,
                "webhook_secret": webhook_secret,
                "supported_events": [
                    "invoice.created",
                    "invoice.sent",
                    "invoice.paid",
                    "invoice.overdue",
                    "payment.received",
                    "client.created",
                    "reminder.sent",
                ],
                "security": {
                    "signature_header": "X-DueSpark-Signature",
                    "algorithm": "sha256",
                    "verification_docs": "https://docs.duespark.com/webhooks/verification",
                },
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "message": "Failed to setup webhook endpoints",
            }

    def sync_invoice_to_accounting(
        self, invoice: Invoice, integration_type: str
    ) -> Dict:
        """Sync invoice to accounting system (QuickBooks/Xero)"""
        try:
            # Mock sync - in production, use actual API calls
            if integration_type == "quickbooks":
                return self._sync_to_quickbooks(invoice)
            elif integration_type == "xero":
                return self._sync_to_xero(invoice)
            else:
                raise ValueError(f"Unsupported integration type: {integration_type}")

        except Exception as e:
            return {"success": False, "error": str(e), "invoice_id": invoice.id}

    def send_webhook_notification(
        self, user: User, event_type: str, data: Dict
    ) -> List[Dict]:
        """Send webhook notifications to configured endpoints"""
        # Mock webhook sending - in production, queue these for reliable delivery
        results = []

        # Mock user webhooks
        mock_endpoints = [
            {
                "url": "https://example.com/webhooks/duespark",
                "events": ["invoice.paid"],
            },
            {
                "url": "https://hooks.zapier.com/hooks/catch/123/abc",
                "events": ["invoice.created", "invoice.paid"],
            },
        ]

        for endpoint in mock_endpoints:
            if event_type in endpoint["events"]:
                result = self._send_webhook_request(endpoint["url"], event_type, data)
                results.append(result)

        return results

    def get_integration_analytics(self, user: User) -> Dict:
        """Get analytics for user's integrations"""
        # Mock analytics data
        return {
            "overview": {
                "total_integrations": 3,
                "active_integrations": 2,
                "total_synced_invoices": 45,
                "webhook_deliveries": 120,
                "last_sync": "2024-09-14T18:30:00Z",
            },
            "by_integration": {
                "stripe_connect": {
                    "status": "connected",
                    "payments_processed": 28,
                    "total_volume": "$12,450.00",
                    "last_transaction": "2024-09-14T16:45:00Z",
                },
                "quickbooks": {
                    "status": "connected",
                    "invoices_synced": 45,
                    "last_sync": "2024-09-14T18:30:00Z",
                    "sync_errors": 0,
                },
                "webhooks": {
                    "status": "active",
                    "total_deliveries": 120,
                    "success_rate": "98.5%",
                    "endpoints": 2,
                },
            },
            "recent_activity": [
                {
                    "type": "sync",
                    "integration": "quickbooks",
                    "action": "Invoice #INV-045 synced",
                    "timestamp": "2024-09-14T18:30:00Z",
                    "status": "success",
                },
                {
                    "type": "webhook",
                    "integration": "zapier",
                    "action": "Payment notification sent",
                    "timestamp": "2024-09-14T16:45:00Z",
                    "status": "delivered",
                },
            ],
        }

    # Private helper methods

    def _sync_to_quickbooks(self, invoice: Invoice) -> Dict:
        """Sync invoice to QuickBooks Online"""
        # Mock QuickBooks API call
        qb_invoice_id = f"QB_{invoice.id}_{secrets.token_hex(4)}"

        return {
            "success": True,
            "integration": "quickbooks",
            "invoice_id": invoice.id,
            "external_id": qb_invoice_id,
            "sync_type": "create",
            "synced_at": datetime.now(timezone.utc).isoformat(),
            "qb_url": f"https://app.qbo.intuit.com/app/invoice?txnId={qb_invoice_id}",
        }

    def _sync_to_xero(self, invoice: Invoice) -> Dict:
        """Sync invoice to Xero"""
        # Mock Xero API call
        xero_invoice_id = f"XERO_{invoice.id}_{secrets.token_hex(4)}"

        return {
            "success": True,
            "integration": "xero",
            "invoice_id": invoice.id,
            "external_id": xero_invoice_id,
            "sync_type": "create",
            "synced_at": datetime.now(timezone.utc).isoformat(),
            "xero_url": f"https://go.xero.com/AccountsReceivable/View.aspx?InvoiceID={xero_invoice_id}",
        }

    def _send_webhook_request(self, url: str, event_type: str, data: Dict) -> Dict:
        """Send webhook HTTP request"""
        # Mock webhook delivery
        webhook_id = f"wh_evt_{secrets.token_hex(8)}"

        payload = {
            "id": webhook_id,
            "event": event_type,
            "created": int(datetime.now(timezone.utc).timestamp()),
            "data": data,
        }

        # Mock successful delivery
        return {
            "webhook_id": webhook_id,
            "url": url,
            "event_type": event_type,
            "status": "delivered",
            "response_code": 200,
            "delivered_at": datetime.now(timezone.utc).isoformat(),
            "payload_size": len(json.dumps(payload)),
        }

    def _generate_webhook_signature(self, payload: str, secret: str) -> str:
        """Generate webhook signature for verification"""
        signature = hmac.new(
            secret.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256
        ).hexdigest()
        return f"sha256={signature}"


# Dependency injection
def get_integration_service(db: Session) -> IntegrationService:
    """Dependency to get integration service"""
    return IntegrationService(db)
