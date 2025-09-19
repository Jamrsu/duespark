"""
Phase 4: Enterprise Security & Compliance Service
Advanced security features, audit logging, GDPR compliance, and enterprise-grade authentication
"""

import hashlib
import json
import re
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

from fastapi import Depends
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.database import get_db
from app.enterprise_models import (
    AuditEventType,
    AuditLog,
    ComplianceProfile,
    DataExport,
    Organization,
    SSO_Configuration,
    TeamRole,
)
from app.models import User


class SecurityLevel(str, Enum):
    """Security classification levels"""

    PUBLIC = "public"
    INTERNAL = "internal"
    CONFIDENTIAL = "confidential"
    RESTRICTED = "restricted"


class DataClassification(str, Enum):
    """Data classification for GDPR compliance"""

    PUBLIC = "public"
    INTERNAL = "internal"
    PERSONAL = "personal"
    SENSITIVE = "sensitive"
    CRITICAL = "critical"


@dataclass
class SecurityEvent:
    """Security event for monitoring and alerting"""

    event_type: str
    severity: str  # "low", "medium", "high", "critical"
    description: str
    user_id: Optional[int]
    ip_address: str
    metadata: Dict[str, Any]
    risk_score: int  # 0-100
    timestamp: datetime


@dataclass
class AccessAttempt:
    """Access attempt tracking for security analysis"""

    user_id: Optional[int]
    ip_address: str
    user_agent: str
    success: bool
    failure_reason: Optional[str]
    timestamp: datetime
    location: Optional[Dict[str, str]]


@dataclass
class ComplianceReport:
    """GDPR/compliance report"""

    report_type: str
    organization_id: int
    data_subjects: int
    data_categories: List[str]
    retention_compliance: bool
    encryption_compliance: bool
    access_log_compliance: bool
    findings: List[str]
    recommendations: List[str]
    generated_at: datetime


