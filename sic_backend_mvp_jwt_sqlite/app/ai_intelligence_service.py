"""
Phase 4: AI Intelligence Service
Advanced machine learning and AI capabilities for payment prediction,
business insights, and intelligent automation
"""

import json
import statistics
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from fastapi import Depends
from sqlalchemy import desc, extract, func
from sqlalchemy.orm import Session

from app.analytics_service import ClientInsight, PaymentBehavior, RiskLevel
from app.database import get_db
from app.models import Client, Invoice, InvoiceStatus, Payment, User


@dataclass
class PaymentPrediction:
    """AI-powered payment prediction"""

    invoice_id: int
    predicted_payment_date: datetime
    confidence_score: float  # 0.0 to 1.0
    risk_factors: List[str]
    recommended_actions: List[str]
    payment_probability: float  # 0.0 to 1.0
    predicted_amount: float
    expected_delay_days: int


@dataclass
class DebtCollectionStrategy:
    """AI-recommended debt collection strategy"""

    client_id: int
    strategy_type: str  # "gentle", "standard", "aggressive", "legal"
    contact_frequency: str  # "daily", "weekly", "bi-weekly"
    preferred_channels: List[str]  # ["email", "phone", "sms"]
    escalation_timeline: Dict[str, int]  # Days to escalate
    success_probability: float
    recommended_tone: str


@dataclass
class BusinessInsight:
    """AI-generated business insight"""

    insight_type: str
    title: str
    description: str
    impact_score: int  # 1-10
    urgency: str  # "low", "medium", "high", "critical"
    recommended_actions: List[str]
    potential_value: float  # Estimated financial impact
    confidence: float
    supporting_data: Dict[str, Any]


@dataclass
class CashFlowForecast:
    """Advanced cash flow forecasting with AI"""

    forecast_date: datetime
    predicted_inflow: float
    predicted_outflow: float
    net_cash_flow: float
    confidence_interval: Tuple[float, float]  # (lower, upper)
    risk_factors: List[str]
    opportunities: List[str]
    seasonal_adjustments: Dict[str, float]


