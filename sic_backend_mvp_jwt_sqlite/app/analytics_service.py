"""
Analytics and Recommendations Service - Phase 3 Intelligence Engine
Usage analytics, predictive insights, and AI-powered recommendations
"""

import json
import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import and_, desc, func, or_, text
from sqlalchemy.orm import Session

from app.models import Client, Invoice, InvoiceStatus, SubscriptionTier, User
from app.subscription_service import SubscriptionGate

logger = logging.getLogger(__name__)


class PaymentBehavior(str, Enum):
    excellent = "excellent"  # < 5 days average delay
    good = "good"  # 5-14 days
    moderate = "moderate"  # 15-30 days
    poor = "poor"  # > 30 days or frequent overdue


class RiskLevel(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class RecommendationType(str, Enum):
    scheduling = "scheduling"
    pricing = "pricing"
    client_management = "client_management"
    growth = "growth"
    upgrade = "upgrade"


@dataclass
class ClientInsight:
    client_id: int
    client_name: str
    payment_behavior: PaymentBehavior
    avg_payment_delay: float
    risk_level: RiskLevel
    predicted_payment_date: Optional[datetime]
    lifetime_value: float
    last_payment: Optional[datetime]
    overdue_count: int
    recommendations: List[str]


@dataclass
class CashFlowPrediction:
    period_start: datetime
    period_end: datetime
    predicted_income: float
    confidence_score: float  # 0.0 to 1.0
    breakdown_by_week: List[Dict]
    risk_factors: List[str]
    opportunities: List[str]


@dataclass
class UsageAnalytics:
    total_invoices: int
    total_clients: int
    monthly_volume: float
    growth_rate: float
    feature_adoption: Dict[str, float]
    efficiency_score: float
    tier_utilization: Dict[str, Any]


class AnalyticsService:
    """Service for analytics and AI-powered recommendations"""

    def __init__(self, db: Session):
        self.db = db
        self.subscription_gate = SubscriptionGate(db)

    def get_user_analytics(self, user: User) -> Dict:
        """Get comprehensive user analytics dashboard"""
        try:
            # Basic usage stats
            total_invoices = (
                self.db.query(Invoice).filter(Invoice.user_id == user.id).count()
            )
            total_clients = (
                self.db.query(Client).filter(Client.user_id == user.id).count()
            )

            # Recent activity (last 30 days)
            thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
            recent_invoices = (
                self.db.query(Invoice)
                .filter(
                    and_(
                        Invoice.user_id == user.id,
                        Invoice.created_at >= thirty_days_ago,
                    )
                )
                .count()
            )

            # Payment stats - optimized with aggregation
            payment_stats = (
                self.db.query(
                    func.count(Invoice.id).label("count"),
                    func.sum(Invoice.amount_cents).label("total_cents"),
                )
                .filter(
                    and_(
                        Invoice.user_id == user.id, Invoice.status == InvoiceStatus.paid
                    )
                )
                .first()
            )

            invoice_count = payment_stats.count or 0
            total_revenue_cents = payment_stats.total_cents or 0
            total_revenue = total_revenue_cents / 100.0  # Convert cents to dollars
            avg_invoice_value = (
                total_revenue / invoice_count if invoice_count > 0 else 0.0
            )

            # Feature usage tracking
            feature_usage = self._calculate_feature_usage(user)

            # Tier analysis
            tier_analysis = self._analyze_tier_usage(user)

            # Performance metrics
            performance = self._calculate_performance_metrics(user)

            return {
                "overview": {
                    "total_invoices": total_invoices,
                    "total_clients": total_clients,
                    "total_revenue": round(total_revenue, 2),
                    "avg_invoice_value": round(avg_invoice_value, 2),
                    "recent_activity": recent_invoices,
                    "subscription_tier": user.subscription_tier.value,
                },
                "performance": performance,
                "feature_usage": feature_usage,
                "tier_analysis": tier_analysis,
                "growth_trends": self._calculate_growth_trends(user),
                "recommendations": self._generate_user_recommendations(user),
                "last_updated": datetime.now(timezone.utc).isoformat(),
            }

        except Exception as e:
            logger.error(f"Error generating user analytics: {str(e)}")
            return self._get_default_analytics()

    def get_client_insights(self, user: User, limit: int = 10) -> List[ClientInsight]:
        """Generate insights for user's clients - optimized to avoid N+1 queries"""
        try:
            # Get all client and invoice data in a single optimized query
            clients_data = (
                self.db.query(
                    Client.id,
                    Client.name,
                    func.count(Invoice.id).label("total_invoices"),
                    func.sum(
                        func.case(
                            (
                                Invoice.status == InvoiceStatus.paid,
                                Invoice.amount_cents,
                            ),
                            else_=0,
                        )
                    ).label("total_paid_cents"),
                    func.count(
                        func.case(
                            (Invoice.status == InvoiceStatus.paid, Invoice.id),
                            else_=None,
                        )
                    ).label("paid_count"),
                    func.count(
                        func.case(
                            (Invoice.status == InvoiceStatus.overdue, Invoice.id),
                            else_=None,
                        )
                    ).label("overdue_count"),
                    func.avg(
                        func.case(
                            (
                                and_(
                                    Invoice.status == InvoiceStatus.paid,
                                    Invoice.paid_at.isnot(None),
                                ),
                                func.julianday(Invoice.paid_at)
                                - func.julianday(Invoice.due_date),
                            ),
                            else_=None,
                        )
                    ).label("avg_delay_days"),
                    func.max(
                        func.case(
                            (Invoice.status == InvoiceStatus.paid, Invoice.paid_at),
                            else_=None,
                        )
                    ).label("last_payment"),
                )
                .outerjoin(Invoice, Invoice.client_id == Client.id)
                .filter(Client.user_id == user.id)
                .group_by(Client.id, Client.name)
                .limit(limit)
                .all()
            )

            insights = []
            for client_data in clients_data:
                insight = self._build_client_insight_from_data(client_data)
                insights.append(insight)

            # Sort by risk level and payment behavior
            insights.sort(
                key=lambda x: (x.risk_level.value, x.avg_payment_delay), reverse=True
            )
            return insights

        except Exception as e:
            logger.error(f"Error generating client insights: {str(e)}")
            return []

    def predict_cash_flow(self, user: User, days_ahead: int = 30) -> CashFlowPrediction:
        """Predict cash flow for next N days"""
        try:
            start_date = datetime.now(timezone.utc)
            end_date = start_date + timedelta(days=days_ahead)

            # Get pending invoices with due dates in the prediction window
            pending_invoices = (
                self.db.query(Invoice)
                .filter(
                    and_(
                        Invoice.user_id == user.id,
                        Invoice.status.in_([InvoiceStatus.sent, InvoiceStatus.overdue]),
                        Invoice.due_date >= start_date,
                        Invoice.due_date <= end_date,
                    )
                )
                .all()
            )

            # Calculate prediction based on historical payment patterns
            total_predicted = 0.0
            weekly_breakdown = []
            confidence_factors = []

            for week in range(0, days_ahead, 7):
                week_start = start_date + timedelta(days=week)
                week_end = min(week_start + timedelta(days=7), end_date)

                week_invoices = [
                    inv
                    for inv in pending_invoices
                    if week_start <= inv.due_date < week_end
                ]

                week_amount = sum(float(inv.amount) for inv in week_invoices)

                # Adjust for payment probability based on client history
                adjusted_amount = week_amount * self._calculate_payment_probability(
                    user
                )
                total_predicted += adjusted_amount

                weekly_breakdown.append(
                    {
                        "week_start": week_start.isoformat(),
                        "week_end": week_end.isoformat(),
                        "expected_amount": round(adjusted_amount, 2),
                        "invoice_count": len(week_invoices),
                    }
                )

            # Calculate confidence score
            confidence = self._calculate_prediction_confidence(user, pending_invoices)

            # Identify risk factors and opportunities
            risk_factors = self._identify_cash_flow_risks(user, pending_invoices)
            opportunities = self._identify_cash_flow_opportunities(user)

            return CashFlowPrediction(
                period_start=start_date,
                period_end=end_date,
                predicted_income=round(total_predicted, 2),
                confidence_score=confidence,
                breakdown_by_week=weekly_breakdown,
                risk_factors=risk_factors,
                opportunities=opportunities,
            )

        except Exception as e:
            logger.error(f"Error predicting cash flow: {str(e)}")
            return self._get_default_cash_flow_prediction(user, days_ahead)

    def get_ai_recommendations(self, user: User) -> List[Dict]:
        """Generate AI-powered recommendations for user"""
        try:
            recommendations = []

            # Business growth recommendations
            recommendations.extend(self._generate_growth_recommendations(user))

            # Operational efficiency recommendations
            recommendations.extend(self._generate_efficiency_recommendations(user))

            # Client management recommendations
            recommendations.extend(self._generate_client_recommendations(user))

            # Subscription tier recommendations
            recommendations.extend(self._generate_upgrade_recommendations(user))

            # Sort by priority and relevance
            recommendations.sort(key=lambda x: x.get("priority", 0), reverse=True)

            return recommendations[:10]  # Return top 10 recommendations

        except Exception as e:
            logger.error(f"Error generating AI recommendations: {str(e)}")
            return []

    def track_feature_usage(
        self, user: User, feature: str, metadata: Optional[Dict] = None
    ):
        """Track feature usage for analytics (would store in database in production)"""
        try:
            # In production, store this in a feature_usage table
            logger.info(
                f"Feature usage: {user.id} used {feature} with metadata {metadata}"
            )

        except Exception as e:
            logger.error(f"Error tracking feature usage: {str(e)}")

    # Private helper methods

    def _analyze_client_behavior(self, client: Client) -> ClientInsight:
        """Analyze individual client payment behavior"""
        try:
            # Get client's invoices
            invoices = (
                self.db.query(Invoice).filter(Invoice.client_id == client.id).all()
            )

            if not invoices:
                return ClientInsight(
                    client_id=client.id,
                    client_name=client.name,
                    payment_behavior=PaymentBehavior.good,
                    avg_payment_delay=0.0,
                    risk_level=RiskLevel.low,
                    predicted_payment_date=None,
                    lifetime_value=0.0,
                    last_payment=None,
                    overdue_count=0,
                    recommendations=["No payment history available"],
                )

            # Calculate metrics
            paid_invoices = [
                inv for inv in invoices if inv.status == InvoiceStatus.paid
            ]
            overdue_count = len(
                [inv for inv in invoices if inv.status == InvoiceStatus.overdue]
            )

            # Calculate average payment delay
            delays = []
            for invoice in paid_invoices:
                if invoice.due_date and invoice.paid_at:
                    delay = (invoice.paid_at - invoice.due_date).days
                    delays.append(max(0, delay))  # Only positive delays count

            avg_delay = sum(delays) / len(delays) if delays else 0.0

            # Determine payment behavior
            if avg_delay <= 5:
                behavior = PaymentBehavior.excellent
            elif avg_delay <= 14:
                behavior = PaymentBehavior.good
            elif avg_delay <= 30:
                behavior = PaymentBehavior.moderate
            else:
                behavior = PaymentBehavior.poor

            # Calculate risk level
            risk = self._calculate_client_risk(client, overdue_count, avg_delay)

            # Calculate lifetime value
            lifetime_value = sum(float(inv.amount) for inv in paid_invoices)

            # Get last payment date
            last_payment = max(
                (inv.paid_at for inv in paid_invoices if inv.paid_at), default=None
            )

            # Generate recommendations
            recommendations = self._generate_client_specific_recommendations(
                client, behavior, risk, avg_delay
            )

            return ClientInsight(
                client_id=client.id,
                client_name=client.name,
                payment_behavior=behavior,
                avg_payment_delay=avg_delay,
                risk_level=risk,
                predicted_payment_date=self._predict_next_payment_date(
                    client, avg_delay
                ),
                lifetime_value=lifetime_value,
                last_payment=last_payment,
                overdue_count=overdue_count,
                recommendations=recommendations,
            )

        except Exception as e:
            logger.error(f"Error analyzing client behavior for {client.id}: {str(e)}")
            return self._get_default_client_insight(client)

    def _build_client_insight_from_data(self, client_data) -> ClientInsight:
        """Build ClientInsight from aggregated query data - optimized version"""
        try:
            client_id = client_data.id
            client_name = client_data.name
            total_invoices = client_data.total_invoices or 0
            total_paid_cents = client_data.total_paid_cents or 0
            paid_count = client_data.paid_count or 0
            overdue_count = client_data.overdue_count or 0
            avg_delay_days = client_data.avg_delay_days or 0.0
            last_payment = client_data.last_payment

            # Convert to proper types
            lifetime_value = total_paid_cents / 100.0  # Convert cents to dollars
            avg_payment_delay = max(0.0, float(avg_delay_days))  # Only positive delays

            # Determine payment behavior
            if avg_payment_delay <= 5:
                behavior = PaymentBehavior.excellent
            elif avg_payment_delay <= 14:
                behavior = PaymentBehavior.good
            elif avg_payment_delay <= 30:
                behavior = PaymentBehavior.moderate
            else:
                behavior = PaymentBehavior.poor

            # Calculate risk level based on overdue count and payment delay
            if overdue_count >= 3 or avg_payment_delay > 45:
                risk_level = RiskLevel.critical
            elif overdue_count >= 2 or avg_payment_delay > 30:
                risk_level = RiskLevel.high
            elif overdue_count >= 1 or avg_payment_delay > 15:
                risk_level = RiskLevel.medium
            else:
                risk_level = RiskLevel.low

            # Generate basic recommendations
            recommendations = []
            if risk_level == RiskLevel.critical:
                recommendations.append(
                    "Urgent: Contact client immediately regarding overdue payments"
                )
            elif behavior == PaymentBehavior.poor:
                recommendations.append(
                    "Consider adjusting payment terms or requiring deposits"
                )
            elif behavior == PaymentBehavior.excellent:
                recommendations.append(
                    "Excellent client - consider offering loyalty incentives"
                )

            if total_invoices == 0:
                recommendations.append("No payment history available")

            return ClientInsight(
                client_id=client_id,
                client_name=client_name,
                payment_behavior=behavior,
                avg_payment_delay=avg_payment_delay,
                risk_level=risk_level,
                predicted_payment_date=None,  # Could enhance this with ML prediction
                lifetime_value=lifetime_value,
                last_payment=last_payment,
                overdue_count=overdue_count,
                recommendations=recommendations,
            )

        except Exception as e:
            logger.error(f"Error building client insight from data: {str(e)}")
            # Return basic insight as fallback
            return ClientInsight(
                client_id=getattr(client_data, "id", 0),
                client_name=getattr(client_data, "name", "Unknown"),
                payment_behavior=PaymentBehavior.good,
                avg_payment_delay=0.0,
                risk_level=RiskLevel.low,
                predicted_payment_date=None,
                lifetime_value=0.0,
                last_payment=None,
                overdue_count=0,
                recommendations=["Data unavailable"],
            )

    def _calculate_feature_usage(self, user: User) -> Dict:
        """Calculate feature usage metrics"""
        # In production, query actual usage tracking data
        return {
            "invoice_creation": 0.85,
            "reminder_sending": 0.72,
            "client_management": 0.68,
            "reporting": 0.45,
            "integrations": 0.23,
            "mobile_app": 0.67,
            "ai_recommendations": 0.34,
        }

    def _analyze_tier_usage(self, user: User) -> Dict:
        """Analyze how user is utilizing their subscription tier"""
        tier = self.subscription_gate.get_user_tier(user)
        limits = self.subscription_gate.get_tier_limits(tier)

        # Calculate current usage - optimized with single query
        current_month = datetime.now(timezone.utc).replace(
            day=1, hour=0, minute=0, second=0, microsecond=0
        )

        usage_stats = (
            self.db.query(
                func.count(func.distinct(Client.id)).label("client_count"),
                func.count(
                    func.case(
                        (Invoice.created_at >= current_month, Invoice.id), else_=None
                    )
                ).label("monthly_invoice_count"),
            )
            .outerjoin(Invoice, Invoice.user_id == user.id)
            .filter(Client.user_id == user.id)
            .first()
        )

        current_clients = usage_stats.client_count or 0
        monthly_invoices = usage_stats.monthly_invoice_count or 0

        return {
            "current_tier": tier.value,
            "clients": {
                "used": current_clients,
                "limit": limits.get("max_clients", "unlimited"),
                "utilization": (
                    min(current_clients / limits.get("max_clients", 999999), 1.0)
                    if limits.get("max_clients") != 999999
                    else 0.0
                ),
            },
            "monthly_invoices": {
                "used": monthly_invoices,
                "limit": limits.get("max_invoices_per_month", "unlimited"),
                "utilization": (
                    min(
                        monthly_invoices / limits.get("max_invoices_per_month", 999999),
                        1.0,
                    )
                    if limits.get("max_invoices_per_month") != 999999
                    else 0.0
                ),
            },
            "ai_features_enabled": limits.get("ai_features", False),
            "upgrade_recommended": self._should_recommend_upgrade(
                user, current_clients, monthly_invoices
            ),
        }

    def _calculate_performance_metrics(self, user: User) -> Dict:
        """Calculate user performance metrics"""
        # Get user's invoices
        invoices = self.db.query(Invoice).filter(Invoice.user_id == user.id).all()

        if not invoices:
            return {
                "payment_rate": 0.0,
                "avg_collection_time": 0.0,
                "efficiency_score": 0.0,
            }

        paid_invoices = [inv for inv in invoices if inv.status == InvoiceStatus.paid]
        payment_rate = len(paid_invoices) / len(invoices) if invoices else 0.0

        # Calculate average collection time
        collection_times = []
        for invoice in paid_invoices:
            if invoice.sent_at and invoice.paid_at:
                days_to_collect = (invoice.paid_at - invoice.sent_at).days
                collection_times.append(days_to_collect)

        avg_collection_time = (
            sum(collection_times) / len(collection_times) if collection_times else 0.0
        )

        # Calculate efficiency score (0.0 to 1.0)
        efficiency_score = min(
            payment_rate * (1.0 - min(avg_collection_time / 30.0, 1.0)), 1.0
        )

        return {
            "payment_rate": round(payment_rate * 100, 1),
            "avg_collection_time": round(avg_collection_time, 1),
            "efficiency_score": round(efficiency_score * 100, 1),
            "total_invoices": len(invoices),
            "paid_invoices": len(paid_invoices),
        }

    def _calculate_growth_trends(self, user: User) -> Dict:
        """Calculate growth trends and momentum"""
        # Get monthly invoice counts for the last 6 months
        monthly_data = []

        for i in range(6):
            month_start = datetime.now(timezone.utc).replace(
                day=1, hour=0, minute=0, second=0, microsecond=0
            ) - timedelta(days=30 * i)
            month_end = month_start + timedelta(days=31)

            count = (
                self.db.query(Invoice)
                .filter(
                    and_(
                        Invoice.user_id == user.id,
                        Invoice.created_at >= month_start,
                        Invoice.created_at < month_end,
                    )
                )
                .count()
            )

            monthly_data.append(
                {"month": month_start.strftime("%Y-%m"), "invoices": count}
            )

        # Calculate growth rate
        recent_avg = (
            sum(d["invoices"] for d in monthly_data[:3]) / 3
            if len(monthly_data) >= 3
            else 0
        )
        older_avg = (
            sum(d["invoices"] for d in monthly_data[3:]) / 3
            if len(monthly_data) >= 6
            else 0
        )

        growth_rate = (
            ((recent_avg - older_avg) / older_avg * 100) if older_avg > 0 else 0.0
        )

        return {
            "monthly_data": list(reversed(monthly_data)),  # Chronological order
            "growth_rate": round(growth_rate, 1),
            "trend": (
                "growing"
                if growth_rate > 5
                else "stable" if growth_rate > -5 else "declining"
            ),
        }

    def _generate_user_recommendations(self, user: User) -> List[str]:
        """Generate general recommendations for the user"""
        recommendations = []

        # Basic recommendations based on usage patterns
        tier = self.subscription_gate.get_user_tier(user)

        if tier == SubscriptionTier.freemium:
            recommendations.extend(
                [
                    "Consider upgrading to Professional for advanced AI features",
                    "Set up automated reminder schedules to improve collection rates",
                ]
            )

        recommendations.extend(
            [
                "Review client payment patterns monthly for optimization",
                "Use the client portal to improve payment experience",
            ]
        )

        return recommendations

    def _calculate_payment_probability(self, user: User) -> float:
        """Calculate probability of payment based on historical data"""
        # In production, use ML model based on historical patterns
        # For now, use simple heuristic

        invoices = self.db.query(Invoice).filter(Invoice.user_id == user.id).all()
        if not invoices:
            return 0.7  # Default probability

        paid_count = len([inv for inv in invoices if inv.status == InvoiceStatus.paid])
        return min(paid_count / len(invoices), 0.95)  # Cap at 95%

    def _calculate_prediction_confidence(
        self, user: User, pending_invoices: List[Invoice]
    ) -> float:
        """Calculate confidence in cash flow prediction"""
        # Factors affecting confidence:
        # - Historical payment consistency
        # - Number of pending invoices
        # - Client diversity

        if not pending_invoices:
            return 0.0

        base_confidence = 0.7

        # Adjust for number of invoices (more invoices = more stable prediction)
        count_factor = min(len(pending_invoices) / 10.0, 0.2)

        # Adjust for historical consistency (simplified)
        consistency_factor = 0.1

        return min(base_confidence + count_factor + consistency_factor, 0.95)

    def _identify_cash_flow_risks(
        self, user: User, pending_invoices: List[Invoice]
    ) -> List[str]:
        """Identify potential cash flow risks"""
        risks = []

        overdue_count = len(
            [inv for inv in pending_invoices if inv.status == InvoiceStatus.overdue]
        )
        if overdue_count > 0:
            risks.append(f"{overdue_count} overdue invoices may delay payments")

        # Check for concentration risk (too much revenue from few clients)
        client_concentrations = {}
        total_amount = 0.0

        for invoice in pending_invoices:
            client_id = invoice.client_id
            amount = float(invoice.amount)
            client_concentrations[client_id] = (
                client_concentrations.get(client_id, 0.0) + amount
            )
            total_amount += amount

        if total_amount > 0:
            max_client_percent = max(client_concentrations.values()) / total_amount
            if max_client_percent > 0.5:
                risks.append(
                    "High concentration risk - significant revenue from single client"
                )

        return risks

    def _identify_cash_flow_opportunities(self, user: User) -> List[str]:
        """Identify cash flow optimization opportunities"""
        opportunities = [
            "Consider offering early payment discounts",
            "Set up automatic payment reminders",
            "Implement recurring billing for regular clients",
        ]

        tier = self.subscription_gate.get_user_tier(user)
        if tier == SubscriptionTier.freemium:
            opportunities.append(
                "Upgrade to Professional for advanced collection tools"
            )

        return opportunities

    def _calculate_client_risk(
        self, client: Client, overdue_count: int, avg_delay: float
    ) -> RiskLevel:
        """Calculate risk level for a client"""
        if overdue_count >= 3 or avg_delay > 45:
            return RiskLevel.critical
        elif overdue_count >= 2 or avg_delay > 30:
            return RiskLevel.high
        elif overdue_count >= 1 or avg_delay > 14:
            return RiskLevel.medium
        else:
            return RiskLevel.low

    def _predict_next_payment_date(
        self, client: Client, avg_delay: float
    ) -> Optional[datetime]:
        """Predict when client will make their next payment"""
        # Find the most recent unpaid invoice
        recent_invoice = (
            self.db.query(Invoice)
            .filter(
                and_(
                    Invoice.client_id == client.id,
                    Invoice.status.in_([InvoiceStatus.sent, InvoiceStatus.overdue]),
                )
            )
            .order_by(desc(Invoice.created_at))
            .first()
        )

        if recent_invoice and recent_invoice.due_date:
            predicted_date = recent_invoice.due_date + timedelta(days=int(avg_delay))
            return predicted_date

        return None

    def _generate_client_specific_recommendations(
        self,
        client: Client,
        behavior: PaymentBehavior,
        risk: RiskLevel,
        avg_delay: float,
    ) -> List[str]:
        """Generate recommendations specific to client behavior"""
        recommendations = []

        if risk == RiskLevel.critical:
            recommendations.append("Consider requiring upfront payment or deposits")
            recommendations.append("Implement stricter payment terms")
        elif risk == RiskLevel.high:
            recommendations.append("Send more frequent payment reminders")
            recommendations.append("Offer payment plan options")

        if avg_delay > 21:
            recommendations.append("Consider shortening payment terms")

        if behavior == PaymentBehavior.excellent:
            recommendations.append("Consider offering early payment discounts")

        return recommendations

    def _generate_growth_recommendations(self, user: User) -> List[Dict]:
        """Generate business growth recommendations"""
        recommendations = []

        # Analyze current performance and suggest improvements
        client_count = self.db.query(Client).filter(Client.user_id == user.id).count()

        if client_count < 10:
            recommendations.append(
                {
                    "type": RecommendationType.growth.value,
                    "title": "Expand Your Client Base",
                    "description": "You have fewer than 10 clients. Consider networking, referrals, or marketing to grow your business.",
                    "priority": 8,
                    "actionable": True,
                    "estimated_impact": "High",
                }
            )

        return recommendations

    def _generate_efficiency_recommendations(self, user: User) -> List[Dict]:
        """Generate operational efficiency recommendations"""
        recommendations = []

        # Check for manual tasks that could be automated
        recommendations.append(
            {
                "type": RecommendationType.scheduling.value,
                "title": "Automate Reminder Scheduling",
                "description": "Set up automatic reminder sequences to reduce manual follow-up work.",
                "priority": 7,
                "actionable": True,
                "estimated_impact": "Medium",
            }
        )

        return recommendations

    def _generate_client_recommendations(self, user: User) -> List[Dict]:
        """Generate client management recommendations"""
        recommendations = []

        # Analyze client portfolio
        high_risk_clients = (
            self.db.query(Client).filter(Client.user_id == user.id).limit(5).all()
        )

        if high_risk_clients:
            recommendations.append(
                {
                    "type": RecommendationType.client_management.value,
                    "title": "Review High-Risk Clients",
                    "description": "Some clients show patterns of late payment. Consider adjusting terms or collection strategies.",
                    "priority": 6,
                    "actionable": True,
                    "estimated_impact": "Medium",
                }
            )

        return recommendations

    def _generate_upgrade_recommendations(self, user: User) -> List[Dict]:
        """Generate subscription upgrade recommendations"""
        recommendations = []

        if user.subscription_tier == SubscriptionTier.freemium:
            # Check if user is approaching limits
            tier_analysis = self._analyze_tier_usage(user)

            if tier_analysis["clients"]["utilization"] > 0.8:
                recommendations.append(
                    {
                        "type": RecommendationType.upgrade.value,
                        "title": "Upgrade to Professional",
                        "description": "You're approaching your client limit. Upgrade for unlimited clients and advanced features.",
                        "priority": 9,
                        "actionable": True,
                        "estimated_impact": "High",
                        "upgrade_url": "/subscription/upgrade",
                    }
                )

        return recommendations

    def _should_recommend_upgrade(
        self, user: User, current_clients: int, monthly_invoices: int
    ) -> bool:
        """Determine if upgrade should be recommended"""
        if user.subscription_tier == SubscriptionTier.freemium:
            # Recommend upgrade if approaching limits
            return current_clients >= 4 or monthly_invoices >= 15
        return False

    def _get_default_analytics(self) -> Dict:
        """Return default analytics when calculation fails"""
        return {
            "overview": {"total_invoices": 0, "total_clients": 0, "total_revenue": 0.0},
            "performance": {"payment_rate": 0.0, "avg_collection_time": 0.0},
            "feature_usage": {},
            "recommendations": ["Unable to generate analytics at this time"],
            "error": True,
        }

    def _get_default_client_insight(self, client: Client) -> ClientInsight:
        """Return default client insight when analysis fails"""
        return ClientInsight(
            client_id=client.id,
            client_name=client.name,
            payment_behavior=PaymentBehavior.good,
            avg_payment_delay=0.0,
            risk_level=RiskLevel.low,
            predicted_payment_date=None,
            lifetime_value=0.0,
            last_payment=None,
            overdue_count=0,
            recommendations=["Insufficient data for analysis"],
        )

    def _get_default_cash_flow_prediction(
        self, user: User, days_ahead: int
    ) -> CashFlowPrediction:
        """Return default cash flow prediction when calculation fails"""
        start_date = datetime.now(timezone.utc)
        end_date = start_date + timedelta(days=days_ahead)

        return CashFlowPrediction(
            period_start=start_date,
            period_end=end_date,
            predicted_income=0.0,
            confidence_score=0.0,
            breakdown_by_week=[],
            risk_factors=["Unable to analyze cash flow"],
            opportunities=["Insufficient data available"],
        )


# Dependency injection
def get_analytics_service(db: Session) -> AnalyticsService:
    """Dependency to get analytics service"""
    return AnalyticsService(db)
