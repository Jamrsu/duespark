# DueSpark Deployment Testing & Validation

## 🎯 Overview

This document provides comprehensive testing and validation procedures to ensure successful deployments and system reliability across all environments.

---

## 🧪 Pre-Deployment Testing

### 1. Local Environment Validation

#### Backend Testing
```bash
# Navigate to backend directory
cd sic_backend_mvp_jwt_sqlite

# 1. Install dependencies and run tests
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
pip install -r requirements-dev.txt

# 2. Run comprehensive test suite
pytest tests/ -v --cov=app --cov-report=html

# 3. Security and code quality checks
bandit -r app/
flake8 app/
mypy app/
black --check app/
isort --check-only app/

# 4. Database migration testing
export DATABASE_URL="sqlite:///./test.db"
alembic upgrade head
alembic check

# 5. Performance baseline testing
pytest tests/test_performance.py -v
```

#### Frontend Testing
```bash
# Navigate to frontend directory
cd sic_app

# 1. Install dependencies
npm ci

# 2. Run test suites
npm run test              # Unit tests
npm run test:coverage     # Coverage report
npm run type-check        # TypeScript validation
npm run lint              # ESLint
npm run format:check      # Prettier

# 3. Build validation
npm run build
npm run preview &
sleep 5

# 4. E2E testing
npx playwright install
npm run e2e

# 5. Performance testing
npm run analyze           # Bundle analysis
lighthouse http://localhost:3000 --output=json --output-path=./lighthouse-report.json
```

### 2. Integration Testing
```bash
# Start backend locally
cd sic_backend_mvp_jwt_sqlite
uvicorn app.main:app --reload --port 8000 &

# Start frontend locally
cd ../sic_app
npm run dev &

# Wait for services to start
sleep 10

# Run integration tests
curl -f http://localhost:8000/healthz
curl -f http://localhost:3000

# Test API integration
cd ../sic_app
npm run test:integration
```

---

## 🚀 Deployment Validation

### Backend Deployment Validation (Fly.io)

#### 1. Deployment Health Checks
```bash
# Deploy application
flyctl deploy

# 1. Basic health verification
flyctl status
flyctl logs

# 2. Application health endpoint
curl -f https://duespark-backend.fly.dev/healthz
curl -s https://duespark-backend.fly.dev/healthz | jq .

# Expected response:
# {"status": "ok", "timestamp": "2024-XX-XX...", "version": "..."}

# 3. Database connectivity check
flyctl ssh console
python -c "
from app.database import engine
from sqlalchemy import text
with engine.connect() as conn:
    result = conn.execute(text('SELECT version()'))
    print('DB Version:', result.fetchone()[0])
"
exit
```

#### 2. API Endpoint Validation
```bash
# 1. Authentication endpoints
curl -X POST https://duespark-backend.fly.dev/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'

curl -X POST https://duespark-backend.fly.dev/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=test@example.com&password=testpass123"

# 2. Extract token and test protected endpoints
TOKEN="<token_from_login_response>"

curl -H "Authorization: Bearer $TOKEN" \
  https://duespark-backend.fly.dev/clients

curl -H "Authorization: Bearer $TOKEN" \
  https://duespark-backend.fly.dev/invoices

curl -H "Authorization: Bearer $TOKEN" \
  https://duespark-backend.fly.dev/analytics/summary

# 3. API documentation accessibility
curl -f https://duespark-backend.fly.dev/docs
curl -f https://duespark-backend.fly.dev/openapi.json
```

#### 3. Background Services Validation
```bash
# 1. Scheduler service check
flyctl ssh console
python -c "
from app.scheduler import scheduler
print('Scheduler running:', scheduler.running)
print('Jobs:', [job.id for job in scheduler.get_jobs()])
"
exit

# 2. Email service validation
curl -X POST https://duespark-backend.fly.dev/reminders/preview \
  -H "Content-Type: application/json" \
  -d '{
    "template": "reminder",
    "tone": "friendly",
    "variables": {
      "client_name": "Test Client",
      "invoice_number": "INV-001",
      "amount_formatted": "$100.00",
      "due_date_iso": "2024-12-31",
      "pay_link": "https://pay.example.com/123",
      "from_name": "DueSpark"
    }
  }'

# 3. Metrics endpoint (if enabled)
curl -f https://duespark-backend.fly.dev/metrics
curl -f https://duespark-backend.fly.dev/metrics_prom
```

### Frontend Deployment Validation (Vercel)

#### 1. Basic Deployment Checks
```bash
# 1. Main application accessibility
curl -f https://app.duespark.com
curl -I https://app.duespark.com

# 2. PWA manifest and service worker
curl -f https://app.duespark.com/manifest.json
curl -f https://app.duespark.com/sw.js

# 3. Static assets
curl -f https://app.duespark.com/favicon.ico
curl -I https://app.duespark.com/assets/index.css
```