class PaymentPredictor:
    """Machine learning payment prediction engine"""

    def __init__(self, db: Session):
        self.db = db

    def predict_payment_date(self, invoice_id: int) -> PaymentPrediction:
        """Predict when an invoice will be paid using ML algorithms"""
        invoice = self.db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not invoice:
            raise ValueError("Invoice not found")

        client = self.db.query(Client).filter(Client.id == invoice.client_id).first()

        # Analyze historical payment patterns
        historical_payments = self._get_client_payment_history(client.id)

        # Calculate base prediction using historical data
        avg_delay = self._calculate_average_delay(historical_payments)
        seasonal_factor = self._get_seasonal_factor(invoice.due_date)
        client_behavior_factor = self._get_client_behavior_factor(client.id)

        # Predict payment date
        predicted_delay = max(0, avg_delay + seasonal_factor + client_behavior_factor)
        predicted_date = invoice.due_date + timedelta(days=predicted_delay)

        # Calculate confidence based on data quality
        confidence = self._calculate_prediction_confidence(historical_payments)

        # Identify risk factors
        risk_factors = self._identify_risk_factors(invoice, client, historical_payments)

        # Generate recommendations
        recommendations = self._generate_payment_recommendations(
            invoice, predicted_delay, risk_factors
        )

        return PaymentPrediction(
            invoice_id=invoice_id,
            predicted_payment_date=predicted_date,
            confidence_score=confidence,
            risk_factors=risk_factors,
            recommended_actions=recommendations,
            payment_probability=max(
                0.1, 1.0 - (predicted_delay / 60)
            ),  # Higher delay = lower probability
            predicted_amount=float(invoice.amount),
            expected_delay_days=int(predicted_delay),
        )

    def _get_client_payment_history(self, client_id: int) -> List[Dict]:
        """Get historical payment data for a client"""
        payments = (
            self.db.query(Invoice)
            .filter(
                Invoice.client_id == client_id,
                Invoice.status == InvoiceStatus.paid,
                Invoice.paid_at.isnot(None),
            )
            .all()
        )

        history = []
        for payment in payments:
            delay = (payment.paid_at.date() - payment.due_date).days
            history.append(
                {
                    "delay_days": delay,
                    "amount": float(payment.amount),
                    "paid_at": payment.paid_at,
                    "invoice_date": payment.created_at,
                }
            )

        return history

    def _calculate_average_delay(self, history: List[Dict]) -> float:
        """Calculate average payment delay"""
        if not history:
            return 7.0  # Default 7 days delay for new clients

        delays = [h["delay_days"] for h in history]
        return statistics.mean(delays)

    def _get_seasonal_factor(self, due_date: datetime) -> float:
        """Apply seasonal adjustments to payment predictions"""
        month = due_date.month

        # Holiday/vacation periods typically have delays
        seasonal_factors = {
            12: 5,  # December - holidays
            1: 3,  # January - post-holiday slowdown
            7: 2,  # July - summer vacation
            8: 2,  # August - summer vacation
            11: 1,  # November - pre-holiday rush
        }

        return seasonal_factors.get(month, 0)

    def _get_client_behavior_factor(self, client_id: int) -> float:
        """Analyze client-specific behavior patterns"""
        recent_invoices = (
            self.db.query(Invoice)
            .filter(
                Invoice.client_id == client_id,
                Invoice.created_at >= datetime.now() - timedelta(days=90),
            )
            .all()
        )

        if not recent_invoices:
            return 0

        # Check for recent late payments
        late_payments = sum(
            1 for inv in recent_invoices if inv.status == InvoiceStatus.overdue
        )

        if late_payments > len(recent_invoices) * 0.5:
            return 10  # Client has recent pattern of late payments

        return -2  # Good recent history

    def _calculate_prediction_confidence(self, history: List[Dict]) -> float:
        """Calculate confidence score based on data quality and consistency"""
        if len(history) < 3:
            return 0.3  # Low confidence with limited data

        delays = [h["delay_days"] for h in history]
        std_dev = statistics.stdev(delays) if len(delays) > 1 else 0

        # Lower standard deviation = higher confidence
        confidence = max(0.3, 1.0 - (std_dev / 30))  # Normalize by 30 days

        # Boost confidence with more data points
        data_boost = min(0.2, len(history) * 0.02)

        return min(0.95, confidence + data_boost)

    def _identify_risk_factors(
        self, invoice: Invoice, client: Client, history: List[Dict]
    ) -> List[str]:
        """Identify risk factors that might delay payment"""
        risk_factors = []

        # High invoice amount
        if invoice.amount > 10000:
            risk_factors.append("High invoice amount may require additional approval")

        # Client payment history
        if history:
            avg_delay = statistics.mean([h["delay_days"] for h in history])
            if avg_delay > 14:
                risk_factors.append("Client has history of late payments")

        # Due date timing
        if invoice.due_date.weekday() >= 5:  # Weekend
            risk_factors.append("Due date falls on weekend")

        # Month-end processing delays
        if invoice.due_date.day > 25:
            risk_factors.append("Due date near month-end may cause processing delays")

        # Currency/international factors
        if invoice.currency != "USD":
            risk_factors.append("International payments may have additional delays")

        return risk_factors

    def _generate_payment_recommendations(
        self, invoice: Invoice, predicted_delay: float, risk_factors: List[str]
    ) -> List[str]:
        """Generate AI recommendations for payment optimization"""
        recommendations = []

        if predicted_delay > 14:
            recommendations.append("Send proactive reminder 3 days before due date")

        if predicted_delay > 30:
            recommendations.append("Consider offering early payment discount")
            recommendations.append("Schedule follow-up call within 1 week of due date")

        if "High invoice amount" in risk_factors:
            recommendations.append("Break down payment into milestones if possible")

        if "Client has history of late payments" in risk_factors:
            recommendations.append("Implement stricter payment terms")
            recommendations.append("Consider requiring upfront payment")

        return recommendations


