# DueSpark Security Implementation Guide

This guide provides step-by-step instructions for implementing the security fixes identified in the security audit.

## 🚨 CRITICAL: Complete Phase 1 Before Any Deployment

### Phase 1: Critical Security Fixes (REQUIRED)

#### 1. Generate Secure Environment Files

**Use the automated setup script:**
```bash
# Make the script executable
chmod +x scripts/setup-secure-env.sh

# Run the interactive setup
./scripts/setup-secure-env.sh
```

**Or generate manually:**
```bash
# Generate secure secrets
SECRET_KEY=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)
JWT_SECRET_KEY=$(openssl rand -base64 32)
DB_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/")
ADMIN_PASSWORD=$(openssl rand -base64 20 | tr -d "=+/")

echo "SECRET_KEY=$SECRET_KEY"
echo "ENCRYPTION_KEY=$ENCRYPTION_KEY"
echo "JWT_SECRET_KEY=$JWT_SECRET_KEY"
echo "DB_PASSWORD=$DB_PASSWORD"
echo "ADMIN_PASSWORD=$ADMIN_PASSWORD"
```

#### 2. Update Docker Compose Environment

Create `.env` file for Docker Compose:
```bash
# Copy the template and fill with secure values
cp .env.development.template .env

# Edit .env and replace ALL placeholder values
# Use the secrets generated above
```

#### 3. Environment-Specific Setup

**For Development:**
```bash
cp .env.development.template .env.development
# Edit and replace placeholders with secure values
```

**For Staging:**
```bash
cp .env.staging.template .env.staging
# Edit and replace placeholders with secure values
```

**For Production:**
```bash
cp .env.production.template .env.production
# Edit and replace placeholders with secure values
# Store in secure location, DO NOT commit to version control
```

#### 4. Database Security

**Update database credentials:**
```bash
# In your environment file, ensure:
POSTGRES_DB=your_database_name
POSTGRES_USER=your_db_user
POSTGRES_PASSWORD=your_secure_db_password

# Database URL should use environment variables:
DATABASE_URL=postgresql+psycopg2://${POSTGRES_USER}:${POSTGRES_PASSWORD}@host:5432/${POSTGRES_DB}
```

#### 5. Admin Account Security

**Set secure admin credentials:**
```bash
# Required environment variables:
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=your_very_secure_admin_password

# The system will reject weak passwords like "admin123"
```

#### 6. CORS Configuration

**Update backend CORS settings:**

The backend now uses environment-based CORS configuration. Set in your environment file:

```bash
# Development
BACKEND_CORS_ORIGINS=["http://localhost:5173", "http://localhost:3000"]

# Production
BACKEND_CORS_ORIGINS=["https://app.yourdomain.com", "https://yourdomain.com"]

# Staging
BACKEND_CORS_ORIGINS=["https://app-staging.yourdomain.com"]
```

### Phase 2: Environment Configuration

#### 1. Set Production Environment Variables

**Required for production:**
```bash
ENVIRONMENT=production
DEBUG=false
BACKEND_CORS_ORIGINS=["https://your-production-frontend.com"]
```

#### 2. External Service Configuration

**Stripe (Production):**
```bash
STRIPE_CLIENT_ID=ca_your_live_client_id
STRIPE_SECRET_KEY=sk_live_your_live_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_live_webhook_secret
STRIPE_REDIRECT_URI=https://api.yourdomain.com/integrations/stripe/callback
```

**Email (Production):**
```bash
EMAIL_PROVIDER=postmark
POSTMARK_SERVER_TOKEN=your_production_token
MAIL_FROM=no-reply@yourdomain.com
EMAIL_FROM="DueSpark <no-reply@yourdomain.com>"
```

### Phase 3: Deployment Security

#### 1. Cloud Provider Setup

**For AWS:**
```bash
# Use AWS Secrets Manager
aws secretsmanager create-secret --name "duespark/prod/secret-key" --secret-string "$SECRET_KEY"
aws secretsmanager create-secret --name "duespark/prod/db-password" --secret-string "$DB_PASSWORD"
```

**For Fly.io:**
```bash
# Set secrets
flyctl secrets set SECRET_KEY="$SECRET_KEY"
flyctl secrets set POSTGRES_PASSWORD="$DB_PASSWORD"
flyctl secrets set ADMIN_PASSWORD="$ADMIN_PASSWORD"
```