#### 2. Performance Validation
```bash
# 1. Lighthouse audit
lighthouse https://app.duespark.com \
  --output=json \
  --output-path=./production-lighthouse.json \
  --chrome-flags="--headless"

# Expected scores (minimum):
# Performance: > 90
# Accessibility: > 90
# Best Practices: > 90
# SEO: > 90
# PWA: > 90

# 2. Core Web Vitals check
curl -s "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://app.duespark.com&category=performance" | \
  jq '.lighthouseResult.audits | {
    "first-contentful-paint": .["first-contentful-paint"].displayValue,
    "largest-contentful-paint": .["largest-contentful-paint"].displayValue,
    "cumulative-layout-shift": .["cumulative-layout-shift"].displayValue
  }'
```

#### 3. Functional Validation
```bash
# 1. API connectivity from frontend
curl -X GET https://app.duespark.com/api/healthz

# 2. Authentication flow testing (manual)
# - Navigate to https://app.duespark.com/auth/login
# - Test registration and login
# - Verify dashboard loads correctly

# 3. PWA functionality testing
# - Test offline mode
# - Verify app installation prompt
# - Test push notifications (if implemented)
```

---

## 🔄 Post-Deployment Testing

### 1. End-to-End User Journey Testing

#### Critical Path 1: User Onboarding
```bash
# Automated E2E test
cd sic_app
npx playwright test tests/e2e/critical-flows/user-onboarding.spec.ts --headed

# Manual validation checklist:
# [ ] User can register new account
# [ ] Email verification works (if implemented)
# [ ] Onboarding flow completes
# [ ] Dashboard loads with default state
# [ ] First invoice can be created
```

#### Critical Path 2: Invoice Management
```bash
# Automated E2E test
npx playwright test tests/e2e/critical-flows/invoice-lifecycle.spec.ts --headed

# Manual validation checklist:
# [ ] Invoice creation form works
# [ ] Invoice list displays correctly
# [ ] Invoice editing functions
# [ ] Status updates work
# [ ] Reminders can be sent
```

#### Critical Path 3: Mobile Experience
```bash
# Mobile E2E test
npx playwright test tests/e2e/critical-flows/mobile-experience.spec.ts --headed

# Manual validation checklist:
# [ ] App works on mobile devices
# [ ] Touch gestures function
# [ ] PWA can be installed
# [ ] Offline mode works
# [ ] Push notifications work (if implemented)
```

### 2. Load Testing

#### Backend Load Testing
```bash
# Install load testing tools
pip install locust

# Create load test script
cat > load_test.py << 'EOF'
from locust import HttpUser, task, between

class DueSparkUser(HttpUser):
    wait_time = between(1, 3)

    def on_start(self):
        # Login and get token
        response = self.client.post("/auth/login", data={
            "username": "test@example.com",
            "password": "testpass123"
        })
        self.token = response.json()["data"]["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    @task(3)
    def view_dashboard(self):
        self.client.get("/analytics/summary", headers=self.headers)

    @task(2)
    def list_clients(self):
        self.client.get("/clients", headers=self.headers)

    @task(2)
    def list_invoices(self):
        self.client.get("/invoices", headers=self.headers)

    @task(1)
    def health_check(self):
        self.client.get("/healthz")
EOF

# Run load test
locust -f load_test.py --host=https://duespark-backend.fly.dev \
  --users=50 --spawn-rate=5 --run-time=5m --headless
```

#### Frontend Load Testing
```bash
# Artillery.js load testing
npm install -g artillery

# Create artillery test
cat > frontend-load-test.yml << 'EOF'
config:
  target: 'https://app.duespark.com'
  phases:
    - duration: 60
      arrivalRate: 10
    - duration: 120
      arrivalRate: 20
    - duration: 60
      arrivalRate: 5

scenarios:
  - name: "Browse application"
    flow:
      - get:
          url: "/"
      - get:
          url: "/auth/login"
      - get:
          url: "/manifest.json"
EOF

# Run frontend load test
artillery run frontend-load-test.yml
```

### 3. Security Validation

#### Security Headers Check
```bash
# Check security headers
curl -I https://app.duespark.com | grep -E "(X-|Content-Security|Strict-Transport)"
curl -I https://duespark-backend.fly.dev | grep -E "(X-|Content-Security|Strict-Transport)"

# Expected headers:
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# X-XSS-Protection: 1; mode=block
# Strict-Transport-Security: max-age=...
```

