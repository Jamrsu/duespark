# DueSpark Backend Deployment Guide - Fly.io

## 🚀 Prerequisites

1. **Install Fly CLI**
   ```bash
   # macOS
   brew install flyctl

   # Linux/Windows
   curl -L https://fly.io/install.sh | sh
   ```

2. **Authenticate with Fly.io**
   ```bash
   flyctl auth signup  # or flyctl auth login
   ```

3. **Set up billing** (required for persistent storage and PostgreSQL)
   - Visit https://fly.io/dashboard/billing
   - Add payment method

## 📊 Database Setup (PostgreSQL)

### 1. Create PostgreSQL Cluster
```bash
# Create PostgreSQL cluster
flyctl postgres create \
  --name duespark-db \
  --region iad \
  --initial-cluster-size 1 \
  --volume-size 10 \
  --vm-size shared-cpu-1x

# Note the connection details provided - you'll need these for DATABASE_URL
```

### 2. Database Configuration
```bash
# Connect to your database to verify
flyctl postgres connect -a duespark-db

# Optional: Create additional databases
CREATE DATABASE duespark_staging;
CREATE DATABASE duespark_test;
```

## 🔐 Secrets Management

### 1. Set Required Secrets
```bash
# Navigate to the project root
cd /path/to/duespark

# Core application secrets
flyctl secrets set SECRET_KEY="$(openssl rand -base64 32)"
flyctl secrets set DATABASE_URL="postgresql://username:password@duespark-db.internal:5432/duespark"

# Stripe configuration (get from Stripe dashboard)
flyctl secrets set STRIPE_SECRET_KEY="sk_live_..."
flyctl secrets set STRIPE_CLIENT_ID="ca_..."
flyctl secrets set STRIPE_WEBHOOK_SECRET="whsec_..."

# Email provider (Postmark)
flyctl secrets set POSTMARK_SERVER_TOKEN="..."
flyctl secrets set EMAIL_FROM="DueSpark <no-reply@yourdomain.com>"

# Optional: Redis (for enhanced caching)
flyctl secrets set REDIS_URL="redis://your-redis-instance"

# Production URLs
flyctl secrets set PUBLIC_BASE_URL="https://api.duespark.com"
flyctl secrets set STRIPE_REDIRECT_URI="https://api.duespark.com/integrations/stripe/callback"
```

### 2. Verify Secrets
```bash
flyctl secrets list
```

## 🏗️ Application Deployment

### 1. Initial Deployment
```bash
# From project root directory
flyctl launch --no-deploy

# Review and modify generated fly.toml if needed
# Deploy the application
flyctl deploy
```

### 2. Attach PostgreSQL to App
```bash
flyctl postgres attach duespark-db --app duespark-backend
```

### 3. Scale Application
```bash
# Scale to 2 machines for high availability
flyctl scale count 2

# Or set specific memory/CPU
flyctl scale memory 2048  # 2GB RAM
flyctl scale cpu shared-cpu-2x
```

## 🔍 Post-Deployment Verification

### 1. Check Application Status
```bash
# Application overview
flyctl status

# View logs
flyctl logs

# Check health
curl https://duespark-backend.fly.dev/healthz
```

### 2. Verify Database Connection
```bash
# Connect to application and test DB
flyctl ssh console
# Inside the container:
python -c "
from app.database import engine
from sqlalchemy import text
with engine.connect() as conn:
    result = conn.execute(text('SELECT version()'))
    print('PostgreSQL version:', result.fetchone()[0])
"
```

### 3. Test API Endpoints
```bash
# Test basic endpoints
curl https://duespark-backend.fly.dev/docs
curl https://duespark-backend.fly.dev/healthz

# Test authentication (create test user first)
curl -X POST https://duespark-backend.fly.dev/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'
```

## 🔄 Database Migrations

### Manual Migration (if needed)
```bash
# SSH into the application
flyctl ssh console

# Run migrations manually
alembic upgrade head

# Or run specific migration
alembic upgrade +1
```

