"""
Production monitoring, error tracking, and alerting system
"""
import json
import logging
import os
import sys
import traceback
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import requests
from prometheus_client import Counter, Histogram, Gauge, Info


# Monitoring metrics
ERROR_COUNTER = Counter('app_errors_total', 'Total application errors', ['error_type', 'severity'])
PERFORMANCE_HISTOGRAM = Histogram('app_performance_seconds', 'Application performance metrics', ['operation'])
ACTIVE_USERS_GAUGE = Gauge('app_active_users', 'Currently active users')
SYSTEM_INFO = Info('app_info', 'Application information')

# Set application info
SYSTEM_INFO.info({
    'version': '1.0.0',
    'environment': os.getenv('ENVIRONMENT', 'development'),
    'service': 'duespark-api'
})


class MonitoringService:
    """Centralized monitoring and alerting service"""

    def __init__(self):
        self.environment = os.getenv('ENVIRONMENT', 'development')
        self.slack_webhook_url = os.getenv('SLACK_WEBHOOK_URL')
        self.sentry_dsn = os.getenv('SENTRY_DSN')
        self.pagerduty_integration_key = os.getenv('PAGERDUTY_INTEGRATION_KEY')

        # Configure structured logging
        self.setup_logging()

        # Initialize error tracking
        self.setup_error_tracking()

    def setup_logging(self):
        """Configure structured logging for production"""
        log_level = os.getenv('LOG_LEVEL', 'INFO').upper()

        # Create custom formatter for structured logging
        class JSONFormatter(logging.Formatter):
            def format(self, record):
                log_entry = {
                    'timestamp': datetime.now(timezone.utc).isoformat(),
                    'level': record.levelname,
                    'logger': record.name,
                    'message': record.getMessage(),
                    'module': record.module,
                    'function': record.funcName,
                    'line': record.lineno,
                    'environment': os.getenv('ENVIRONMENT', 'development'),
                    'service': 'duespark-api'
                }

                # Add exception info if present
                if record.exc_info:
                    log_entry['exception'] = {
                        'type': record.exc_info[0].__name__ if record.exc_info[0] else None,
                        'message': str(record.exc_info[1]) if record.exc_info[1] else None,
                        'traceback': traceback.format_exception(*record.exc_info) if record.exc_info else None
                    }

                # Add extra fields
                for key, value in record.__dict__.items():
                    if key not in ['name', 'msg', 'args', 'levelname', 'levelno', 'pathname',
                                 'filename', 'module', 'exc_info', 'exc_text', 'stack_info',
                                 'lineno', 'funcName', 'created', 'msecs', 'relativeCreated',
                                 'thread', 'threadName', 'processName', 'process', 'message']:
                        log_entry[key] = value

                return json.dumps(log_entry)

        # Configure root logger
        root_logger = logging.getLogger()
        root_logger.setLevel(getattr(logging, log_level))

        # Remove existing handlers
        for handler in root_logger.handlers[:]:
            root_logger.removeHandler(handler)

        # Add console handler with JSON formatting
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(JSONFormatter())
        root_logger.addHandler(console_handler)

    def setup_error_tracking(self):
        """Initialize error tracking (Sentry integration)"""
        if self.sentry_dsn:
            try:
                import sentry_sdk
                from sentry_sdk.integrations.fastapi import FastApiIntegration
                from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

                sentry_sdk.init(
                    dsn=self.sentry_dsn,
                    integrations=[
                        FastApiIntegration(auto_enabling=True),
                        SqlalchemyIntegration(),
                    ],
                    traces_sample_rate=0.1 if self.environment == 'production' else 1.0,
                    environment=self.environment,
                    release=os.getenv('APP_VERSION', '1.0.0'),
                    attach_stacktrace=True,
                    send_default_pii=False,  # Security: don't send PII
                )
                logging.info("Sentry error tracking initialized")
            except ImportError:
                logging.warning("Sentry SDK not available, error tracking disabled")

    def log_error(self, error: Exception, context: Dict[str, Any] = None, severity: str = 'error'):
        """Log error with context and metrics"""
        ERROR_COUNTER.labels(
            error_type=type(error).__name__,
            severity=severity
        ).inc()

        logger = logging.getLogger(__name__)

        # Create structured log entry
        log_data = {
            'event_type': 'error',
            'error_type': type(error).__name__,
            'error_message': str(error),
            'severity': severity,
            'context': context or {}
        }

        if severity == 'critical':
            logger.critical("Critical error occurred", extra=log_data, exc_info=error)
            self.send_alert(
                title=f"Critical Error: {type(error).__name__}",
                message=str(error),
                severity='critical',
                context=context
            )
        elif severity == 'error':
            logger.error("Error occurred", extra=log_data, exc_info=error)
        else:
            logger.warning("Warning occurred", extra=log_data, exc_info=error)

    def log_performance(self, operation: str, duration: float, context: Dict[str, Any] = None):
        """Log performance metrics"""
        PERFORMANCE_HISTOGRAM.labels(operation=operation).observe(duration)

        logger = logging.getLogger(__name__)
        log_data = {
            'event_type': 'performance',
            'operation': operation,
            'duration_seconds': duration,
            'context': context or {}
        }

        # Alert on slow operations
        if duration > 10.0:  # 10 seconds threshold
            self.send_alert(
                title=f"Slow Operation: {operation}",
                message=f"Operation took {duration:.2f} seconds",
                severity='warning',
                context=context
            )

        logger.info("Performance metric", extra=log_data)

    def update_active_users(self, count: int):
        """Update active users gauge"""
        ACTIVE_USERS_GAUGE.set(count)

    def send_alert(self, title: str, message: str, severity: str = 'warning', context: Dict[str, Any] = None):
        """Send alerts to configured channels"""
        if self.environment != 'production':
            logging.info(f"ALERT ({severity}): {title} - {message}")
            return

        alert_data = {
            'title': title,
            'message': message,
            'severity': severity,
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'environment': self.environment,
            'service': 'duespark-api',
            'context': context or {}
        }

        # Send to Slack
        if self.slack_webhook_url:
            self._send_slack_alert(alert_data)

        # Send to PagerDuty for critical alerts
        if severity == 'critical' and self.pagerduty_integration_key:
            self._send_pagerduty_alert(alert_data)

    def _send_slack_alert(self, alert_data: Dict[str, Any]):
        """Send alert to Slack"""
        try:
            severity_colors = {
                'info': '#36a64f',
                'warning': '#ff9500',
                'error': '#ff0000',
                'critical': '#8B0000'
            }

            slack_payload = {
                "attachments": [{
                    "color": severity_colors.get(alert_data['severity'], '#808080'),
                    "title": alert_data['title'],
                    "text": alert_data['message'],
                    "fields": [
                        {
                            "title": "Severity",
                            "value": alert_data['severity'].upper(),
                            "short": True
                        },
                        {
                            "title": "Environment",
                            "value": alert_data['environment'],
                            "short": True
                        },
                        {
                            "title": "Service",
                            "value": alert_data['service'],
                            "short": True
                        },
                        {
                            "title": "Timestamp",
                            "value": alert_data['timestamp'],
                            "short": True
                        }
                    ],
                    "footer": "DueSpark Monitoring",
                    "ts": int(datetime.now().timestamp())
                }]
            }

            response = requests.post(
                self.slack_webhook_url,
                json=slack_payload,
                timeout=10
            )
            response.raise_for_status()

        except Exception as e:
            logging.error(f"Failed to send Slack alert: {e}")

    def _send_pagerduty_alert(self, alert_data: Dict[str, Any]):
        """Send critical alert to PagerDuty"""
        try:
            pagerduty_payload = {
                "routing_key": self.pagerduty_integration_key,
                "event_action": "trigger",
                "payload": {
                    "summary": alert_data['title'],
                    "source": "duespark-api",
                    "severity": "critical",
                    "custom_details": {
                        "message": alert_data['message'],
                        "environment": alert_data['environment'],
                        "context": alert_data['context']
                    }
                }
            }

            response = requests.post(
                "https://events.pagerduty.com/v2/enqueue",
                json=pagerduty_payload,
                timeout=10
            )
            response.raise_for_status()

        except Exception as e:
            logging.error(f"Failed to send PagerDuty alert: {e}")

    def health_check_alert(self, component: str, status: str, details: Dict[str, Any] = None):
        """Send health check alerts"""
        if status in ['unhealthy', 'critical']:
            severity = 'critical' if status == 'critical' else 'error'
            self.send_alert(
                title=f"Health Check Failed: {component}",
                message=f"Component {component} is {status}",
                severity=severity,
                context={'component': component, 'details': details or {}}
            )

    def backup_status_alert(self, status: str, message: str):
        """Send backup status alerts"""
        if status == 'failed':
            self.send_alert(
                title="Database Backup Failed",
                message=message,
                severity='critical',
                context={'backup_status': status}
            )

    def security_alert(self, event_type: str, details: Dict[str, Any]):
        """Send security-related alerts"""
        self.send_alert(
            title=f"Security Event: {event_type}",
            message=f"Security event detected: {event_type}",
            severity='critical',
            context={'security_event': event_type, 'details': details}
        )


