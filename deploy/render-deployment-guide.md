# DueSpark Backend Deployment Guide - Render

## 🚀 Prerequisites

1. **Render Account**
   - Sign up at https://render.com
   - Connect your GitHub account
   - Add payment method for paid services

2. **Repository Setup**
   - Ensure your repository is public or you have Render's private repo access
   - DueSpark code should be in the repository root

## 📊 Database Setup (PostgreSQL)

### 1. Create PostgreSQL Database

1. **Go to Render Dashboard**
   - Visit https://dashboard.render.com
   - Click "New +" → "PostgreSQL"

2. **Configure Database**
   ```
   Name: duespark-postgres
   Database: duespark
   User: duespark
   Region: Oregon (US West) or Virginia (US East)
   PostgreSQL Version: 16
   Plan: Starter ($7/month) or Free (limited)
   ```

3. **Save Connection Details**
   - Render will provide the connection string
   - Format: `postgresql://user:password@host:port/database`
   - Note the External Database URL for later use

### 2. Database Initialization
```sql
-- Connect to your database (via Render dashboard or external tool)
-- Database will be created automatically with the connection string
-- DueSpark will handle table creation via Alembic migrations
```

## 🏗️ Backend Service Deployment

### Method 1: Infrastructure as Code (Recommended)

1. **Use render.yaml Configuration**
   ```bash
   # The render.yaml file in the project root contains all configuration
   # Render will automatically detect and use this file
   ```

2. **Connect Repository**
   - Go to Render Dashboard
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Render will detect the `render.yaml` file

3. **Review Configuration**
   - Service name: `duespark-backend`
   - Environment: Python
   - Build command: Automatic from render.yaml
   - Start command: Automatic from render.yaml

### Method 2: Manual Configuration

1. **Create Web Service**
   - Go to Render Dashboard
   - Click "New +" → "Web Service"
   - Connect repository

2. **Configure Service**
   ```
   Name: duespark-backend
   Environment: Python
   Region: Oregon (match your database)
   Branch: main
   Root Directory: ./
   Build Command: cd sic_backend_mvp_jwt_sqlite && pip install -r requirements.txt
   Start Command: cd sic_backend_mvp_jwt_sqlite && alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```

3. **Set Plan**
   - Starter: $7/month (512MB RAM, shared CPU)
   - Standard: $25/month (1GB RAM, dedicated CPU)
   - Pro: $85/month (4GB RAM, dedicated CPU)

## 🔐 Environment Variables Setup

### 1. Required Environment Variables

Set these in Render Dashboard → Service → Environment:

**Core Application:**
```bash
# Python Configuration
PYTHONPATH=/opt/render/project/src/sic_backend_mvp_jwt_sqlite
PYTHONDONTWRITEBYTECODE=1
PYTHONUNBUFFERED=1

# Application Settings
APP_ENV=production
LOG_LEVEL=info

# Database (use the connection string from your PostgreSQL service)
DATABASE_URL=postgresql://user:pass@host:port/database
```

**Security Secrets:**
```bash
# Generate secure keys
SECRET_KEY=<32-byte-random-key>  # Generate with: openssl rand -base64 32
ENCRYPTION_KEY=<32-byte-random-key>
```

**Email Provider (Postmark):**
```bash
EMAIL_PROVIDER=postmark
POSTMARK_SERVER_TOKEN=<your-postmark-token>
EMAIL_FROM=DueSpark <no-reply@yourdomain.com>
```

**Stripe Configuration:**
```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_CLIENT_ID=ca_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_REDIRECT_URI=https://duespark-backend.onrender.com/integrations/stripe/callback
```

**Application URLs:**
```bash
PUBLIC_BASE_URL=https://duespark-backend.onrender.com
FRONTEND_URL=https://app.duespark.com
```

