"""
Phase 4: Advanced Analytics & Business Intelligence Engine
Real-time dashboards, custom reporting, predictive analytics, and data visualization
"""

import json
import math
import statistics
from collections import defaultdict
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from fastapi import Depends
from sqlalchemy import desc, extract, func, text
from sqlalchemy.orm import Session

from app.database import get_db
from app.enterprise_models import AuditLog, Organization, Team
from app.models import Client, Invoice, InvoiceStatus, Payment, User


@dataclass
class KPI:
    """Key Performance Indicator"""

    name: str
    value: float
    previous_value: float
    change_percentage: float
    trend: str  # "up", "down", "stable"
    target: Optional[float] = None
    unit: str = ""
    category: str = "financial"


@dataclass
class DashboardWidget:
    """Dashboard widget configuration"""

    widget_id: str
    widget_type: str  # "kpi", "chart", "table", "metric"
    title: str
    data: Dict[str, Any]
    config: Dict[str, Any]
    position: Dict[str, int]  # x, y, width, height
    refresh_interval: int = 300  # seconds


@dataclass
class ReportDefinition:
    """Custom report definition"""

    report_id: str
    name: str
    description: str
    report_type: str  # "financial", "operational", "compliance", "custom"
    data_sources: List[str]
    filters: Dict[str, Any]
    grouping: List[str]
    aggregations: Dict[str, str]
    schedule: Optional[Dict[str, Any]]
    format: str = "json"


@dataclass
class BusinessMetric:
    """Advanced business metric"""

    metric_name: str
    value: float
    benchmark: Optional[float]
    industry_average: Optional[float]
    percentile: Optional[int]
    trend_data: List[Dict[str, Any]]
    insights: List[str]
    recommendations: List[str]


