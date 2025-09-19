"""
Phase 4: Enterprise Routes
API endpoints for enterprise multi-tenancy, AI intelligence, security, and advanced analytics
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.advanced_analytics_service import (
    AdvancedAnalyticsService,
    ReportDefinition,
    get_advanced_analytics_service,
)
from app.ai_intelligence_service import (
    BusinessIntelligenceAI,
    DebtCollectionAI,
    PaymentPredictor,
    get_business_intelligence_ai,
    get_debt_collection_ai,
    get_payment_predictor,
)
from app.auth import get_current_user
from app.database import get_db
from app.enterprise_models import AuditEventType, Organization, Team
from app.enterprise_security_service import (
    EnterpriseSecurityService,
    get_enterprise_security_service,
)
from app.infrastructure_service import BackgroundJob, get_infrastructure_service
from app.models import User

router = APIRouter(prefix="/api/enterprise", tags=["enterprise"])


# Request/Response Models
class OrganizationCreate(BaseModel):
    name: str
    slug: str
    tier: str = "starter"


class TeamCreate(BaseModel):
    name: str
    description: Optional[str] = None


class PaymentPredictionRequest(BaseModel):
    invoice_id: int


class CollectionStrategyRequest(BaseModel):
    client_id: int


class BusinessInsightsRequest(BaseModel):
    limit: int = 10
    category: Optional[str] = None


class CustomReportRequest(BaseModel):
    name: str
    description: str
    report_type: str
    data_sources: List[str]
    filters: Dict[str, Any] = {}
    grouping: List[str] = []
    aggregations: Dict[str, str] = {}


class DataExportRequest(BaseModel):
    export_type: str
    format: str = "json"


class AuditLogQuery(BaseModel):
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    event_type: Optional[str] = None
    user_id: Optional[int] = None
    limit: int = 50


# Enterprise Organization Management
@router.post("/organizations")
async def create_organization(
    request: OrganizationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new enterprise organization"""
    try:
        # Check if user has permission to create organizations
        if current_user.role not in ["admin", "owner"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to create organization",
            )

        # Check if slug is available
        existing = (
            db.query(Organization).filter(Organization.slug == request.slug).first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Organization slug already exists",
            )

        organization = Organization(
            name=request.name, slug=request.slug, tier=request.tier
        )

        db.add(organization)
        db.commit()
        db.refresh(organization)

        return {
            "success": True,
            "data": {
                "id": organization.id,
                "name": organization.name,
                "slug": organization.slug,
                "tier": organization.tier,
                "status": organization.status,
            },
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create organization: {str(e)}",
        )