### Verify Migration Status
```bash
# Check current migration version
flyctl ssh console
alembic current
```

## 📈 Monitoring & Scaling

### 1. View Metrics
```bash
# Application metrics
flyctl metrics

# PostgreSQL metrics
flyctl postgres metrics -a duespark-db
```

### 2. Auto-scaling Configuration
```bash
# Configure auto-scaling
flyctl autoscale set min=1 max=3

# Check auto-scaling status
flyctl autoscale show
```

### 3. Alerts (via Fly.io dashboard)
- Set up alerts for high CPU usage (>80%)
- Database connection alerts
- Memory usage alerts (>85%)
- Response time alerts (>2s)

## 🔧 Troubleshooting

### Common Issues

**1. Application Won't Start**
```bash
# Check logs for errors
flyctl logs

# SSH into machine to debug
flyctl ssh console

# Check environment variables
printenv | grep -E "(DATABASE_URL|SECRET_KEY)"
```

**2. Database Connection Issues**
```bash
# Test database connectivity
flyctl postgres connect -a duespark-db

# Check if app is attached to database
flyctl postgres list
```

**3. Health Check Failures**
```bash
# Check health endpoint directly
curl -v https://duespark-backend.fly.dev/healthz

# SSH and test internally
flyctl ssh console
curl localhost:8000/healthz
```

### Performance Optimization

**1. Database Performance**
```bash
# Monitor slow queries
flyctl postgres connect -a duespark-db
# In PostgreSQL:
SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;
```

**2. Application Performance**
```bash
# Check memory usage
flyctl ssh console
free -h
ps aux --sort=-%mem | head
```

## 🔒 Security Considerations

### 1. Network Security
- All traffic is automatically HTTPS via Fly.io's TLS termination
- Internal communication between app and database is encrypted
- Use Fly.io's private networking for database connections

### 2. Secrets Rotation
```bash
# Rotate SECRET_KEY
flyctl secrets set SECRET_KEY="$(openssl rand -base64 32)"

# Rotate database password
flyctl postgres update --password -a duespark-db

# Update DATABASE_URL with new password
flyctl secrets set DATABASE_URL="postgresql://username:new_password@duespark-db.internal:5432/duespark"
```

### 3. Access Control
```bash
# List who has access to the app
flyctl auth whoami
flyctl orgs show

# Remove access if needed
flyctl orgs members remove user@example.com
```

## 📦 Backup & Recovery

### 1. Database Backups
```bash
# Automated backups are enabled by default for PostgreSQL
# View backup schedule
flyctl postgres backups list -a duespark-db

# Create manual backup
flyctl postgres backup create -a duespark-db
```

### 2. Application Deployment Rollback
```bash
# View deployment history
flyctl releases

# Rollback to previous version
flyctl releases rollback
```

## 🚀 CI/CD Integration

### GitHub Actions Example
Create `.github/workflows/deploy-backend.yml`:

```yaml
name: Deploy Backend to Fly.io

on:
  push:
    branches: [main]
    paths: ['sic_backend_mvp_jwt_sqlite/**']

jobs:
  deploy:
    name: Deploy Backend
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Fly.io CLI
        uses: superfly/flyctl-actions/setup-flyctl@master

      - name: Deploy to Fly.io
        run: flyctl deploy --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

## 📊 Cost Optimization

### 1. Resource Management
```bash
# Check current resource usage
flyctl status --all

# Scale down during low usage
flyctl scale count 1

# Use smaller VM sizes for development
flyctl scale vm shared-cpu-1x --memory 512
```

### 2. Database Optimization
```bash
# Monitor database size
flyctl postgres info -a duespark-db

# Optimize database storage
flyctl postgres connect -a duespark-db
# In PostgreSQL:
VACUUM ANALYZE;
```

---

## 📞 Support & Resources

- **Fly.io Documentation**: https://fly.io/docs/
- **Fly.io Community**: https://community.fly.io/
- **DueSpark Specific Issues**: Check the project's issue tracker
- **Emergency Contacts**: Document your team's emergency contacts for production issues