### 2. Optional Environment Variables
```bash
# Scheduler Settings
SCHEDULER_BATCH_SIZE=200
ADAPTIVE_ENABLE=true

# Rate Limiting
RATE_LIMIT_REQUESTS_PER_MINUTE=60
RATE_LIMIT_REQUESTS_PER_HOUR=1000

# Monitoring (optional)
SENTRY_DSN=https://...@sentry.io/...

# Redis (if you add Redis service)
REDIS_URL=redis://red-...@oregon-redis.render.com:6379
```

## 🔄 Deployment Process

### 1. Initial Deployment
```bash
# Render will automatically deploy when you:
# 1. Connect the repository
# 2. Configure the service
# 3. Click "Create Web Service"

# Monitor deployment in Render dashboard
# Check logs for any issues
```

### 2. Connect Database to Web Service
```bash
# In Render Dashboard:
# 1. Go to your web service
# 2. Go to "Environment" tab
# 3. Add DATABASE_URL with the connection string from your PostgreSQL service
# 4. The format should be: postgresql://user:password@host:port/database
```

### 3. Custom Domain (Optional)
```bash
# In Render Dashboard → Service → Settings:
# 1. Scroll to "Custom Domains"
# 2. Add your domain (e.g., api.duespark.com)
# 3. Configure DNS with provided CNAME
# 4. SSL certificate will be auto-provisioned
```

## 🔍 Post-Deployment Verification

### 1. Health Check
```bash
# Test basic connectivity
curl https://duespark-backend.onrender.com/healthz

# Expected response:
# {"status": "ok", "timestamp": "...", "version": "..."}
```

### 2. API Endpoints Testing
```bash
# Test API documentation
curl https://duespark-backend.onrender.com/docs

# Test authentication
curl -X POST https://duespark-backend.onrender.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'

# Login and test protected endpoints
curl -X POST https://duespark-backend.onrender.com/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=test@example.com&password=testpass123"
```

### 3. Database Connection
```bash
# Connect to database via Render dashboard or external tool
# Verify tables were created by Alembic migrations
# Check: users, clients, invoices, reminders tables exist
```

## 📈 Scaling and Performance

### 1. Vertical Scaling
```bash
# Upgrade your service plan in Render Dashboard:
# Starter (512MB) → Standard (1GB) → Pro (4GB)
# Higher tiers provide more CPU and memory
```

### 2. Horizontal Scaling
```bash
# Render automatically handles load balancing
# You can't manually scale instances on lower tiers
# Pro+ plans include auto-scaling features
```

### 3. Performance Optimization
```bash
# 1. Enable connection pooling in database settings
# 2. Use Redis for caching (add as separate service)
# 3. Monitor performance via Render metrics
# 4. Optimize database queries with indexes
```

## 🔧 Monitoring & Debugging

### 1. Viewing Logs
```bash
# In Render Dashboard:
# 1. Go to your service
# 2. Click "Logs" tab
# 3. View real-time application logs
# 4. Filter by severity level
```

### 2. Metrics and Monitoring
```bash
# Available in Render Dashboard:
# - CPU usage
# - Memory usage
# - Request volume
# - Response times
# - Error rates
```

### 3. Health Checks
```bash
# Render automatically monitors /healthz endpoint
# Failed health checks trigger automatic restarts
# Configure custom health check paths if needed
```

## 🔒 Security Considerations

### 1. Environment Variables
```bash
# All environment variables are encrypted at rest
# Use Render's environment variable feature, not .env files
# Sensitive values are masked in logs and UI
```

### 2. Network Security
```bash
# All traffic is HTTPS by default
# Internal service communication is encrypted
# Database connections use SSL/TLS
```

### 3. Access Control
```bash
# Limit dashboard access to authorized team members
# Use GitHub organization permissions
# Enable two-factor authentication
```

## 📦 Database Management

### 1. Backups
```bash
# Render provides automatic daily backups
# Backups retained for 7 days (Starter) to 30 days (Pro+)
# Point-in-time recovery available on paid plans
```