class AdvancedAnalyticsService:
    """Advanced analytics and business intelligence service"""

    def __init__(self, db: Session):
        self.db = db

    def get_real_time_dashboard(
        self, user: User, organization_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """Get real-time dashboard with live KPIs and metrics"""

        org_id = organization_id or user.organization_id
        if not org_id:
            org_id = None  # Personal dashboard

        # Core financial KPIs
        financial_kpis = self._calculate_financial_kpis(user, org_id)

        # Operational KPIs
        operational_kpis = self._calculate_operational_kpis(user, org_id)

        # Growth metrics
        growth_metrics = self._calculate_growth_metrics(user, org_id)

        # Real-time activity feed
        activity_feed = self._get_real_time_activity(user, org_id)

        # Performance trends
        performance_trends = self._calculate_performance_trends(user, org_id)

        return {
            "dashboard_id": f"dashboard_{user.id}_{org_id or 'personal'}",
            "generated_at": datetime.now().isoformat(),
            "kpis": {
                "financial": financial_kpis,
                "operational": operational_kpis,
                "growth": growth_metrics,
            },
            "widgets": self._generate_dashboard_widgets(user, org_id),
            "activity_feed": activity_feed,
            "performance_trends": performance_trends,
            "alerts": self._generate_dashboard_alerts(user, org_id),
        }

    def _calculate_financial_kpis(self, user: User, org_id: Optional[int]) -> List[KPI]:
        """Calculate financial KPIs"""
        kpis = []

        # Current month revenue
        current_month_revenue = self._get_revenue_for_period(
            user, org_id, datetime.now().replace(day=1), datetime.now()
        )
        previous_month_revenue = self._get_revenue_for_period(
            user,
            org_id,
            (datetime.now().replace(day=1) - timedelta(days=1)).replace(day=1),
            datetime.now().replace(day=1) - timedelta(days=1),
        )

        revenue_change = self._calculate_percentage_change(
            current_month_revenue, previous_month_revenue
        )

        kpis.append(
            KPI(
                name="Monthly Revenue",
                value=current_month_revenue,
                previous_value=previous_month_revenue,
                change_percentage=revenue_change,
                trend=(
                    "up"
                    if revenue_change > 0
                    else "down" if revenue_change < 0 else "stable"
                ),
                unit="USD",
                category="financial",
            )
        )

        # Outstanding receivables
        outstanding_amount = self._get_outstanding_receivables(user, org_id)
        previous_outstanding = self._get_outstanding_receivables_for_date(
            user, org_id, datetime.now() - timedelta(days=30)
        )

        outstanding_change = self._calculate_percentage_change(
            outstanding_amount, previous_outstanding
        )

        kpis.append(
            KPI(
                name="Outstanding Receivables",
                value=outstanding_amount,
                previous_value=previous_outstanding,
                change_percentage=outstanding_change,
                trend=(
                    "down"
                    if outstanding_change < 0
                    else "up" if outstanding_change > 0 else "stable"
                ),
                unit="USD",
                category="financial",
            )
        )

        # Average collection time
        avg_collection_time = self._calculate_average_collection_time(user, org_id)
        previous_avg_collection = self._calculate_average_collection_time(
            user, org_id, end_date=datetime.now() - timedelta(days=30)
        )

        collection_change = self._calculate_percentage_change(
            avg_collection_time, previous_avg_collection
        )

        kpis.append(
            KPI(
                name="Avg Collection Time",
                value=avg_collection_time,
                previous_value=previous_avg_collection,
                change_percentage=collection_change,
                trend=(
                    "down"
                    if collection_change < 0
                    else "up" if collection_change > 0 else "stable"
                ),
                target=21.0,  # Target 21 days
                unit="days",
                category="financial",
            )
        )

        return kpis

    def _calculate_operational_kpis(
        self, user: User, org_id: Optional[int]
    ) -> List[KPI]:
        """Calculate operational KPIs"""
        kpis = []

        # Invoice processing efficiency
        current_month_invoices = self._get_invoice_count_for_period(
            user, org_id, datetime.now().replace(day=1), datetime.now()
        )
        previous_month_invoices = self._get_invoice_count_for_period(
            user,
            org_id,
            (datetime.now().replace(day=1) - timedelta(days=1)).replace(day=1),
            datetime.now().replace(day=1) - timedelta(days=1),
        )

        invoice_change = self._calculate_percentage_change(
            current_month_invoices, previous_month_invoices
        )

        kpis.append(
            KPI(
                name="Monthly Invoices",
                value=current_month_invoices,
                previous_value=previous_month_invoices,
                change_percentage=invoice_change,
                trend=(
                    "up"
                    if invoice_change > 0
                    else "down" if invoice_change < 0 else "stable"
                ),
                unit="count",
                category="operational",
            )
        )

        # Client acquisition rate
        new_clients = self._get_new_clients_count(user, org_id, days=30)
        previous_new_clients = self._get_new_clients_count(
            user, org_id, days=30, offset_days=30
        )

        client_acquisition_change = self._calculate_percentage_change(
            new_clients, previous_new_clients
        )

        kpis.append(
            KPI(
                name="New Clients (30d)",
                value=new_clients,
                previous_value=previous_new_clients,
                change_percentage=client_acquisition_change,
                trend=(
                    "up"
                    if client_acquisition_change > 0
                    else "down" if client_acquisition_change < 0 else "stable"
                ),
                unit="count",
                category="operational",
            )
        )

        # Payment success rate
        payment_rate = self._calculate_payment_success_rate(user, org_id)
        previous_payment_rate = self._calculate_payment_success_rate(
            user, org_id, end_date=datetime.now() - timedelta(days=30)
        )

        payment_rate_change = self._calculate_percentage_change(
            payment_rate, previous_payment_rate
        )

        kpis.append(
            KPI(
                name="Payment Success Rate",
                value=payment_rate,
                previous_value=previous_payment_rate,
                change_percentage=payment_rate_change,
                trend=(
                    "up"
                    if payment_rate_change > 0
                    else "down" if payment_rate_change < 0 else "stable"
                ),
                target=85.0,  # Target 85% success rate
                unit="%",
                category="operational",
            )
        )

        return kpis

    def _calculate_growth_metrics(self, user: User, org_id: Optional[int]) -> List[KPI]:
        """Calculate growth metrics"""
        kpis = []

        # Monthly recurring revenue growth
        mrr_growth = self._calculate_mrr_growth(user, org_id)

        kpis.append(
            KPI(
                name="MRR Growth",
                value=mrr_growth,
                previous_value=0,  # Growth rate, no previous comparison
                change_percentage=0,
                trend=(
                    "up" if mrr_growth > 0 else "down" if mrr_growth < 0 else "stable"
                ),
                target=10.0,  # Target 10% monthly growth
                unit="%",
                category="growth",
            )
        )

        # Customer lifetime value
        clv = self._calculate_customer_lifetime_value(user, org_id)

        kpis.append(
            KPI(
                name="Customer LTV",
                value=clv,
                previous_value=0,
                change_percentage=0,
                trend="stable",
                unit="USD",
                category="growth",
            )
        )

        return kpis

    def _generate_dashboard_widgets(
        self, user: User, org_id: Optional[int]
    ) -> List[DashboardWidget]:
        """Generate dashboard widgets"""
        widgets = []

        # Revenue trend chart
        revenue_trend_data = self._get_revenue_trend_data(user, org_id, days=90)
        widgets.append(
            DashboardWidget(
                widget_id="revenue_trend",
                widget_type="chart",
                title="Revenue Trend (90 days)",
                data={
                    "chart_type": "line",
                    "datasets": [
                        {
                            "label": "Daily Revenue",
                            "data": revenue_trend_data,
                            "borderColor": "#3B82F6",
                            "backgroundColor": "rgba(59, 130, 246, 0.1)",
                        }
                    ],
                },
                config={
                    "responsive": True,
                    "scales": {
                        "y": {
                            "beginAtZero": True,
                            "title": {"display": True, "text": "Revenue ($)"},
                        }
                    },
                },
                position={"x": 0, "y": 0, "width": 6, "height": 4},
            )
        )

        # Client distribution pie chart
        client_distribution = self._get_client_distribution_data(user, org_id)
        widgets.append(
            DashboardWidget(
                widget_id="client_distribution",
                widget_type="chart",
                title="Client Revenue Distribution",
                data={
                    "chart_type": "pie",
                    "datasets": [
                        {
                            "data": [d["value"] for d in client_distribution],
                            "backgroundColor": [
                                "#3B82F6",
                                "#10B981",
                                "#F59E0B",
                                "#EF4444",
                                "#8B5CF6",
                            ],
                        }
                    ],
                    "labels": [d["label"] for d in client_distribution],
                },
                config={
                    "responsive": True,
                    "plugins": {"legend": {"position": "bottom"}},
                },
                position={"x": 6, "y": 0, "width": 6, "height": 4},
            )
        )

        # Collection performance table
        collection_data = self._get_collection_performance_data(user, org_id)
        widgets.append(
            DashboardWidget(
                widget_id="collection_performance",
                widget_type="table",
                title="Collection Performance",
                data={
                    "headers": ["Client", "Outstanding", "Avg Days", "Last Payment"],
                    "rows": collection_data,
                },
                config={"sortable": True, "filterable": True},
                position={"x": 0, "y": 4, "width": 12, "height": 3},
            )
        )

        return widgets

    def _get_real_time_activity(
        self, user: User, org_id: Optional[int]
    ) -> List[Dict[str, Any]]:
        """Get real-time activity feed"""
        activities = []

        # Recent invoices
        recent_invoices = (
            self.db.query(Invoice)
            .filter(
                Invoice.user_id == user.id if not org_id else True,
                Invoice.created_at >= datetime.now() - timedelta(hours=24),
            )
            .order_by(desc(Invoice.created_at))
            .limit(10)
            .all()
        )

        for invoice in recent_invoices:
            activities.append(
                {
                    "type": "invoice_created",
                    "description": f"Invoice #{invoice.number} created for ${invoice.amount}",
                    "timestamp": invoice.created_at.isoformat(),
                    "data": {"invoice_id": invoice.id, "amount": float(invoice.amount)},
                }
            )

        # Recent payments
        recent_payments = (
            self.db.query(Invoice)
            .filter(
                Invoice.user_id == user.id if not org_id else True,
                Invoice.status == InvoiceStatus.paid,
                Invoice.paid_at >= datetime.now() - timedelta(hours=24),
            )
            .order_by(desc(Invoice.paid_at))
            .limit(10)
            .all()
        )

        for payment in recent_payments:
            activities.append(
                {
                    "type": "payment_received",
                    "description": f"Payment received for Invoice #{payment.number} - ${payment.amount}",
                    "timestamp": payment.paid_at.isoformat(),
                    "data": {"invoice_id": payment.id, "amount": float(payment.amount)},
                }
            )

        # Sort by timestamp
        activities.sort(key=lambda x: x["timestamp"], reverse=True)

        return activities[:20]  # Return last 20 activities

    def _calculate_performance_trends(
        self, user: User, org_id: Optional[int]
    ) -> Dict[str, Any]:
        """Calculate performance trends"""
        trends = {}

        # Revenue trend (12 months)
        monthly_revenue = []
        for i in range(12):
            month_start = (
                datetime.now().replace(day=1) - timedelta(days=30 * i)
            ).replace(day=1)
            month_end = (month_start + timedelta(days=32)).replace(day=1) - timedelta(
                days=1
            )
            revenue = self._get_revenue_for_period(user, org_id, month_start, month_end)
            monthly_revenue.append(
                {"month": month_start.strftime("%Y-%m"), "revenue": revenue}
            )

        trends["revenue_12m"] = list(reversed(monthly_revenue))

        # Collection time trend
        collection_trend = []
        for i in range(6):
            month_start = (
                datetime.now().replace(day=1) - timedelta(days=30 * i)
            ).replace(day=1)
            month_end = (month_start + timedelta(days=32)).replace(day=1) - timedelta(
                days=1
            )
            avg_time = self._calculate_average_collection_time(
                user, org_id, month_start, month_end
            )
            collection_trend.append(
                {
                    "month": month_start.strftime("%Y-%m"),
                    "avg_collection_days": avg_time,
                }
            )

        trends["collection_time_6m"] = list(reversed(collection_trend))

        return trends

    def _generate_dashboard_alerts(
        self, user: User, org_id: Optional[int]
    ) -> List[Dict[str, Any]]:
        """Generate dashboard alerts"""
        alerts = []

        # Check for overdue invoices
        overdue_count = (
            self.db.query(Invoice)
            .filter(
                Invoice.user_id == user.id if not org_id else True,
                Invoice.status == InvoiceStatus.overdue,
            )
            .count()
        )

        if overdue_count > 0:
            alerts.append(
                {
                    "type": "warning",
                    "title": "Overdue Invoices",
                    "message": f"You have {overdue_count} overdue invoices requiring attention",
                    "action": {"type": "navigate", "url": "/invoices?status=overdue"},
                    "priority": "high",
                }
            )

        # Check for cash flow issues
        outstanding_amount = self._get_outstanding_receivables(user, org_id)
        if outstanding_amount > 50000:  # Threshold for alert
            alerts.append(
                {
                    "type": "info",
                    "title": "High Outstanding Receivables",
                    "message": f"${outstanding_amount:,.2f} in outstanding receivables detected",
                    "action": {"type": "navigate", "url": "/analytics/cash-flow"},
                    "priority": "medium",
                }
            )

        return alerts

    def generate_custom_report(
        self, user: User, report_definition: ReportDefinition
    ) -> Dict[str, Any]:
        """Generate custom report based on definition"""

        # Validate user access to report data
        if not self._validate_report_access(user, report_definition):
            raise ValueError("Insufficient permissions for this report")

        # Execute report query
        report_data = self._execute_report_query(user, report_definition)

        # Apply aggregations
        aggregated_data = self._apply_report_aggregations(
            report_data, report_definition
        )

        # Generate insights
        insights = self._generate_report_insights(aggregated_data, report_definition)

        return {
            "report_id": report_definition.report_id,
            "generated_at": datetime.now().isoformat(),
            "report_definition": asdict(report_definition),
            "data": aggregated_data,
            "insights": insights,
            "metadata": {
                "total_records": len(report_data),
                "filters_applied": report_definition.filters,
                "grouping": report_definition.grouping,
            },
        }

    def _validate_report_access(
        self, user: User, report_definition: ReportDefinition
    ) -> bool:
        """Validate user access to report data"""
        # In a real implementation, check user permissions
        return True

    def _execute_report_query(
        self, user: User, report_definition: ReportDefinition
    ) -> List[Dict[str, Any]]:
        """Execute report query based on data sources and filters"""
        data = []

        if "invoices" in report_definition.data_sources:
            # Get invoice data
            invoices = self.db.query(Invoice).filter(Invoice.user_id == user.id).all()

            for invoice in invoices:
                if self._apply_report_filters(invoice, report_definition.filters):
                    data.append(
                        {
                            "source": "invoices",
                            "invoice_id": invoice.id,
                            "amount": float(invoice.amount),
                            "status": invoice.status.value,
                            "created_at": invoice.created_at,
                            "due_date": invoice.due_date,
                            "paid_at": invoice.paid_at,
                            "client_id": invoice.client_id,
                        }
                    )

        return data

    def _apply_report_filters(self, record: Any, filters: Dict[str, Any]) -> bool:
        """Apply filters to a record"""
        # Simplified filter application
        return True

    def _apply_report_aggregations(
        self, data: List[Dict[str, Any]], report_definition: ReportDefinition
    ) -> Dict[str, Any]:
        """Apply aggregations to report data"""
        if not report_definition.grouping:
            return {"data": data}

        # Group data
        grouped_data = defaultdict(list)
        for record in data:
            group_key = tuple(
                str(record.get(field, "")) for field in report_definition.grouping
            )
            grouped_data[group_key].append(record)

        # Apply aggregations
        aggregated = {}
        for group_key, group_records in grouped_data.items():
            group_dict = dict(zip(report_definition.grouping, group_key))

            # Apply aggregation functions
            for field, agg_func in report_definition.aggregations.items():
                if agg_func == "sum":
                    group_dict[f"{field}_sum"] = sum(
                        float(r.get(field, 0)) for r in group_records
                    )
                elif agg_func == "avg":
                    values = [float(r.get(field, 0)) for r in group_records]
                    group_dict[f"{field}_avg"] = (
                        statistics.mean(values) if values else 0
                    )
                elif agg_func == "count":
                    group_dict[f"{field}_count"] = len(group_records)

            aggregated[group_key] = group_dict

        return {"grouped_data": list(aggregated.values())}

    def _generate_report_insights(
        self, data: Dict[str, Any], report_definition: ReportDefinition
    ) -> List[str]:
        """Generate insights from report data"""
        insights = []

        # Example insights based on report type
        if report_definition.report_type == "financial":
            insights.append("Financial performance analysis completed")

        if "grouped_data" in data and len(data["grouped_data"]) > 0:
            insights.append(
                f"Data analyzed across {len(data['grouped_data'])} segments"
            )

        return insights

    # Helper methods for calculations
    def _get_revenue_for_period(
        self,
        user: User,
        org_id: Optional[int],
        start_date: datetime,
        end_date: datetime,
    ) -> float:
        """Get revenue for a specific period"""
        query = self.db.query(func.sum(Invoice.amount)).filter(
            Invoice.user_id == user.id if not org_id else True,
            Invoice.status == InvoiceStatus.paid,
            Invoice.paid_at >= start_date,
            Invoice.paid_at <= end_date,
        )

        result = query.scalar()
        return float(result) if result else 0.0

    def _get_outstanding_receivables(self, user: User, org_id: Optional[int]) -> float:
        """Get current outstanding receivables"""
        query = self.db.query(func.sum(Invoice.amount)).filter(
            Invoice.user_id == user.id if not org_id else True,
            Invoice.status.in_([InvoiceStatus.pending, InvoiceStatus.overdue]),
        )

        result = query.scalar()
        return float(result) if result else 0.0

    def _get_outstanding_receivables_for_date(
        self, user: User, org_id: Optional[int], date: datetime
    ) -> float:
        """Get outstanding receivables for a specific date"""
        # Simplified - in reality would need historical data tracking
        return self._get_outstanding_receivables(user, org_id)

    def _calculate_average_collection_time(
        self,
        user: User,
        org_id: Optional[int],
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> float:
        """Calculate average collection time"""
        query = self.db.query(Invoice).filter(
            Invoice.user_id == user.id if not org_id else True,
            Invoice.status == InvoiceStatus.paid,
            Invoice.paid_at.isnot(None),
        )

        if start_date:
            query = query.filter(Invoice.paid_at >= start_date)
        if end_date:
            query = query.filter(Invoice.paid_at <= end_date)

        invoices = query.all()

        if not invoices:
            return 0.0

        total_days = sum((inv.paid_at.date() - inv.due_date).days for inv in invoices)
        return total_days / len(invoices)

    def _calculate_percentage_change(self, current: float, previous: float) -> float:
        """Calculate percentage change"""
        if previous == 0:
            return 100.0 if current > 0 else 0.0
        return ((current - previous) / previous) * 100

    def _get_invoice_count_for_period(
        self,
        user: User,
        org_id: Optional[int],
        start_date: datetime,
        end_date: datetime,
    ) -> int:
        """Get invoice count for period"""
        query = self.db.query(Invoice).filter(
            Invoice.user_id == user.id if not org_id else True,
            Invoice.created_at >= start_date,
            Invoice.created_at <= end_date,
        )

        return query.count()

    def _get_new_clients_count(
        self, user: User, org_id: Optional[int], days: int, offset_days: int = 0
    ) -> int:
        """Get new clients count"""
        start_date = datetime.now() - timedelta(days=days + offset_days)
        end_date = datetime.now() - timedelta(days=offset_days)

        query = self.db.query(Client).filter(
            Client.user_id == user.id if not org_id else True,
            Client.created_at >= start_date,
            Client.created_at <= end_date,
        )

        return query.count()

    def _calculate_payment_success_rate(
        self, user: User, org_id: Optional[int], end_date: Optional[datetime] = None
    ) -> float:
        """Calculate payment success rate"""
        cutoff_date = end_date or datetime.now()
        start_date = cutoff_date - timedelta(days=30)

        total_invoices = (
            self.db.query(Invoice)
            .filter(
                Invoice.user_id == user.id if not org_id else True,
                Invoice.created_at >= start_date,
                Invoice.created_at <= cutoff_date,
            )
            .count()
        )

        paid_invoices = (
            self.db.query(Invoice)
            .filter(
                Invoice.user_id == user.id if not org_id else True,
                Invoice.status == InvoiceStatus.paid,
                Invoice.created_at >= start_date,
                Invoice.created_at <= cutoff_date,
            )
            .count()
        )

        if total_invoices == 0:
            return 0.0

        return (paid_invoices / total_invoices) * 100

    def _calculate_mrr_growth(self, user: User, org_id: Optional[int]) -> float:
        """Calculate monthly recurring revenue growth"""
        # Simplified calculation - in reality would need subscription data
        current_month_revenue = self._get_revenue_for_period(
            user, org_id, datetime.now().replace(day=1), datetime.now()
        )
        previous_month_revenue = self._get_revenue_for_period(
            user,
            org_id,
            (datetime.now().replace(day=1) - timedelta(days=1)).replace(day=1),
            datetime.now().replace(day=1) - timedelta(days=1),
        )

        return self._calculate_percentage_change(
            current_month_revenue, previous_month_revenue
        )

    def _calculate_customer_lifetime_value(
        self, user: User, org_id: Optional[int]
    ) -> float:
        """Calculate customer lifetime value"""
        # Get average revenue per client
        clients = (
            self.db.query(Client)
            .filter(Client.user_id == user.id if not org_id else True)
            .all()
        )

        if not clients:
            return 0.0

        total_revenue = 0
        for client in clients:
            client_revenue = (
                self.db.query(func.sum(Invoice.amount))
                .filter(
                    Invoice.client_id == client.id, Invoice.status == InvoiceStatus.paid
                )
                .scalar()
                or 0
            )
            total_revenue += float(client_revenue)

        return total_revenue / len(clients)

    def _get_revenue_trend_data(
        self, user: User, org_id: Optional[int], days: int
    ) -> List[Dict[str, Any]]:
        """Get revenue trend data for charts"""
        trend_data = []

        for i in range(days):
            date = datetime.now().date() - timedelta(days=i)
            daily_revenue = (
                self.db.query(func.sum(Invoice.amount))
                .filter(
                    Invoice.user_id == user.id if not org_id else True,
                    Invoice.status == InvoiceStatus.paid,
                    func.date(Invoice.paid_at) == date,
                )
                .scalar()
                or 0
            )

            trend_data.append({"x": date.isoformat(), "y": float(daily_revenue)})

        return list(reversed(trend_data))

    def _get_client_distribution_data(
        self, user: User, org_id: Optional[int]
    ) -> List[Dict[str, Any]]:
        """Get client revenue distribution data"""
        # Get top 5 clients by revenue
        client_revenue = (
            self.db.query(Client.name, func.sum(Invoice.amount).label("total_revenue"))
            .join(Invoice)
            .filter(
                Invoice.user_id == user.id if not org_id else True,
                Invoice.status == InvoiceStatus.paid,
            )
            .group_by(Client.id, Client.name)
            .order_by(desc("total_revenue"))
            .limit(5)
            .all()
        )

        return [
            {"label": cr.name, "value": float(cr.total_revenue)}
            for cr in client_revenue
        ]

    def _get_collection_performance_data(
        self, user: User, org_id: Optional[int]
    ) -> List[List[str]]:
        """Get collection performance table data"""
        # Get clients with outstanding invoices
        clients_data = (
            self.db.query(
                Client.name,
                func.sum(Invoice.amount).label("outstanding"),
                func.avg(
                    func.extract("epoch", Invoice.paid_at)
                    - func.extract("epoch", Invoice.due_date)
                ).label("avg_days"),
            )
            .join(Invoice)
            .filter(
                Invoice.user_id == user.id if not org_id else True,
                Invoice.status.in_([InvoiceStatus.pending, InvoiceStatus.overdue]),
            )
            .group_by(Client.id, Client.name)
            .limit(10)
            .all()
        )

        rows = []
        for client_data in clients_data:
            rows.append(
                [
                    client_data.name,
                    f"${client_data.outstanding:,.2f}",
                    f"{client_data.avg_days or 0:.0f}",
                    "2024-09-14",  # Placeholder
                ]
            )

        return rows


# Dependency injection
def get_advanced_analytics_service(
    db: Session = Depends(get_db),
) -> AdvancedAnalyticsService:
    """Get advanced analytics service"""
    return AdvancedAnalyticsService(db)