class DebtCollectionAI:
    """AI-powered debt collection strategy optimization"""

    def __init__(self, db: Session):
        self.db = db

    def recommend_collection_strategy(self, client_id: int) -> DebtCollectionStrategy:
        """Recommend optimal debt collection strategy for a client"""
        client = self.db.query(Client).filter(Client.id == client_id).first()
        if not client:
            raise ValueError("Client not found")

        # Analyze client payment behavior
        payment_history = self._analyze_payment_behavior(client_id)
        overdue_amount = self._get_total_overdue_amount(client_id)
        relationship_duration = self._get_relationship_duration(client_id)

        # Determine strategy based on analysis
        strategy_type = self._determine_strategy_type(
            payment_history, overdue_amount, relationship_duration
        )

        # Optimize contact frequency and channels
        contact_frequency = self._optimize_contact_frequency(
            payment_history, strategy_type
        )
        preferred_channels = self._optimize_communication_channels(client_id)

        # Create escalation timeline
        escalation_timeline = self._create_escalation_timeline(
            strategy_type, overdue_amount
        )

        # Calculate success probability
        success_probability = self._calculate_success_probability(
            strategy_type, payment_history, overdue_amount
        )

        return DebtCollectionStrategy(
            client_id=client_id,
            strategy_type=strategy_type,
            contact_frequency=contact_frequency,
            preferred_channels=preferred_channels,
            escalation_timeline=escalation_timeline,
            success_probability=success_probability,
            recommended_tone=self._recommend_tone(strategy_type, relationship_duration),
        )

    def _analyze_payment_behavior(self, client_id: int) -> Dict:
        """Analyze client's payment behavior patterns"""
        invoices = (
            self.db.query(Invoice)
            .filter(Invoice.client_id == client_id)
            .order_by(desc(Invoice.created_at))
            .limit(20)
            .all()
        )

        if not invoices:
            return {"pattern": "new_client", "reliability": 0.5}

        paid_on_time = sum(
            1
            for inv in invoices
            if inv.status == InvoiceStatus.paid and inv.paid_at <= inv.due_date
        )

        reliability = paid_on_time / len(invoices)

        # Analyze trends
        recent_performance = self._analyze_recent_trends(invoices[-5:])

        return {
            "pattern": self._classify_payment_pattern(reliability),
            "reliability": reliability,
            "recent_trend": recent_performance,
            "total_invoices": len(invoices),
        }

    def _classify_payment_pattern(self, reliability: float) -> str:
        """Classify payment pattern based on reliability score"""
        if reliability >= 0.9:
            return "excellent"
        elif reliability >= 0.7:
            return "good"
        elif reliability >= 0.5:
            return "average"
        elif reliability >= 0.3:
            return "poor"
        else:
            return "problematic"

    def _get_total_overdue_amount(self, client_id: int) -> float:
        """Get total overdue amount for client"""
        overdue_invoices = (
            self.db.query(Invoice)
            .filter(
                Invoice.client_id == client_id, Invoice.status == InvoiceStatus.overdue
            )
            .all()
        )

        return sum(float(inv.amount) for inv in overdue_invoices)

    def _get_relationship_duration(self, client_id: int) -> int:
        """Get relationship duration in months"""
        first_invoice = (
            self.db.query(Invoice)
            .filter(Invoice.client_id == client_id)
            .order_by(Invoice.created_at)
            .first()
        )

        if not first_invoice:
            return 0

        delta = datetime.now() - first_invoice.created_at
        return max(1, delta.days // 30)

    def _determine_strategy_type(
        self, payment_history: Dict, overdue_amount: float, relationship_duration: int
    ) -> str:
        """Determine optimal collection strategy"""
        pattern = payment_history["pattern"]
        reliability = payment_history["reliability"]

        # For new clients or excellent payers, start gentle
        if pattern in ["new_client", "excellent"] or reliability > 0.8:
            return "gentle"

        # For large amounts or poor history, be more aggressive
        if overdue_amount > 50000 or pattern == "problematic":
            return "aggressive"

        # Legal action for very large amounts or persistent issues
        if overdue_amount > 100000 and relationship_duration > 6:
            return "legal"

        return "standard"

    def _optimize_contact_frequency(
        self, payment_history: Dict, strategy_type: str
    ) -> str:
        """Optimize contact frequency based on client profile"""
        frequency_map = {
            "gentle": "weekly",
            "standard": "bi-weekly",
            "aggressive": "daily",
            "legal": "weekly",  # More formal process
        }

        base_frequency = frequency_map[strategy_type]

        # Adjust based on payment pattern
        if payment_history["pattern"] == "excellent":
            return "weekly"  # Less frequent for good clients

        return base_frequency

    def _optimize_communication_channels(self, client_id: int) -> List[str]:
        """Determine optimal communication channels"""
        # Default channels (could be enhanced with client preferences)
        channels = ["email"]

        # Add phone for more serious cases
        overdue_amount = self._get_total_overdue_amount(client_id)
        if overdue_amount > 10000:
            channels.append("phone")

        # Add SMS for urgent cases
        if overdue_amount > 25000:
            channels.append("sms")

        return channels

    def _create_escalation_timeline(
        self, strategy_type: str, overdue_amount: float
    ) -> Dict[str, int]:
        """Create escalation timeline in days"""
        base_timelines = {
            "gentle": {"reminder": 7, "follow_up": 21, "final_notice": 45},
            "standard": {
                "reminder": 3,
                "follow_up": 14,
                "final_notice": 30,
                "collection": 60,
            },
            "aggressive": {
                "reminder": 1,
                "follow_up": 7,
                "final_notice": 14,
                "collection": 21,
            },
            "legal": {"formal_demand": 7, "legal_notice": 21, "litigation": 45},
        }

        timeline = base_timelines[strategy_type].copy()

        # Accelerate for large amounts
        if overdue_amount > 50000:
            timeline = {k: max(1, v // 2) for k, v in timeline.items()}

        return timeline

    def _calculate_success_probability(
        self, strategy_type: str, payment_history: Dict, overdue_amount: float
    ) -> float:
        """Calculate probability of successful collection"""
        base_probabilities = {
            "gentle": 0.8,
            "standard": 0.6,
            "aggressive": 0.4,
            "legal": 0.3,
        }

        base_prob = base_probabilities[strategy_type]

        # Adjust based on payment history
        reliability_factor = payment_history["reliability"]
        base_prob *= 0.5 + reliability_factor

        # Adjust based on amount (larger amounts harder to collect)
        amount_factor = max(0.3, 1.0 - (overdue_amount / 100000))
        base_prob *= amount_factor

        return min(0.95, max(0.05, base_prob))

    def _recommend_tone(self, strategy_type: str, relationship_duration: int) -> str:
        """Recommend communication tone"""
        tone_map = {
            "gentle": "friendly",
            "standard": "neutral",
            "aggressive": "firm",
            "legal": "formal",
        }

        base_tone = tone_map[strategy_type]

        # Be more gentle with long-term clients
        if relationship_duration > 24 and base_tone == "firm":
            return "neutral"

        return base_tone

    def _analyze_recent_trends(self, recent_invoices: List[Invoice]) -> str:
        """Analyze recent payment trends"""
        if not recent_invoices:
            return "unknown"

        paid_count = sum(
            1 for inv in recent_invoices if inv.status == InvoiceStatus.paid
        )

        if paid_count == len(recent_invoices):
            return "improving"
        elif paid_count >= len(recent_invoices) * 0.7:
            return "stable"
        else:
            return "declining"


class BusinessIntelligenceAI:
    """AI-powered business intelligence and insights"""

    def __init__(self, db: Session):
        self.db = db

    def generate_business_insights(
        self, user: User, limit: int = 10
    ) -> List[BusinessInsight]:
        """Generate AI-powered business insights"""
        insights = []

        # Cash flow insights
        insights.extend(self._analyze_cash_flow_patterns(user))

        # Client portfolio insights
        insights.extend(self._analyze_client_portfolio(user))

        # Operational efficiency insights
        insights.extend(self._analyze_operational_efficiency(user))

        # Market opportunity insights
        insights.extend(self._identify_market_opportunities(user))

        # Risk management insights
        insights.extend(self._analyze_business_risks(user))

        # Sort by impact and urgency
        insights.sort(
            key=lambda x: (x.urgency == "critical", x.impact_score), reverse=True
        )

        return insights[:limit]

    def _analyze_cash_flow_patterns(self, user: User) -> List[BusinessInsight]:
        """Analyze cash flow patterns and identify issues/opportunities"""
        insights = []

        # Get cash flow data for analysis
        recent_invoices = (
            self.db.query(Invoice)
            .filter(
                Invoice.user_id == user.id,
                Invoice.created_at >= datetime.now() - timedelta(days=90),
            )
            .all()
        )

        if not recent_invoices:
            return insights

        # Analyze payment timing patterns
        paid_invoices = [
            inv for inv in recent_invoices if inv.status == InvoiceStatus.paid
        ]
        if paid_invoices:
            avg_collection_time = statistics.mean(
                [
                    (inv.paid_at - inv.due_date).days
                    for inv in paid_invoices
                    if inv.paid_at
                ]
            )

            if avg_collection_time > 14:
                insights.append(
                    BusinessInsight(
                        insight_type="cash_flow",
                        title="Slow Payment Collection Detected",
                        description=f"Your average collection time is {avg_collection_time:.1f} days after due date. This impacts cash flow significantly.",
                        impact_score=8,
                        urgency="high",
                        recommended_actions=[
                            "Implement stricter payment terms",
                            "Send earlier reminder notifications",
                            "Offer early payment discounts",
                            "Review client payment terms",
                        ],
                        potential_value=sum(float(inv.amount) for inv in paid_invoices)
                        * 0.02,  # 2% improvement
                        confidence=0.8,
                        supporting_data={"avg_collection_days": avg_collection_time},
                    )
                )

        return insights

    def _analyze_client_portfolio(self, user: User) -> List[BusinessInsight]:
        """Analyze client portfolio for optimization opportunities"""
        insights = []

        # Get client revenue data
        client_revenue = (
            self.db.query(
                Client.id,
                Client.name,
                func.sum(Invoice.amount).label("total_revenue"),
                func.count(Invoice.id).label("invoice_count"),
            )
            .join(Invoice)
            .filter(
                Invoice.user_id == user.id,
                Invoice.created_at >= datetime.now() - timedelta(days=365),
            )
            .group_by(Client.id, Client.name)
            .all()
        )

        if not client_revenue:
            return insights

        # Identify top clients (80/20 rule)
        total_revenue = sum(float(cr.total_revenue) for cr in client_revenue)
        sorted_clients = sorted(
            client_revenue, key=lambda x: float(x.total_revenue), reverse=True
        )

        # Find if 20% of clients generate 80% of revenue
        top_20_percent = max(1, len(sorted_clients) // 5)
        top_clients_revenue = sum(
            float(cr.total_revenue) for cr in sorted_clients[:top_20_percent]
        )

        if top_clients_revenue / total_revenue > 0.8:
            insights.append(
                BusinessInsight(
                    insight_type="client_portfolio",
                    title="High Client Concentration Risk",
                    description=f"Your top {top_20_percent} clients represent {top_clients_revenue/total_revenue*100:.1f}% of revenue. This creates business risk.",
                    impact_score=7,
                    urgency="medium",
                    recommended_actions=[
                        "Diversify client base with targeted marketing",
                        "Develop retention strategies for top clients",
                        "Create backup plans for key client relationships",
                        "Consider client contracts with longer terms",
                    ],
                    potential_value=total_revenue * 0.15,  # Risk mitigation value
                    confidence=0.9,
                    supporting_data={
                        "top_clients_count": top_20_percent,
                        "concentration_percentage": top_clients_revenue
                        / total_revenue
                        * 100,
                    },
                )
            )

        return insights

    def _analyze_operational_efficiency(self, user: User) -> List[BusinessInsight]:
        """Analyze operational efficiency and identify improvements"""
        insights = []

        # Analyze invoice processing efficiency
        recent_invoices = (
            self.db.query(Invoice)
            .filter(
                Invoice.user_id == user.id,
                Invoice.created_at >= datetime.now() - timedelta(days=30),
            )
            .all()
        )

        if len(recent_invoices) > 10:
            # Analyze invoice creation patterns
            invoice_times = [inv.created_at.hour for inv in recent_invoices]

            # Check if invoices are created in batches (efficiency indicator)
            hour_distribution = defaultdict(int)
            for hour in invoice_times:
                hour_distribution[hour] += 1

            peak_hours = [
                hour
                for hour, count in hour_distribution.items()
                if count > len(recent_invoices) * 0.3
            ]

            if len(peak_hours) <= 2:
                insights.append(
                    BusinessInsight(
                        insight_type="operational_efficiency",
                        title="Batch Processing Opportunity",
                        description="You're already doing well with batched invoice processing. Consider automating this further.",
                        impact_score=5,
                        urgency="low",
                        recommended_actions=[
                            "Implement invoice automation tools",
                            "Create invoice templates for common services",
                            "Set up recurring invoice schedules",
                            "Consider API integration for bulk processing",
                        ],
                        potential_value=len(recent_invoices) * 50,  # Time savings value
                        confidence=0.7,
                        supporting_data={"peak_processing_hours": peak_hours},
                    )
                )

        return insights

    def _identify_market_opportunities(self, user: User) -> List[BusinessInsight]:
        """Identify market and growth opportunities"""
        insights = []

        # Analyze client growth trends
        monthly_growth = self._calculate_monthly_growth(user)

        if monthly_growth > 0.1:  # 10% monthly growth
            insights.append(
                BusinessInsight(
                    insight_type="growth_opportunity",
                    title="Strong Growth Trajectory Detected",
                    description=f"Your business is growing at {monthly_growth*100:.1f}% per month. Consider scaling operations.",
                    impact_score=9,
                    urgency="high",
                    recommended_actions=[
                        "Hire additional staff to handle growth",
                        "Invest in automation and scalable systems",
                        "Expand service offerings to existing clients",
                        "Consider new market segments",
                    ],
                    potential_value=self._estimate_growth_value(user, monthly_growth),
                    confidence=0.8,
                    supporting_data={"monthly_growth_rate": monthly_growth},
                )
            )

        return insights

    def _analyze_business_risks(self, user: User) -> List[BusinessInsight]:
        """Analyze business risks and provide mitigation strategies"""
        insights = []

        # Check for overdue invoice risk
        overdue_invoices = (
            self.db.query(Invoice)
            .filter(Invoice.user_id == user.id, Invoice.status == InvoiceStatus.overdue)
            .all()
        )

        if overdue_invoices:
            total_overdue = sum(float(inv.amount) for inv in overdue_invoices)

            # Get total revenue for risk assessment
            total_revenue = (
                self.db.query(func.sum(Invoice.amount))
                .filter(
                    Invoice.user_id == user.id,
                    Invoice.status == InvoiceStatus.paid,
                    Invoice.created_at >= datetime.now() - timedelta(days=365),
                )
                .scalar()
                or 0
            )

            if (
                total_overdue > float(total_revenue) * 0.1
            ):  # More than 10% of annual revenue
                insights.append(
                    BusinessInsight(
                        insight_type="risk_management",
                        title="High Overdue Invoice Risk",
                        description=f"${total_overdue:,.2f} in overdue invoices represents significant cash flow risk.",
                        impact_score=9,
                        urgency="critical",
                        recommended_actions=[
                            "Implement aggressive collection procedures",
                            "Review and tighten credit policies",
                            "Consider factoring or invoice financing",
                            "Require deposits for new projects",
                        ],
                        potential_value=total_overdue * 0.8,  # Potential recovery
                        confidence=0.9,
                        supporting_data={
                            "overdue_amount": total_overdue,
                            "overdue_count": len(overdue_invoices),
                        },
                    )
                )

        return insights

    def _calculate_monthly_growth(self, user: User) -> float:
        """Calculate monthly growth rate"""
        # Get revenue for last 6 months
        monthly_revenue = []
        for i in range(6):
            start_date = datetime.now() - timedelta(days=30 * (i + 1))
            end_date = datetime.now() - timedelta(days=30 * i)

            revenue = (
                self.db.query(func.sum(Invoice.amount))
                .filter(
                    Invoice.user_id == user.id,
                    Invoice.status == InvoiceStatus.paid,
                    Invoice.created_at >= start_date,
                    Invoice.created_at < end_date,
                )
                .scalar()
                or 0
            )

            monthly_revenue.append(float(revenue))

        if len(monthly_revenue) < 2 or monthly_revenue[-1] == 0:
            return 0

        # Calculate average growth rate
        growth_rates = []
        for i in range(1, len(monthly_revenue)):
            if monthly_revenue[i] > 0:
                growth_rate = (
                    monthly_revenue[i - 1] - monthly_revenue[i]
                ) / monthly_revenue[i]
                growth_rates.append(growth_rate)

        return statistics.mean(growth_rates) if growth_rates else 0

    def _estimate_growth_value(self, user: User, growth_rate: float) -> float:
        """Estimate the value of continued growth"""
        current_monthly_revenue = (
            self.db.query(func.sum(Invoice.amount))
            .filter(
                Invoice.user_id == user.id,
                Invoice.status == InvoiceStatus.paid,
                Invoice.created_at >= datetime.now() - timedelta(days=30),
            )
            .scalar()
            or 0
        )

        # Project 12 months of growth
        projected_value = 0
        monthly_revenue = float(current_monthly_revenue)

        for month in range(12):
            monthly_revenue *= 1 + growth_rate
            projected_value += monthly_revenue

        return projected_value - (float(current_monthly_revenue) * 12)


# Dependency injection
def get_payment_predictor(db: Session = Depends(get_db)) -> PaymentPredictor:
    """Get payment predictor service"""
    return PaymentPredictor(db)


def get_debt_collection_ai(db: Session = Depends(get_db)) -> DebtCollectionAI:
    """Get debt collection AI service"""
    return DebtCollectionAI(db)


def get_business_intelligence_ai(
    db: Session = Depends(get_db),
) -> BusinessIntelligenceAI:
    """Get business intelligence AI service"""
    return BusinessIntelligenceAI(db)