@router.get("/organizations/{org_id}")
async def get_organization(
    org_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get organization details"""
    try:
        organization = db.query(Organization).filter(Organization.id == org_id).first()
        if not organization:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found"
            )

        # Check access permissions
        if current_user.organization_id != org_id and current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this organization",
            )

        return {
            "success": True,
            "data": {
                "id": organization.id,
                "name": organization.name,
                "slug": organization.slug,
                "tier": organization.tier,
                "status": organization.status,
                "user_limit": organization.user_limit,
                "created_at": organization.created_at.isoformat(),
            },
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get organization: {str(e)}",
        )


# AI Intelligence Endpoints
@router.post("/ai/payment-prediction")
async def predict_payment(
    request: PaymentPredictionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get AI-powered payment prediction for an invoice"""
    try:
        predictor = get_payment_predictor(db)
        prediction = predictor.predict_payment_date(request.invoice_id)

        return {
            "success": True,
            "data": {
                "invoice_id": prediction.invoice_id,
                "predicted_payment_date": prediction.predicted_payment_date.isoformat(),
                "confidence_score": prediction.confidence_score,
                "risk_factors": prediction.risk_factors,
                "recommended_actions": prediction.recommended_actions,
                "payment_probability": prediction.payment_probability,
                "expected_delay_days": prediction.expected_delay_days,
            },
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to predict payment: {str(e)}",
        )


@router.post("/ai/collection-strategy")
async def get_collection_strategy(
    request: CollectionStrategyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    collection_ai: DebtCollectionAI = Depends(get_debt_collection_ai),
):
    """Get AI-recommended debt collection strategy"""
    try:
        strategy = collection_ai.recommend_collection_strategy(request.client_id)

        return {
            "success": True,
            "data": {
                "client_id": strategy.client_id,
                "strategy_type": strategy.strategy_type,
                "contact_frequency": strategy.contact_frequency,
                "preferred_channels": strategy.preferred_channels,
                "escalation_timeline": strategy.escalation_timeline,
                "success_probability": strategy.success_probability,
                "recommended_tone": strategy.recommended_tone,
            },
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get collection strategy: {str(e)}",
        )


@router.get("/ai/business-insights")
async def get_business_insights(
    limit: int = Query(10, le=50),
    category: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    bi_ai: BusinessIntelligenceAI = Depends(get_business_intelligence_ai),
):
    """Get AI-powered business insights and recommendations"""
    try:
        insights = bi_ai.generate_business_insights(current_user, limit)

        # Filter by category if specified
        if category:
            insights = [
                insight for insight in insights if insight.insight_type == category
            ]

        insights_data = []
        for insight in insights:
            insights_data.append(
                {
                    "insight_type": insight.insight_type,
                    "title": insight.title,
                    "description": insight.description,
                    "impact_score": insight.impact_score,
                    "urgency": insight.urgency,
                    "recommended_actions": insight.recommended_actions,
                    "potential_value": insight.potential_value,
                    "confidence": insight.confidence,
                    "supporting_data": insight.supporting_data,
                }
            )

        return {
            "success": True,
            "data": {
                "insights": insights_data,
                "total_count": len(insights_data),
                "categories": list(set(i["insight_type"] for i in insights_data)),
            },
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get business insights: {str(e)}",
        )


# Advanced Analytics Endpoints
@router.get("/analytics/real-time-dashboard")
async def get_real_time_dashboard(
    organization_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get real-time analytics dashboard"""
    try:
        analytics = get_advanced_analytics_service(db)
        dashboard_data = analytics.get_real_time_dashboard(
            current_user, organization_id
        )

        return {"success": True, "data": dashboard_data}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get dashboard: {str(e)}",
        )


@router.post("/analytics/custom-report")
async def generate_custom_report(
    request: CustomReportRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    analytics: AdvancedAnalyticsService = Depends(get_advanced_analytics_service),
):
    """Generate custom analytics report"""
    try:
        # Create report definition
        report_def = ReportDefinition(
            report_id=f"custom_{current_user.id}_{int(datetime.now().timestamp())}",
            name=request.name,
            description=request.description,
            report_type=request.report_type,
            data_sources=request.data_sources,
            filters=request.filters,
            grouping=request.grouping,
            aggregations=request.aggregations,
        )

        # For large reports, process in background
        if len(request.data_sources) > 2 or request.report_type == "comprehensive":
            # Queue background job
            job = BackgroundJob(
                job_type="generate_report",
                payload={
                    "user_id": current_user.id,
                    "report_definition": report_def.__dict__,
                },
                priority=2,
            )

            infrastructure = get_infrastructure_service()
            job_id = infrastructure.job_processor.enqueue_job(job)

            return {
                "success": True,
                "data": {
                    "report_id": report_def.report_id,
                    "status": "processing",
                    "job_id": job_id,
                    "message": "Report generation started in background",
                },
            }
        else:
            # Generate immediately for small reports
            report_data = analytics.generate_custom_report(current_user, report_def)

            return {"success": True, "data": report_data}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate report: {str(e)}",
        )


# Security & Compliance Endpoints
@router.get("/security/dashboard")
async def get_security_dashboard(
    organization_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    security: EnterpriseSecurityService = Depends(get_enterprise_security_service),
):
    """Get security dashboard for organization"""
    try:
        org_id = organization_id or current_user.organization_id
        if not org_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Organization ID required",
            )

        dashboard_data = security.get_security_dashboard(org_id)

        return {"success": True, "data": dashboard_data}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get security dashboard: {str(e)}",
        )


@router.get("/security/audit-logs")
async def get_audit_logs(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    event_type: Optional[str] = Query(None),
    user_id: Optional[int] = Query(None),
    limit: int = Query(50, le=500),
    organization_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get audit logs for organization"""
    try:
        org_id = organization_id or current_user.organization_id
        if not org_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Organization ID required",
            )

        # Build query
        query = db.query(AuditLog).filter(AuditLog.organization_id == org_id)

        if start_date:
            query = query.filter(AuditLog.created_at >= start_date)
        if end_date:
            query = query.filter(AuditLog.created_at <= end_date)
        if event_type:
            query = query.filter(AuditLog.event_type == event_type)
        if user_id:
            query = query.filter(AuditLog.user_id == user_id)

        audit_logs = query.order_by(AuditLog.created_at.desc()).limit(limit).all()

        logs_data = []
        for log in audit_logs:
            logs_data.append(
                {
                    "id": log.id,
                    "event_type": log.event_type.value,
                    "resource_type": log.resource_type,
                    "resource_id": log.resource_id,
                    "description": log.description,
                    "user_id": log.user_id,
                    "ip_address": log.ip_address,
                    "risk_score": log.risk_score,
                    "created_at": log.created_at.isoformat(),
                    "metadata": log.metadata,
                }
            )

        return {
            "success": True,
            "data": {
                "audit_logs": logs_data,
                "total_count": len(logs_data),
                "filters_applied": {
                    "start_date": start_date.isoformat() if start_date else None,
                    "end_date": end_date.isoformat() if end_date else None,
                    "event_type": event_type,
                    "user_id": user_id,
                },
            },
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get audit logs: {str(e)}",
        )


@router.post("/security/data-export")
async def request_data_export(
    request: DataExportRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    security: EnterpriseSecurityService = Depends(get_enterprise_security_service),
):
    """Request GDPR-compliant data export"""
    try:
        org_id = current_user.organization_id
        if not org_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Organization ID required",
            )

        export = security.request_data_export(
            organization_id=org_id,
            user_id=current_user.id,
            export_type=request.export_type,
            format=request.format,
        )

        return {
            "success": True,
            "data": {
                "export_id": export.id,
                "filename": export.filename,
                "status": export.status,
                "expires_at": export.expires_at.isoformat(),
                "message": "Data export request submitted. You will be notified when ready.",
            },
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to request data export: {str(e)}",
        )