### 2. Manual Backup
```bash
# Connect to database using external tool (pgAdmin, DBeaver, etc.)
# Or use command line:
pg_dump -h <hostname> -U <username> -d <database> > backup.sql
```

### 3. Restore from Backup
```bash
# Via Render dashboard:
# 1. Go to PostgreSQL service
# 2. Navigate to "Backups" tab
# 3. Select backup and restore

# Or via command line:
psql -h <hostname> -U <username> -d <database> < backup.sql
```

## 🚨 Troubleshooting

### Common Issues

**1. Service Won't Start**
```bash
# Check logs in Render dashboard
# Common causes:
# - Missing environment variables
# - Database connection issues
# - Port binding problems (use $PORT)
# - Python path issues
```

**2. Database Connection Failed**
```bash
# Verify DATABASE_URL format
# Check if database service is running
# Ensure database and web service are in same region
# Test connection string with external tool
```

**3. Build Failures**
```bash
# Check Python version (3.11 recommended)
# Verify requirements.txt is complete
# Check for missing system dependencies
# Review build logs for specific errors
```

**4. Memory Issues**
```bash
# Monitor memory usage in dashboard
# Consider upgrading to higher plan
# Optimize application memory usage
# Check for memory leaks in code
```

## 💰 Cost Optimization

### 1. Service Sizing
```bash
# Start with Starter plan ($7/month)
# Monitor resource usage
# Scale up only when needed
# Use shared database for development
```

### 2. Database Optimization
```bash
# Use connection pooling
# Optimize queries to reduce load
# Clean up old data regularly
# Consider read replicas for heavy workloads
```

### 3. Monitoring Usage
```bash
# Review monthly usage in billing dashboard
# Set up usage alerts
# Optimize resource-intensive operations
# Use caching to reduce database calls
```

## 🔄 CI/CD Integration

### GitHub Actions Example
```yaml
# .github/workflows/deploy-render.yml
name: Deploy to Render

on:
  push:
    branches: [main]
    paths: ['sic_backend_mvp_jwt_sqlite/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Render
        run: |
          # Render automatically deploys on git push
          # This job can run tests or notifications
          echo "Deployment triggered automatically by Render"

      - name: Wait for deployment
        run: |
          sleep 60  # Wait for deployment
          curl -f https://duespark-backend.onrender.com/healthz
```

## 📊 Migration from Other Platforms

### From Heroku
```bash
# 1. Export environment variables from Heroku
heroku config --app your-heroku-app

# 2. Create Render services (web + database)
# 3. Set environment variables in Render
# 4. Import database dump if needed
# 5. Update DNS to point to Render
```

### From Railway/Fly.io
```bash
# 1. Export current configuration
# 2. Create equivalent services on Render
# 3. Migrate database data
# 4. Update application configuration
# 5. Test thoroughly before switching DNS
```

---

## 📞 Support and Resources

### Render Resources
- **Documentation**: https://render.com/docs
- **Community**: https://community.render.com
- **Status Page**: https://status.render.com
- **Support**: Available via dashboard (paid plans)

### DueSpark-Specific
- **Project Issues**: Check repository issue tracker
- **Team Communication**: Use established channels

---

## ✅ Deployment Checklist

### Pre-deployment
- [ ] Render account created and billing configured
- [ ] Repository connected to Render
- [ ] PostgreSQL database created
- [ ] Environment variables configured
- [ ] Domain name configured (optional)

### Deployment
- [ ] Web service created and deployed
- [ ] Database connected to web service
- [ ] Health check passes
- [ ] API endpoints responding correctly
- [ ] Database migrations completed
- [ ] SSL certificate provisioned

### Post-deployment
- [ ] Authentication flow tested
- [ ] Email sending verified
- [ ] Background jobs running
- [ ] Monitoring configured
- [ ] Backup schedule confirmed
- [ ] Team access configured

**🎉 Your DueSpark backend is now live on Render!**

---

*Remember: Render deployments are automatic on git push to your main branch, making continuous deployment seamless.*