#### SSL/TLS Validation
```bash
# SSL certificate check
openssl s_client -connect app.duespark.com:443 -servername app.duespark.com < /dev/null | \
  openssl x509 -noout -dates

openssl s_client -connect duespark-backend.fly.dev:443 -servername duespark-backend.fly.dev < /dev/null | \
  openssl x509 -noout -dates

# SSL Labs test (external)
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=app.duespark.com
```

#### API Security Testing
```bash
# Test rate limiting
for i in {1..20}; do
  curl -w "%{http_code}\n" -o /dev/null -s https://duespark-backend.fly.dev/healthz
done

# Test authentication bypass attempts
curl -w "%{http_code}\n" -o /dev/null -s https://duespark-backend.fly.dev/clients
# Should return 401 Unauthorized

# Test SQL injection protection (basic)
curl -X POST https://duespark-backend.fly.dev/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username='; DROP TABLE users; --&password=test"
# Should return 422 Unprocessable Entity or similar
```

---

## 🔍 Monitoring and Alerting Validation

### 1. Application Metrics
```bash
# 1. Prometheus metrics (if enabled)
curl -s https://duespark-backend.fly.dev/metrics_prom | grep -E "(http_requests|db_connections|scheduler)"

# 2. Health check monitoring
watch -n 30 'curl -s https://duespark-backend.fly.dev/healthz | jq .status'

# 3. Database performance metrics
flyctl postgres connect -a duespark-db
SELECT
  schemaname,
  tablename,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes
FROM pg_stat_user_tables;
\q
```

### 2. Error Tracking
```bash
# 1. Application error logs
flyctl logs --region=all | grep -i error | tail -20

# 2. Database error logs
flyctl postgres logs -a duespark-db | grep -i error | tail -10

# 3. Frontend error tracking (if Sentry configured)
# Check Sentry dashboard for any new errors
```

### 3. Performance Monitoring
```bash
# 1. Response time monitoring
curl -w "@curl-format.txt" -s https://duespark-backend.fly.dev/healthz

# Create curl-format.txt:
cat > curl-format.txt << 'EOF'
     time_namelookup:  %{time_namelookup}\n
        time_connect:  %{time_connect}\n
     time_appconnect:  %{time_appconnect}\n
    time_pretransfer:  %{time_pretransfer}\n
       time_redirect:  %{time_redirect}\n
  time_starttransfer:  %{time_starttransfer}\n
                     ----------\n
          time_total:  %{time_total}\n
EOF

# 2. Database query performance
flyctl postgres connect -a duespark-db
SELECT query, mean_time, calls FROM pg_stat_statements
ORDER BY mean_time DESC LIMIT 5;
\q
```

---

## ✅ Deployment Validation Checklist

### Pre-Deployment
- [ ] All tests pass locally
- [ ] Code quality checks pass
- [ ] Security scans complete
- [ ] Database migrations tested
- [ ] Environment variables configured
- [ ] Secrets properly set

### Backend Deployment
- [ ] Application deploys successfully
- [ ] Health check returns 200 OK
- [ ] Database connectivity verified
- [ ] Authentication endpoints work
- [ ] Protected endpoints require auth
- [ ] Background services running
- [ ] Email service functional
- [ ] Metrics endpoints accessible

### Frontend Deployment
- [ ] Application builds successfully
- [ ] Static assets accessible
- [ ] PWA manifest valid
- [ ] Service worker registers
- [ ] API connectivity works
- [ ] Authentication flow functional
- [ ] Performance scores acceptable

### Post-Deployment
- [ ] End-to-end tests pass
- [ ] Load testing successful
- [ ] Security headers present
- [ ] SSL certificates valid
- [ ] Monitoring alerts configured
- [ ] Error tracking operational
- [ ] Performance within targets

### Final Verification
- [ ] All critical user journeys work
- [ ] Mobile experience functional
- [ ] PWA features operational
- [ ] Data integrity maintained
- [ ] No security vulnerabilities
- [ ] Performance baseline met

---

## 🚨 Rollback Triggers

Immediate rollback if any of these conditions occur:
- [ ] Health check failures > 30 seconds
- [ ] Error rate > 5% for 2 minutes
- [ ] Response time > 5 seconds for any endpoint
- [ ] Database connectivity issues
- [ ] Authentication system failures
- [ ] Critical user journey failures
- [ ] Security vulnerabilities detected

## 📞 Escalation Procedures

### Level 1: Automated Alerts
- Monitoring systems detect issues
- Automated notifications sent
- Self-healing attempts made

### Level 2: On-Call Engineer
- Manual investigation required
- Engineering team notified
- Rollback decision made

### Level 3: Incident Commander
- Major incident declared
- Cross-team coordination needed
- Executive notification required

### Level 4: Emergency Response
- Service completely down
- All hands on deck
- Customer communication required

---

**Remember**: The goal is reliable deployments with minimal risk. When in doubt, choose the safer option and rollback if necessary.