@router.get("/security/compliance-report")
async def get_compliance_report(
    organization_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    security: EnterpriseSecurityService = Depends(get_enterprise_security_service),
):
    """Generate compliance report"""
    try:
        org_id = organization_id or current_user.organization_id
        if not org_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Organization ID required",
            )

        report = security.generate_compliance_report(org_id)

        return {
            "success": True,
            "data": {
                "report_type": report.report_type,
                "organization_id": report.organization_id,
                "data_subjects": report.data_subjects,
                "data_categories": report.data_categories,
                "compliance_status": {
                    "retention_compliance": report.retention_compliance,
                    "encryption_compliance": report.encryption_compliance,
                    "access_log_compliance": report.access_log_compliance,
                },
                "findings": report.findings,
                "recommendations": report.recommendations,
                "generated_at": report.generated_at.isoformat(),
            },
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate compliance report: {str(e)}",
        )


# Infrastructure & Performance Endpoints
@router.get("/infrastructure/performance")
async def get_performance_metrics(current_user: User = Depends(get_current_user)):
    """Get infrastructure performance metrics"""
    try:
        infrastructure = get_infrastructure_service()
        dashboard_data = infrastructure.performance_monitor.get_performance_dashboard()

        return {"success": True, "data": dashboard_data}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get performance metrics: {str(e)}",
        )


@router.get("/infrastructure/cache-status")
async def get_cache_status(current_user: User = Depends(get_current_user)):
    """Get cache system status"""
    try:
        infrastructure = get_infrastructure_service()
        cache_available = infrastructure.cache.available

        return {
            "success": True,
            "data": {
                "cache_available": cache_available,
                "cache_type": "Redis" if cache_available else "Memory",
                "status": "healthy" if cache_available else "degraded",
            },
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get cache status: {str(e)}",
        )


@router.post("/infrastructure/background-job")
async def enqueue_background_job(
    job_type: str,
    payload: Dict[str, Any],
    priority: int = 2,
    current_user: User = Depends(get_current_user),
):
    """Enqueue a background job"""
    try:
        job = BackgroundJob(job_type=job_type, payload=payload, priority=priority)

        infrastructure = get_infrastructure_service()
        job_id = infrastructure.job_processor.enqueue_job(job)

        return {
            "success": True,
            "data": {
                "job_id": job_id,
                "status": "enqueued",
                "message": f"Background job {job_type} enqueued successfully",
            },
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to enqueue job: {str(e)}",
        )


# Health check for enterprise features
@router.get("/health")
async def enterprise_health_check():
    """Enterprise features health check"""
    try:
        infrastructure = get_infrastructure_service()

        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "services": {
                "cache": "healthy" if infrastructure.cache.available else "degraded",
                "background_jobs": "healthy",
                "ai_intelligence": "healthy",
                "security": "healthy",
                "analytics": "healthy",
            },
            "version": "4.0.0",
            "features": [
                "enterprise_multi_tenancy",
                "ai_intelligence",
                "advanced_security",
                "real_time_analytics",
                "scalable_infrastructure",
            ],
        }

    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat(),
        }
