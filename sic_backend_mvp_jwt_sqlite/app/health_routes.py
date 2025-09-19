"""
Comprehensive health check endpoints for production monitoring
"""
import asyncio
import os
import socket
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional

import stripe
from fastapi import APIRouter, Depends, HTTPException
from prometheus_client import Counter, Histogram
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.email_provider import get_email_provider
from app.models import User

router = APIRouter()

# Metrics for health checks
health_check_total = Counter(
    'health_check_total',
    'Total health check requests',
    ['endpoint', 'status']
)
health_check_duration = Histogram(
    'health_check_duration_seconds',
    'Health check duration',
    ['component']
)

class HealthChecker:
    """Centralized health checking service"""

    def __init__(self, db: Session):
        self.db = db
        self.checks = {}
        self.start_time = time.time()

    async def check_database(self) -> Dict:
        """Check database connectivity and basic operations"""
        start_time = time.time()
        try:
            # Test basic query
            result = self.db.execute(text("SELECT 1")).scalar()

            # Test table access
            user_count = self.db.query(User).count()

            # Check for recent activity (last 24 hours)
            yesterday = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
            recent_users = self.db.query(User).filter(User.created_at >= yesterday).count()

            duration = time.time() - start_time
            health_check_duration.labels(component='database').observe(duration)

            return {
                "status": "healthy",
                "response_time_ms": round(duration * 1000, 2),
                "total_users": user_count,
                "recent_users_24h": recent_users,
                "details": {
                    "connection": "ok",
                    "basic_query": "ok" if result == 1 else "failed",
                    "table_access": "ok"
                }
            }
        except Exception as e:
            duration = time.time() - start_time
            health_check_duration.labels(component='database').observe(duration)
            return {
                "status": "unhealthy",
                "response_time_ms": round(duration * 1000, 2),
                "error": str(e),
                "details": {
                    "connection": "failed",
                    "error_type": type(e).__name__
                }
            }

    async def check_stripe(self) -> Dict:
        """Check Stripe API connectivity"""
        start_time = time.time()
        try:
            stripe_key = os.getenv("STRIPE_SECRET_KEY")
            if not stripe_key:
                return {
                    "status": "not_configured",
                    "message": "Stripe not configured"
                }

            stripe.api_key = stripe_key

            # Test API call
            account = stripe.Account.retrieve()

            duration = time.time() - start_time
            health_check_duration.labels(component='stripe').observe(duration)

            return {
                "status": "healthy",
                "response_time_ms": round(duration * 1000, 2),
                "account_id": account.id,
                "country": account.country,
                "details": {
                    "api_access": "ok",
                    "account_type": account.type or "unknown"
                }
            }
        except Exception as e:
            duration = time.time() - start_time
            health_check_duration.labels(component='stripe').observe(duration)
            return {
                "status": "unhealthy",
                "response_time_ms": round(duration * 1000, 2),
                "error": str(e),
                "details": {
                    "api_access": "failed",
                    "error_type": type(e).__name__
                }
            }

    async def check_email(self) -> Dict:
        """Check email provider connectivity"""
        start_time = time.time()
        try:
            email_provider = get_email_provider()
            if not email_provider:
                return {
                    "status": "not_configured",
                    "message": "Email provider not configured"
                }

            # Test provider configuration
            provider_name = os.getenv("EMAIL_PROVIDER", "unknown")

            # Basic configuration check
            if provider_name == "postmark":
                token = os.getenv("POSTMARK_SERVER_TOKEN")
                configured = bool(token and token != "pm_xxxxxxxxxxxxxxxxxxxxxxxxxx")
            elif provider_name == "ses":
                region = os.getenv("AWS_REGION")
                configured = bool(region)
            else:
                configured = False

            duration = time.time() - start_time
            health_check_duration.labels(component='email').observe(duration)

            return {
                "status": "healthy" if configured else "misconfigured",
                "response_time_ms": round(duration * 1000, 2),
                "provider": provider_name,
                "details": {
                    "configuration": "ok" if configured else "missing_credentials",
                    "provider_loaded": "ok"
                }
            }
        except Exception as e:
            duration = time.time() - start_time
            health_check_duration.labels(component='email').observe(duration)
            return {
                "status": "unhealthy",
                "response_time_ms": round(duration * 1000, 2),
                "error": str(e),
                "details": {
                    "provider_loaded": "failed",
                    "error_type": type(e).__name__
                }
            }

    async def check_environment(self) -> Dict:
        """Check environment configuration"""
        start_time = time.time()

        required_vars = [
            "SECRET_KEY",
            "DATABASE_URL"
        ]

        optional_vars = [
            "STRIPE_SECRET_KEY",
            "STRIPE_CLIENT_ID",
            "EMAIL_PROVIDER",
            "POSTMARK_SERVER_TOKEN",
            "AWS_REGION"
        ]

        missing_required = []
        present_optional = []

        for var in required_vars:
            value = os.getenv(var)
            if not value or (var == "SECRET_KEY" and len(value) < 32):
                missing_required.append(var)

        for var in optional_vars:
            if os.getenv(var):
                present_optional.append(var)

        duration = time.time() - start_time
        health_check_duration.labels(component='environment').observe(duration)

        status = "healthy" if not missing_required else "unhealthy"

        return {
            "status": status,
            "response_time_ms": round(duration * 1000, 2),
            "required_vars_missing": missing_required,
            "optional_vars_present": present_optional,
            "details": {
                "required_count": len(required_vars) - len(missing_required),
                "total_required": len(required_vars),
                "optional_count": len(present_optional)
            }
        }

    async def check_system_resources(self) -> Dict:
        """Check system resources and performance"""
        start_time = time.time()

        try:
            # Get uptime
            uptime = time.time() - self.start_time

            # Get hostname
            hostname = socket.gethostname()

            # Memory usage (basic check)
            import psutil
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')

            duration = time.time() - start_time
            health_check_duration.labels(component='system').observe(duration)

            # Determine status based on resource usage
            memory_critical = memory.percent > 90
            disk_critical = disk.percent > 90

            if memory_critical or disk_critical:
                status = "critical"
            elif memory.percent > 80 or disk.percent > 80:
                status = "warning"
            else:
                status = "healthy"

            return {
                "status": status,
                "response_time_ms": round(duration * 1000, 2),
                "uptime_seconds": round(uptime, 2),
                "hostname": hostname,
                "resources": {
                    "memory_percent": memory.percent,
                    "memory_available_gb": round(memory.available / (1024**3), 2),
                    "disk_percent": disk.percent,
                    "disk_free_gb": round(disk.free / (1024**3), 2)
                }
            }
        except ImportError:
            # psutil not available, basic check
            duration = time.time() - start_time
            health_check_duration.labels(component='system').observe(duration)

            return {
                "status": "healthy",
                "response_time_ms": round(duration * 1000, 2),
                "uptime_seconds": round(time.time() - self.start_time, 2),
                "hostname": socket.gethostname(),
                "note": "Limited system monitoring (psutil not available)"
            }
        except Exception as e:
            duration = time.time() - start_time
            health_check_duration.labels(component='system').observe(duration)

            return {
                "status": "unhealthy",
                "response_time_ms": round(duration * 1000, 2),
                "error": str(e)
            }