**For Render:**
```bash
# Set in Render dashboard or via API
# Environment Variables section
```

#### 2. Frontend Security

**Update frontend environment files:**

```bash
# Production frontend (.env.production.local)
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_APP_URL=https://app.yourdomain.com
VITE_APP_ENV=production
VITE_ENABLE_DEBUG=false
VITE_LOG_LEVEL=error
```

### Phase 4: Validation & Testing

#### 1. Validate Configuration

```bash
# Run the validation script
./scripts/setup-secure-env.sh
# Choose option 4: "Validate existing environment file"
```

#### 2. Test Database Connection

```bash
# Test with new credentials
python -c "
import os
from sqlalchemy import create_engine
engine = create_engine(os.getenv('DATABASE_URL'))
connection = engine.connect()
print('Database connection successful')
connection.close()
"
```

#### 3. Test Backend API

```bash
# Start backend with new configuration
cd sic_backend_mvp_jwt_sqlite
uvicorn app.main:app --host 0.0.0.0 --port 8005

# Test health endpoint
curl http://localhost:8005/healthz
```

#### 4. Test Admin Account

```bash
# Seed admin with secure credentials
python scripts/seed_admin.py

# Test login
curl -X POST http://localhost:8005/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@yourdomain.com&password=your_secure_admin_password"
```

## Security Checklist

### Before Deployment
- [ ] All `change-me` values replaced with secure secrets
- [ ] No default passwords (`admin123`) in use
- [ ] Database credentials are unique and secure
- [ ] CORS origins configured for target environment
- [ ] DEBUG=false in production
- [ ] Environment variables validated
- [ ] Secrets stored in secure location (not version control)

### Production Deployment
- [ ] Use HTTPS everywhere
- [ ] Enable security headers
- [ ] Configure rate limiting
- [ ] Set up monitoring and alerting
- [ ] Enable audit logging
- [ ] Configure backup encryption
- [ ] Set up secrets rotation schedule

### Regular Maintenance
- [ ] Rotate secrets every 90 days
- [ ] Update dependencies monthly
- [ ] Review access logs weekly
- [ ] Audit user permissions monthly
- [ ] Test backup restoration quarterly

## Troubleshooting

### Common Issues

**"POSTGRES_PASSWORD environment variable is required"**
```bash
# Solution: Set the environment variable
export POSTGRES_PASSWORD="your_secure_password"
```

**"SECRET_KEY environment variable is required"**
```bash
# Solution: Generate and set SECRET_KEY
export SECRET_KEY="$(openssl rand -base64 32)"
```

**"Invalid BACKEND_CORS_ORIGINS format"**
```bash
# Solution: Use proper JSON array format
export BACKEND_CORS_ORIGINS='["https://app.yourdomain.com"]'
```

**"Default password 'admin123' is not allowed"**
```bash
# Solution: Set a secure admin password
export ADMIN_PASSWORD="$(openssl rand -base64 20)"
```

### Security Validation

**Check for remaining security issues:**
```bash
# Search for hardcoded secrets
grep -r "change-me\|admin123\|duespark:duespark" --exclude-dir=.git .

# Validate environment files
find . -name ".env*" -exec ./scripts/setup-secure-env.sh {} \;
```

## Emergency Response

### If Secrets Are Compromised

1. **Immediately rotate all secrets**
2. **Check access logs for unauthorized access**
3. **Update all deployment environments**
4. **Notify users if data may have been accessed**
5. **Review and strengthen security procedures**

### Secret Rotation Procedure

```bash
# Generate new secrets
NEW_SECRET_KEY=$(openssl rand -base64 32)
NEW_DB_PASSWORD=$(openssl rand -base64 16)

# Update in cloud provider
flyctl secrets set SECRET_KEY="$NEW_SECRET_KEY"
flyctl secrets set POSTGRES_PASSWORD="$NEW_DB_PASSWORD"

# Deploy updated configuration
flyctl deploy
```

## Support

For questions about this implementation guide:
- Review the Security Audit Report: `docs/SECURITY_AUDIT_REPORT.md`
- Check the deployment guides in `deploy/` directory
- Use the automated setup script: `scripts/setup-secure-env.sh`