# Global monitoring instance
monitoring = MonitoringService()


class MonitoringMiddleware:
    """Middleware for automatic request monitoring"""

    def __init__(self):
        self.request_counter = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint', 'status'])
        self.request_duration = Histogram('http_request_duration_seconds', 'HTTP request duration', ['method', 'endpoint'])

    async def __call__(self, request, call_next):
        import time
        start_time = time.time()

        # Extract endpoint pattern
        endpoint = self._get_endpoint_pattern(request.url.path)

        try:
            response = await call_next(request)

            # Record metrics
            duration = time.time() - start_time
            self.request_counter.labels(
                method=request.method,
                endpoint=endpoint,
                status=str(response.status_code)
            ).inc()

            self.request_duration.labels(
                method=request.method,
                endpoint=endpoint
            ).observe(duration)

            # Log slow requests
            if duration > 5.0:  # 5 second threshold
                monitoring.log_performance(
                    operation=f"{request.method} {endpoint}",
                    duration=duration,
                    context={'status_code': response.status_code}
                )

            return response

        except Exception as e:
            duration = time.time() - start_time
            self.request_counter.labels(
                method=request.method,
                endpoint=endpoint,
                status='500'
            ).inc()

            monitoring.log_error(
                error=e,
                context={
                    'method': request.method,
                    'endpoint': endpoint,
                    'duration': duration
                },
                severity='error'
            )
            raise

    def _get_endpoint_pattern(self, path: str) -> str:
        """Convert URL path to endpoint pattern for metrics"""
        # Replace common ID patterns
        import re
        patterns = [
            (r'/\d+', '/{id}'),
            (r'/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}', '/{uuid}'),
            (r'/[\w.-]+@[\w.-]+\.\w+', '/{email}'),
        ]

        for pattern, replacement in patterns:
            path = re.sub(pattern, replacement, path)

        return path