@router.get("/health")
async def basic_health():
    """Basic health check - fast response for load balancers"""
    health_check_total.labels(endpoint='basic', status='success').inc()
    return {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service": "duespark-api"
    }


@router.get("/health/detailed")
async def detailed_health(db: Session = Depends(get_db)):
    """Comprehensive health check with all components"""
    start_time = time.time()
    checker = HealthChecker(db)

    try:
        # Run all health checks concurrently
        results = await asyncio.gather(
            checker.check_database(),
            checker.check_stripe(),
            checker.check_email(),
            checker.check_environment(),
            checker.check_system_resources(),
            return_exceptions=True
        )

        database_health, stripe_health, email_health, env_health, system_health = results

        # Handle any exceptions
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                component_names = ['database', 'stripe', 'email', 'environment', 'system']
                results[i] = {
                    "status": "error",
                    "error": str(result),
                    "component": component_names[i]
                }

        # Determine overall status
        statuses = [r.get("status", "unknown") for r in results if isinstance(r, dict)]

        if "unhealthy" in statuses or "error" in statuses:
            overall_status = "unhealthy"
        elif "critical" in statuses:
            overall_status = "critical"
        elif "warning" in statuses:
            overall_status = "warning"
        elif "misconfigured" in statuses:
            overall_status = "warning"
        else:
            overall_status = "healthy"

        total_duration = time.time() - start_time

        response = {
            "status": overall_status,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "service": "duespark-api",
            "version": "1.0.0",
            "total_check_time_ms": round(total_duration * 1000, 2),
            "components": {
                "database": database_health,
                "stripe": stripe_health,
                "email": email_health,
                "environment": env_health,
                "system": system_health
            }
        }

        health_check_total.labels(endpoint='detailed', status=overall_status).inc()

        # Return appropriate HTTP status
        if overall_status in ["unhealthy", "critical"]:
            raise HTTPException(status_code=503, detail=response)

        return response

    except Exception as e:
        health_check_total.labels(endpoint='detailed', status='error').inc()
        raise HTTPException(
            status_code=500,
            detail={
                "status": "error",
                "error": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )


@router.get("/health/ready")
async def readiness_check(db: Session = Depends(get_db)):
    """Kubernetes readiness probe - checks if service can handle requests"""
    try:
        # Quick database check
        db.execute(text("SELECT 1")).scalar()

        # Check required environment variables
        required_vars = ["SECRET_KEY", "DATABASE_URL"]
        missing = [var for var in required_vars if not os.getenv(var)]

        if missing:
            health_check_total.labels(endpoint='ready', status='not_ready').inc()
            raise HTTPException(
                status_code=503,
                detail={
                    "status": "not_ready",
                    "reason": "missing_environment_variables",
                    "missing_vars": missing
                }
            )

        health_check_total.labels(endpoint='ready', status='ready').inc()
        return {
            "status": "ready",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

    except HTTPException:
        raise
    except Exception as e:
        health_check_total.labels(endpoint='ready', status='error').inc()
        raise HTTPException(
            status_code=503,
            detail={
                "status": "not_ready",
                "reason": "database_connection_failed",
                "error": str(e)
            }
        )


@router.get("/health/live")
async def liveness_check():
    """Kubernetes liveness probe - checks if service is alive"""
    health_check_total.labels(endpoint='live', status='alive').inc()
    return {
        "status": "alive",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "uptime_seconds": round(time.time() - HealthChecker(None).start_time, 2)
    }