class EnterpriseSecurityService:
    """Enterprise security and compliance service"""

    def __init__(self, db: Session):
        self.db = db

    def log_audit_event(
        self,
        organization_id: int,
        user_id: Optional[int],
        event_type: AuditEventType,
        resource_type: str,
        resource_id: Optional[int],
        description: str,
        metadata: Dict = None,
        ip_address: str = None,
        user_agent: str = None,
    ) -> AuditLog:
        """Log enterprise audit event for compliance"""

        # Calculate risk score based on event type and context
        risk_score = self._calculate_risk_score(event_type, metadata or {})

        audit_log = AuditLog(
            organization_id=organization_id,
            user_id=user_id,
            event_type=event_type,
            resource_type=resource_type,
            resource_id=resource_id,
            description=description,
            metadata=metadata or {},
            ip_address=ip_address,
            user_agent=user_agent,
            risk_score=risk_score,
            session_id=metadata.get("session_id") if metadata else None,
        )

        self.db.add(audit_log)
        self.db.commit()

        # Check if this event requires security alerting
        if risk_score > 70:
            self._trigger_security_alert(audit_log)

        return audit_log

    def _calculate_risk_score(self, event_type: AuditEventType, metadata: Dict) -> int:
        """Calculate risk score for audit events"""
        base_scores = {
            AuditEventType.user_login: 10,
            AuditEventType.user_logout: 5,
            AuditEventType.data_access: 20,
            AuditEventType.data_modification: 40,
            AuditEventType.permission_change: 60,
            AuditEventType.export_data: 50,
            AuditEventType.import_data: 45,
            AuditEventType.system_configuration: 70,
            AuditEventType.security_event: 80,
        }

        risk_score = base_scores.get(event_type, 30)

        # Increase risk for sensitive data access
        if metadata.get("data_classification") in ["sensitive", "critical"]:
            risk_score += 20

        # Increase risk for bulk operations
        if metadata.get("bulk_operation"):
            risk_score += 15

        # Increase risk for off-hours access
        current_hour = datetime.now().hour
        if current_hour < 6 or current_hour > 22:
            risk_score += 10

        # Increase risk for unusual IP addresses
        if metadata.get("new_ip_address"):
            risk_score += 15

        return min(100, risk_score)

    def _trigger_security_alert(self, audit_log: AuditLog):
        """Trigger security alert for high-risk events"""
        # In a real implementation, this would send alerts to security team
        # For now, we'll just log it
        print(f"SECURITY ALERT: High-risk event detected - {audit_log.description}")

    def track_access_attempt(
        self,
        organization_id: int,
        user_id: Optional[int],
        ip_address: str,
        user_agent: str,
        success: bool,
        failure_reason: Optional[str] = None,
    ) -> AccessAttempt:
        """Track login/access attempts for security monitoring"""

        access_attempt = AccessAttempt(
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            success=success,
            failure_reason=failure_reason,
            timestamp=datetime.now(),
            location=self._get_ip_location(ip_address),
        )

        # Log as audit event
        self.log_audit_event(
            organization_id=organization_id,
            user_id=user_id,
            event_type=(
                AuditEventType.user_login if success else AuditEventType.security_event
            ),
            resource_type="authentication",
            resource_id=user_id,
            description=f"Login {'successful' if success else 'failed'}: {failure_reason or 'Success'}",
            metadata={
                "ip_address": ip_address,
                "user_agent": user_agent,
                "location": access_attempt.location,
            },
            ip_address=ip_address,
            user_agent=user_agent,
        )

        # Check for suspicious patterns
        self._analyze_access_patterns(organization_id, user_id, ip_address)

        return access_attempt

    def _get_ip_location(self, ip_address: str) -> Optional[Dict[str, str]]:
        """Get approximate location from IP address"""
        # In a real implementation, this would use a GeoIP service
        # For demo purposes, return mock data
        return {"country": "Unknown", "city": "Unknown", "region": "Unknown"}

    def _analyze_access_patterns(
        self, organization_id: int, user_id: Optional[int], ip_address: str
    ):
        """Analyze access patterns for security threats"""
        if not user_id:
            return

        # Check for rapid failed login attempts
        recent_failures = (
            self.db.query(AuditLog)
            .filter(
                AuditLog.organization_id == organization_id,
                AuditLog.user_id == user_id,
                AuditLog.event_type == AuditEventType.security_event,
                AuditLog.created_at >= datetime.now() - timedelta(minutes=15),
                AuditLog.description.contains("failed"),
            )
            .count()
        )

        if recent_failures >= 5:
            self.log_audit_event(
                organization_id=organization_id,
                user_id=user_id,
                event_type=AuditEventType.security_event,
                resource_type="security",
                resource_id=None,
                description=f"Potential brute force attack detected - {recent_failures} failed attempts",
                metadata={
                    "attack_type": "brute_force",
                    "attempt_count": recent_failures,
                },
                ip_address=ip_address,
            )

    def validate_data_access(
        self, user: User, resource_type: str, resource_id: int, operation: str
    ) -> Tuple[bool, str]:
        """Validate data access permissions with enterprise controls"""

        # Get user's organization and compliance profile
        if not user.organization_id:
            return False, "User not associated with an organization"

        compliance_profile = (
            self.db.query(ComplianceProfile)
            .filter(ComplianceProfile.organization_id == user.organization_id)
            .first()
        )

        # Check if MFA is required
        if compliance_profile and compliance_profile.mfa_required:
            # In a real implementation, check MFA status
            if not self._check_mfa_status(user.id):
                return False, "Multi-factor authentication required"

        # Check session timeout
        if compliance_profile and compliance_profile.session_timeout_minutes:
            if not self._check_session_validity(
                user.id, compliance_profile.session_timeout_minutes
            ):
                return False, "Session expired - please re-authenticate"

        # Log data access for audit
        self.log_audit_event(
            organization_id=user.organization_id,
            user_id=user.id,
            event_type=AuditEventType.data_access,
            resource_type=resource_type,
            resource_id=resource_id,
            description=f"Data access: {operation} on {resource_type}#{resource_id}",
            metadata={"operation": operation},
        )

        return True, "Access granted"

    def _check_mfa_status(self, user_id: int) -> bool:
        """Check if user has valid MFA session"""
        # In a real implementation, this would check MFA session
        return True  # Demo mode - assume MFA is valid

    def _check_session_validity(self, user_id: int, timeout_minutes: int) -> bool:
        """Check if user session is still valid"""
        # In a real implementation, this would check session timestamps
        return True  # Demo mode - assume session is valid

    def encrypt_sensitive_data(
        self, data: str, classification: DataClassification
    ) -> str:
        """Encrypt sensitive data based on classification level"""
        if classification in [
            DataClassification.SENSITIVE,
            DataClassification.CRITICAL,
        ]:
            # In a real implementation, use proper encryption (AES-256, etc.)
            # For demo, use simple hash
            return hashlib.sha256(data.encode()).hexdigest()
        return data

    def generate_compliance_report(self, organization_id: int) -> ComplianceReport:
        """Generate GDPR/compliance report for organization"""
        organization = (
            self.db.query(Organization)
            .filter(Organization.id == organization_id)
            .first()
        )

        if not organization:
            raise ValueError("Organization not found")

        compliance_profile = (
            self.db.query(ComplianceProfile)
            .filter(ComplianceProfile.organization_id == organization_id)
            .first()
        )

        # Analyze compliance status
        findings = []
        recommendations = []

        # Check data retention compliance
        retention_compliance = True
        if compliance_profile:
            old_data_cutoff = datetime.now() - timedelta(
                days=compliance_profile.data_retention_days
            )
            old_audit_logs = (
                self.db.query(AuditLog)
                .filter(
                    AuditLog.organization_id == organization_id,
                    AuditLog.created_at < old_data_cutoff,
                )
                .count()
            )

            if old_audit_logs > 0:
                retention_compliance = False
                findings.append(
                    f"Found {old_audit_logs} audit logs exceeding retention period"
                )
                recommendations.append(
                    "Implement automated data purging for old audit logs"
                )

        # Check encryption compliance
        encryption_compliance = True
        if compliance_profile:
            if not compliance_profile.encryption_at_rest:
                encryption_compliance = False
                findings.append("Encryption at rest not enabled")
                recommendations.append(
                    "Enable encryption at rest for all sensitive data"
                )

        # Check access log compliance
        recent_audit_logs = (
            self.db.query(AuditLog)
            .filter(
                AuditLog.organization_id == organization_id,
                AuditLog.created_at >= datetime.now() - timedelta(days=30),
            )
            .count()
        )

        access_log_compliance = recent_audit_logs > 0

        if not access_log_compliance:
            findings.append("No recent audit logs found")
            recommendations.append("Ensure all data access is being logged")

        # Count data subjects (users in organization)
        data_subjects = (
            self.db.query(User).filter(User.organization_id == organization_id).count()
        )

        return ComplianceReport(
            report_type="gdpr_compliance",
            organization_id=organization_id,
            data_subjects=data_subjects,
            data_categories=["personal", "financial", "operational"],
            retention_compliance=retention_compliance,
            encryption_compliance=encryption_compliance,
            access_log_compliance=access_log_compliance,
            findings=findings,
            recommendations=recommendations,
            generated_at=datetime.now(),
        )

    def request_data_export(
        self, organization_id: int, user_id: int, export_type: str, format: str = "json"
    ) -> DataExport:
        """Request data export for GDPR compliance"""

        # Generate secure filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"export_{export_type}_{timestamp}.{format}"

        # Create export request
        data_export = DataExport(
            organization_id=organization_id,
            user_id=user_id,
            export_type=export_type,
            format=format,
            status="pending",
            filename=filename,
            encryption_key=secrets.token_urlsafe(32),
            expires_at=datetime.now() + timedelta(days=7),
        )

        self.db.add(data_export)
        self.db.commit()

        # Log export request
        self.log_audit_event(
            organization_id=organization_id,
            user_id=user_id,
            event_type=AuditEventType.export_data,
            resource_type="data_export",
            resource_id=data_export.id,
            description=f"Data export requested: {export_type} in {format} format",
            metadata={
                "export_type": export_type,
                "format": format,
                "filename": filename,
            },
        )

        # In a real implementation, trigger background job to generate export
        self._process_data_export(data_export.id)

        return data_export

    def _process_data_export(self, export_id: int):
        """Process data export request (background job)"""
        data_export = (
            self.db.query(DataExport).filter(DataExport.id == export_id).first()
        )

        if not data_export:
            return

        try:
            # In a real implementation, gather and export the requested data
            # For demo, just mark as completed
            data_export.status = "completed"
            data_export.completed_at = datetime.now()
            data_export.file_size = 1024  # Demo file size
            data_export.download_url = f"/api/exports/download/{data_export.id}"

            self.db.commit()

            # Log completion
            self.log_audit_event(
                organization_id=data_export.organization_id,
                user_id=data_export.user_id,
                event_type=AuditEventType.export_data,
                resource_type="data_export",
                resource_id=data_export.id,
                description=f"Data export completed: {data_export.filename}",
                metadata={"status": "completed", "file_size": data_export.file_size},
            )

        except Exception as e:
            data_export.status = "failed"
            self.db.commit()

            self.log_audit_event(
                organization_id=data_export.organization_id,
                user_id=data_export.user_id,
                event_type=AuditEventType.security_event,
                resource_type="data_export",
                resource_id=data_export.id,
                description=f"Data export failed: {str(e)}",
                metadata={"status": "failed", "error": str(e)},
            )

    def validate_password_policy(
        self, password: str, organization_id: int
    ) -> Tuple[bool, List[str]]:
        """Validate password against organization policy"""
        compliance_profile = (
            self.db.query(ComplianceProfile)
            .filter(ComplianceProfile.organization_id == organization_id)
            .first()
        )

        if not compliance_profile or not compliance_profile.password_policy:
            # Default policy
            policy = {
                "min_length": 8,
                "require_uppercase": True,
                "require_lowercase": True,
                "require_numbers": True,
                "require_special": True,
                "prevent_reuse": 5,
            }
        else:
            policy = compliance_profile.password_policy

        errors = []

        # Check minimum length
        if len(password) < policy.get("min_length", 8):
            errors.append(
                f"Password must be at least {policy.get('min_length', 8)} characters long"
            )

        # Check uppercase requirement
        if policy.get("require_uppercase", False) and not re.search(r"[A-Z]", password):
            errors.append("Password must contain at least one uppercase letter")

        # Check lowercase requirement
        if policy.get("require_lowercase", False) and not re.search(r"[a-z]", password):
            errors.append("Password must contain at least one lowercase letter")

        # Check numbers requirement
        if policy.get("require_numbers", False) and not re.search(r"[0-9]", password):
            errors.append("Password must contain at least one number")

        # Check special characters requirement
        if policy.get("require_special", False) and not re.search(
            r'[!@#$%^&*(),.?":{}|<>]', password
        ):
            errors.append("Password must contain at least one special character")

        return len(errors) == 0, errors

    def get_security_dashboard(self, organization_id: int) -> Dict[str, Any]:
        """Get security dashboard data for organization"""

        # Get recent security events
        recent_events = (
            self.db.query(AuditLog)
            .filter(
                AuditLog.organization_id == organization_id,
                AuditLog.created_at >= datetime.now() - timedelta(days=7),
                AuditLog.risk_score > 50,
            )
            .order_by(desc(AuditLog.created_at))
            .limit(10)
            .all()
        )

        # Calculate security metrics
        total_events = (
            self.db.query(AuditLog)
            .filter(
                AuditLog.organization_id == organization_id,
                AuditLog.created_at >= datetime.now() - timedelta(days=30),
            )
            .count()
        )

        high_risk_events = (
            self.db.query(AuditLog)
            .filter(
                AuditLog.organization_id == organization_id,
                AuditLog.created_at >= datetime.now() - timedelta(days=30),
                AuditLog.risk_score > 70,
            )
            .count()
        )

        # Get compliance status
        compliance_profile = (
            self.db.query(ComplianceProfile)
            .filter(ComplianceProfile.organization_id == organization_id)
            .first()
        )

        compliance_score = self._calculate_compliance_score(
            organization_id, compliance_profile
        )

        return {
            "security_score": max(0, 100 - (high_risk_events * 10)),
            "compliance_score": compliance_score,
            "total_events_30d": total_events,
            "high_risk_events_30d": high_risk_events,
            "recent_events": [
                {
                    "id": event.id,
                    "type": event.event_type.value,
                    "description": event.description,
                    "risk_score": event.risk_score,
                    "timestamp": event.created_at.isoformat(),
                    "user_id": event.user_id,
                }
                for event in recent_events
            ],
            "compliance_features": {
                "gdpr_enabled": (
                    compliance_profile.gdpr_enabled if compliance_profile else False
                ),
                "sox_enabled": (
                    compliance_profile.sox_enabled if compliance_profile else False
                ),
                "mfa_required": (
                    compliance_profile.mfa_required if compliance_profile else False
                ),
                "encryption_enabled": (
                    compliance_profile.encryption_at_rest
                    if compliance_profile
                    else False
                ),
            },
        }

    def _calculate_compliance_score(
        self, organization_id: int, compliance_profile: Optional[ComplianceProfile]
    ) -> int:
        """Calculate overall compliance score"""
        score = 0

        if compliance_profile:
            # GDPR compliance features
            if compliance_profile.gdpr_enabled:
                score += 20
            if compliance_profile.encryption_at_rest:
                score += 15
            if compliance_profile.encryption_in_transit:
                score += 15
            if compliance_profile.mfa_required:
                score += 20
            if compliance_profile.data_retention_days > 0:
                score += 10

        # Audit log coverage
        recent_logs = (
            self.db.query(AuditLog)
            .filter(
                AuditLog.organization_id == organization_id,
                AuditLog.created_at >= datetime.now() - timedelta(days=30),
            )
            .count()
        )

        if recent_logs > 100:
            score += 20

        return min(100, score)


# Dependency injection
def get_enterprise_security_service(
    db: Session = Depends(get_db),
) -> EnterpriseSecurityService:
    """Get enterprise security service"""
    return EnterpriseSecurityService(db)
