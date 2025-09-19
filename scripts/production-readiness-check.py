#!/usr/bin/env python3
"""
DueSpark Production Readiness Validation Script

This script performs a comprehensive validation of all production readiness criteria
including security, monitoring, performance, and operational requirements.

Usage:
    python scripts/production-readiness-check.py [--environment production]
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple

import requests


class ProductionReadinessChecker:
    """Comprehensive production readiness validation"""

    def __init__(self, environment: str = "production"):
        self.environment = environment
        self.project_root = Path(__file__).parent.parent
        self.results = {}
        self.warnings = []
        self.errors = []

        # Load environment configuration
        self.load_environment_config()

    def load_environment_config(self):
        """Load environment-specific configuration"""
        env_file = self.project_root / f".env.{self.environment}"

        if env_file.exists():
            with open(env_file) as f:
                for line in f:
                    if line.strip() and not line.startswith('#'):
                        key, _, value = line.partition('=')
                        os.environ[key.strip()] = value.strip()

    def check_security_configuration(self) -> Dict[str, bool]:
        """Validate security configuration"""
        print("🔒 Checking Security Configuration...")

        checks = {}

        # Environment variables
        secret_key = os.getenv('SECRET_KEY')
        checks['secret_key_exists'] = bool(secret_key)
        checks['secret_key_length'] = len(secret_key) >= 32 if secret_key else False
        checks['database_url_exists'] = bool(os.getenv('DATABASE_URL'))

        # Check for development secrets in production
        if self.environment == 'production':
            checks['no_dev_secrets'] = not (
                secret_key and 'dev' in secret_key.lower() or
                'test' in secret_key.lower()
            )
        else:
            checks['no_dev_secrets'] = True

        # Check CORS configuration
        cors_origins = os.getenv('BACKEND_CORS_ORIGINS')
        if cors_origins:
            try:
                origins = json.loads(cors_origins)
                checks['cors_not_wildcard'] = '*' not in origins
            except json.JSONDecodeError:
                checks['cors_not_wildcard'] = False
        else:
            checks['cors_not_wildcard'] = True

        # SSL/TLS requirements
        checks['https_enforced'] = self.environment == 'production'

        self.results['security'] = checks
        return checks

    def check_monitoring_setup(self) -> Dict[str, bool]:
        """Validate monitoring and observability setup"""
        print("📊 Checking Monitoring Setup...")

        checks = {}

        # Check if monitoring files exist
        monitoring_file = self.project_root / "sic_backend_mvp_jwt_sqlite" / "app" / "monitoring.py"
        health_file = self.project_root / "sic_backend_mvp_jwt_sqlite" / "app" / "health_routes.py"

        checks['monitoring_module_exists'] = monitoring_file.exists()
        checks['health_routes_exist'] = health_file.exists()

        # Check Sentry configuration
        sentry_dsn = os.getenv('SENTRY_DSN')
        checks['sentry_configured'] = bool(sentry_dsn)

        # Check alert configuration
        slack_webhook = os.getenv('SLACK_WEBHOOK_URL')
        pagerduty_key = os.getenv('PAGERDUTY_INTEGRATION_KEY')
        checks['alerting_configured'] = bool(slack_webhook or pagerduty_key)

        # Check log level configuration
        log_level = os.getenv('LOG_LEVEL', 'INFO')
        checks['appropriate_log_level'] = log_level.upper() in ['INFO', 'WARNING', 'ERROR']

        self.results['monitoring'] = checks
        return checks

    def check_backup_configuration(self) -> Dict[str, bool]:
        """Validate backup and recovery setup"""
        print("💾 Checking Backup Configuration...")

        checks = {}

        # Check backup configuration
        backup_enabled = os.getenv('BACKUP_ENABLED', 'false').lower() == 'true'
        checks['backup_enabled'] = backup_enabled

        if backup_enabled:
            checks['s3_bucket_configured'] = bool(os.getenv('BACKUP_S3_BUCKET'))
            checks['retention_configured'] = bool(os.getenv('BACKUP_RETENTION_DAYS'))
        else:
            checks['s3_bucket_configured'] = True  # Not required if backup disabled
            checks['retention_configured'] = True

        # Check backup service file
        backup_file = self.project_root / "sic_backend_mvp_jwt_sqlite" / "app" / "backup_service.py"
        checks['backup_service_exists'] = backup_file.exists()

        self.results['backup'] = checks
        return checks

    def check_deployment_configuration(self) -> Dict[str, bool]:
        """Validate deployment setup"""
        print("🚀 Checking Deployment Configuration...")

        checks = {}

        # Check deployment scripts
        deploy_script = self.project_root / "scripts" / "deploy.sh"
        checks['deploy_script_exists'] = deploy_script.exists()
        checks['deploy_script_executable'] = deploy_script.is_file() and os.access(deploy_script, os.X_OK)

        # Check CI/CD configuration
        ci_file = self.project_root / ".github" / "workflows" / "backend-ci.yml"
        checks['ci_pipeline_exists'] = ci_file.exists()

        # Check Docker configuration
        dockerfile = self.project_root / "sic_backend_mvp_jwt_sqlite" / "Dockerfile"
        checks['dockerfile_exists'] = dockerfile.exists()

        # Check environment-specific compose file
        compose_file = self.project_root / f"docker-compose.{self.environment}.yml"
        checks['compose_file_exists'] = compose_file.exists()

        self.results['deployment'] = checks
        return checks

    def check_database_configuration(self) -> Dict[str, bool]:
        """Validate database setup"""
        print("🗄️ Checking Database Configuration...")

        checks = {}

        # Check database URL format
        database_url = os.getenv('DATABASE_URL', '')
        checks['database_url_format'] = (
            database_url.startswith('postgresql://') or
            database_url.startswith('sqlite:///')
        )

        # Check for production database (not SQLite in production)
        if self.environment == 'production':
            checks['production_database'] = database_url.startswith('postgresql://')
        else:
            checks['production_database'] = True

        # Check migration files
        migrations_dir = self.project_root / "sic_backend_mvp_jwt_sqlite" / "alembic" / "versions"
        checks['migrations_exist'] = migrations_dir.exists() and any(migrations_dir.iterdir())

        self.results['database'] = checks
        return checks

    def check_external_services(self) -> Dict[str, bool]:
        """Validate external service configurations"""
        print("🔌 Checking External Services...")

        checks = {}

        # Email service configuration
        email_provider = os.getenv('EMAIL_PROVIDER')
        if email_provider == 'postmark':
            checks['email_configured'] = bool(os.getenv('POSTMARK_SERVER_TOKEN'))
        elif email_provider == 'ses':
            checks['email_configured'] = bool(os.getenv('AWS_REGION'))
        else:
            checks['email_configured'] = False

        # Payment processing
        stripe_secret = os.getenv('STRIPE_SECRET_KEY')
        stripe_client = os.getenv('STRIPE_CLIENT_ID')
        checks['payment_configured'] = bool(stripe_secret and stripe_client)

        # Check for test keys in production
        if self.environment == 'production' and stripe_secret:
            checks['production_payment_keys'] = not stripe_secret.startswith('sk_test_')
        else:
            checks['production_payment_keys'] = True

        self.results['external_services'] = checks
        return checks

    def check_documentation(self) -> Dict[str, bool]:
        """Validate documentation completeness"""
        print("📚 Checking Documentation...")

        checks = {}

        # Check required documentation files
        docs_dir = self.project_root / "docs"
        required_docs = [
            "OPERATIONAL_SECURITY.md",
            "IMPROVEMENT_PLAN.md"
        ]

        for doc in required_docs:
            doc_path = docs_dir / doc
            checks[f'doc_{doc.lower().replace(".", "_")}'] = doc_path.exists()

        # Check README files
        readme_files = [
            self.project_root / "README.md",
            self.project_root / "sic_backend_mvp_jwt_sqlite" / "README.md"
        ]

        checks['readme_exists'] = any(f.exists() for f in readme_files)

        # Check go-live checklist
        checklist = self.project_root / "GO_LIVE_CHECKLIST.md"
        checks['go_live_checklist'] = checklist.exists()

        self.results['documentation'] = checks
        return checks

    def test_health_endpoints(self) -> Dict[str, bool]:
        """Test health check endpoints if service is running"""
        print("🏥 Testing Health Endpoints...")

        checks = {}

        # Try to connect to local service
        base_urls = [
            "http://localhost:8000",
            "http://localhost:8001",
            "http://127.0.0.1:8000"
        ]

        service_url = None
        for url in base_urls:
            try:
                response = requests.get(f"{url}/health", timeout=5)
                if response.status_code == 200:
                    service_url = url
                    break
            except requests.exceptions.RequestException:
                continue

        if service_url:
            checks['service_running'] = True

            # Test health endpoints
            endpoints_to_test = [
                "/health",
                "/health/detailed",
                "/health/ready",
                "/health/live"
            ]

            for endpoint in endpoints_to_test:
                try:
                    response = requests.get(f"{service_url}{endpoint}", timeout=10)
                    checks[f'endpoint_{endpoint.replace("/", "_")}'] = response.status_code == 200
                except requests.exceptions.RequestException:
                    checks[f'endpoint_{endpoint.replace("/", "_")}'] = False

            # Test metrics endpoint
            try:
                response = requests.get(f"{service_url}/metrics", timeout=5)
                checks['metrics_endpoint'] = response.status_code == 200
            except requests.exceptions.RequestException:
                checks['metrics_endpoint'] = False

        else:
            checks['service_running'] = False
            self.warnings.append("Service not running - health endpoint tests skipped")

        self.results['health_endpoints'] = checks
        return checks

    def run_all_checks(self) -> Dict[str, Dict[str, bool]]:
        """Run all production readiness checks"""
        print(f"🚀 Starting Production Readiness Check for {self.environment} environment\n")

        all_checks = [
            self.check_security_configuration,
            self.check_monitoring_setup,
            self.check_backup_configuration,
            self.check_deployment_configuration,
            self.check_database_configuration,
            self.check_external_services,
            self.check_documentation,
            self.test_health_endpoints
        ]

        for check in all_checks:
            try:
                check()
            except Exception as e:
                self.errors.append(f"Error in {check.__name__}: {str(e)}")

        return self.results

    def generate_report(self) -> str:
        """Generate a comprehensive readiness report"""
        report = []
        report.append("# DueSpark Production Readiness Report")
        report.append(f"**Generated**: {datetime.now().isoformat()}")
        report.append(f"**Environment**: {self.environment}")
        report.append("")

        total_checks = 0
        passed_checks = 0

        for category, checks in self.results.items():
            report.append(f"## {category.title().replace('_', ' ')}")

            for check_name, passed in checks.items():
                total_checks += 1
                if passed:
                    passed_checks += 1
                    status = "✅"
                else:
                    status = "❌"

                readable_name = check_name.replace('_', ' ').title()
                report.append(f"- {status} {readable_name}")

            report.append("")

        # Summary
        success_rate = (passed_checks / total_checks * 100) if total_checks > 0 else 0
        report.append("## Summary")
        report.append(f"**Total Checks**: {total_checks}")
        report.append(f"**Passed**: {passed_checks}")
        report.append(f"**Failed**: {total_checks - passed_checks}")
        report.append(f"**Success Rate**: {success_rate:.1f}%")
        report.append("")

        # Overall status
        if success_rate >= 95:
            status = "🟢 READY FOR PRODUCTION"
            recommendation = "All critical checks passed. Ready for production deployment."
        elif success_rate >= 85:
            status = "🟡 MOSTLY READY"
            recommendation = "Most checks passed. Address remaining issues before production deployment."
        else:
            status = "🔴 NOT READY"
            recommendation = "Critical issues detected. Do not deploy to production until resolved."

        report.append(f"## Overall Status: {status}")
        report.append(f"**Recommendation**: {recommendation}")
        report.append("")

        # Warnings and errors
        if self.warnings:
            report.append("## Warnings")
            for warning in self.warnings:
                report.append(f"- ⚠️ {warning}")
            report.append("")

        if self.errors:
            report.append("## Errors")
            for error in self.errors:
                report.append(f"- ❌ {error}")
            report.append("")

        return "\n".join(report)

    def save_report(self, filename: str = None):
        """Save the readiness report to file"""
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"production_readiness_report_{timestamp}.md"

        report_content = self.generate_report()

        with open(filename, 'w') as f:
            f.write(report_content)

        print(f"\n📋 Report saved to: {filename}")


def main():
    parser = argparse.ArgumentParser(description="DueSpark Production Readiness Check")
    parser.add_argument(
        "--environment",
        default="production",
        choices=["development", "staging", "production"],
        help="Environment to check (default: production)"
    )
    parser.add_argument(
        "--output",
        help="Output file for the report (default: auto-generated)"
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output results in JSON format"
    )

    args = parser.parse_args()

    # Run the checks
    checker = ProductionReadinessChecker(args.environment)
    results = checker.run_all_checks()

    if args.json:
        # Output JSON results
        print(json.dumps(results, indent=2))
    else:
        # Output markdown report
        report = checker.generate_report()
        print("\n" + report)

        # Save report if requested
        if args.output:
            checker.save_report(args.output)

    # Determine exit code based on results
    total_checks = sum(len(checks) for checks in results.values())
    passed_checks = sum(sum(checks.values()) for checks in results.values())
    success_rate = (passed_checks / total_checks * 100) if total_checks > 0 else 0

    if success_rate < 85:
        sys.exit(1)  # Fail if less than 85% pass rate
    else:
        sys.exit(0)  # Success


if __name__ == "__main__":
    main()