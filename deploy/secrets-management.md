# DueSpark Secrets Management Guide

## 🔐 Overview

This guide covers secure management of sensitive data (API keys, passwords, tokens) across all DueSpark environments and platforms.

## 📋 Secrets Inventory

### Core Application Secrets

| Secret | Purpose | Platforms | Rotation Schedule |
|--------|---------|-----------|------------------|
| `SECRET_KEY` | JWT signing, encryption | Backend (Fly.io) | Every 90 days |
| `DATABASE_URL` | PostgreSQL connection | Backend (Fly.io) | As needed |
| `ENCRYPTION_KEY` | Data encryption at rest | Backend (Fly.io) | Every 180 days |

### External Service Secrets

| Secret | Purpose | Platforms | Rotation Schedule |
|--------|---------|-----------|------------------|
| `STRIPE_SECRET_KEY` | Payment processing | Backend (Fly.io) | As needed |
| `STRIPE_WEBHOOK_SECRET` | Webhook verification | Backend (Fly.io) | As needed |
| `STRIPE_CLIENT_ID` | OAuth integration | Backend (Fly.io) | As needed |
| `POSTMARK_SERVER_TOKEN` | Email delivery | Backend (Fly.io) | Every 180 days |
| `AWS_ACCESS_KEY_ID` | SES email (if used) | Backend (Fly.io) | Every 90 days |
| `AWS_SECRET_ACCESS_KEY` | SES email (if used) | Backend (Fly.io) | Every 90 days |

### Frontend Public Keys

| Secret | Purpose | Platforms | Notes |
|--------|---------|-----------|-------|
| `VITE_STRIPE_PUBLISHABLE_KEY` | Client-side Stripe | Frontend (Vercel) | Public, not sensitive |
| `VITE_SENTRY_DSN` | Error tracking | Frontend (Vercel) | Public, not sensitive |

### Development/CI Secrets

| Secret | Purpose | Platforms | Rotation Schedule |
|--------|---------|-----------|------------------|
| `FLY_API_TOKEN` | Deployment automation | GitHub Actions | Every 365 days |
| `VERCEL_TOKEN` | Frontend deployment | GitHub Actions | Every 365 days |
| `VERCEL_ORG_ID` | Organization ID | GitHub Actions | Static |
| `VERCEL_PROJECT_ID` | Project identifier | GitHub Actions | Static |

## 🏗️ Platform-Specific Management

### Fly.io Backend Secrets

#### Setting Secrets
```bash
# Core application secrets
flyctl secrets set SECRET_KEY="$(openssl rand -base64 32)"
flyctl secrets set ENCRYPTION_KEY="$(openssl rand -base64 32)"

# Database (auto-set when attaching PostgreSQL)
flyctl secrets set DATABASE_URL="postgresql://user:pass@host:5432/db"

# Stripe configuration
flyctl secrets set STRIPE_SECRET_KEY="sk_live_..."
flyctl secrets set STRIPE_CLIENT_ID="ca_..."
flyctl secrets set STRIPE_WEBHOOK_SECRET="whsec_..."
flyctl secrets set STRIPE_REDIRECT_URI="https://api.duespark.com/integrations/stripe/callback"

# Email provider
flyctl secrets set POSTMARK_SERVER_TOKEN="..."
flyctl secrets set EMAIL_FROM="DueSpark <no-reply@duespark.com>"

# Optional services
flyctl secrets set REDIS_URL="redis://host:port"
flyctl secrets set SENTRY_DSN="https://...@sentry.io/..."
```

#### Viewing Secrets
```bash
# List secret names (values are hidden)
flyctl secrets list

# Import/export for backup (encrypted)
flyctl secrets export > secrets-backup-$(date +%Y%m%d).json
```

#### Removing Secrets
```bash
# Remove individual secret
flyctl secrets unset SECRET_NAME

# Remove multiple secrets
flyctl secrets unset SECRET1 SECRET2 SECRET3
```

### Vercel Frontend Environment Variables

#### Setting via Dashboard
1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Add variables for each environment (Production, Preview, Development)

#### Setting via CLI
```bash
# Production environment
vercel env add VITE_API_BASE_URL production
# Enter: https://duespark-backend.fly.dev

vercel env add VITE_STRIPE_PUBLISHABLE_KEY production
# Enter: pk_live_...

# Preview environment
vercel env add VITE_API_BASE_URL preview
# Enter: https://staging-duespark-backend.fly.dev

# Development environment
vercel env add VITE_API_BASE_URL development
# Enter: http://localhost:8000
```

#### Environment Variable Management
```bash
# List all environment variables
vercel env ls

# Pull environment variables to local .env file
vercel env pull .env.local

# Remove environment variable
vercel env rm VARIABLE_NAME production
```

### GitHub Actions Secrets

#### Repository Secrets
1. Go to GitHub Repository → Settings → Secrets and variables → Actions
2. Add the following secrets:

```bash
# Deployment tokens
FLY_API_TOKEN        # From Fly.io dashboard
VERCEL_TOKEN         # From Vercel dashboard
VERCEL_ORG_ID        # From Vercel project settings
VERCEL_PROJECT_ID    # From Vercel project settings

# Optional: Notification secrets
SLACK_WEBHOOK_URL    # For deployment notifications
DISCORD_WEBHOOK_URL  # For deployment notifications
```

## 🔄 Secret Rotation Procedures

### 1. SECRET_KEY Rotation (Backend)

**When to rotate:**
- Every 90 days (scheduled)
- Suspected compromise
- Employee offboarding
- Security incident

**Procedure:**
```bash
# 1. Generate new secret key
NEW_SECRET_KEY=$(openssl rand -base64 32)

# 2. Deploy with new key (this will invalidate existing JWTs)
flyctl secrets set SECRET_KEY="$NEW_SECRET_KEY"

# 3. Verify deployment
flyctl status
flyctl logs

# 4. Test authentication endpoints
curl -X POST https://duespark-backend.fly.dev/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=test@example.com&password=testpass"

# 5. Notify users about re-authentication (if needed)
# All existing JWT tokens are now invalid
```

### 2. Database Password Rotation

**Procedure:**
```bash
# 1. Generate new password
NEW_DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

# 2. Update password in PostgreSQL
flyctl postgres connect -a duespark-db
# In PostgreSQL:
ALTER USER postgres PASSWORD '$NEW_DB_PASSWORD';

# 3. Update DATABASE_URL secret
flyctl secrets set DATABASE_URL="postgresql://postgres:$NEW_DB_PASSWORD@duespark-db.internal:5432/duespark"

# 4. Restart application to use new connection
flyctl restart

# 5. Verify connectivity
flyctl logs
```

### 3. Stripe Keys Rotation

**Procedure:**
```bash
# 1. In Stripe Dashboard, generate new API keys
# 2. Test new keys in development first
# 3. Update production secrets
flyctl secrets set STRIPE_SECRET_KEY="sk_live_NEW_KEY"
flyctl secrets set STRIPE_WEBHOOK_SECRET="whsec_NEW_SECRET"

# 4. Update frontend publishable key
vercel env add VITE_STRIPE_PUBLISHABLE_KEY production
# Enter new publishable key

# 5. Test payment flows
# 6. Deactivate old keys in Stripe Dashboard
```

### 4. Email Provider Token Rotation

**Postmark:**
```bash
# 1. Generate new server token in Postmark dashboard
# 2. Update secret
flyctl secrets set POSTMARK_SERVER_TOKEN="NEW_TOKEN"

# 3. Test email sending
curl -X POST https://duespark-backend.fly.dev/reminders/preview \
  -H "Content-Type: application/json" \
  -d '{"template": "reminder", "variables": {...}}'

# 4. Deactivate old token in Postmark
```

**AWS SES:**
```bash
# 1. Create new IAM user or rotate access keys
# 2. Update secrets
flyctl secrets set AWS_ACCESS_KEY_ID="NEW_ACCESS_KEY"
flyctl secrets set AWS_SECRET_ACCESS_KEY="NEW_SECRET_KEY"

# 3. Test email functionality
# 4. Deactivate old IAM user/keys
```

## 🔐 Security Best Practices

### 1. Secret Generation
```bash
# Strong secret generation examples
openssl rand -base64 32                    # 256-bit random key
openssl rand -hex 32                       # 256-bit hex key
python -c "import secrets; print(secrets.token_urlsafe(32))"  # URL-safe token
uuidgen                                    # UUID for unique identifiers
```

### 2. Secret Storage
- **Never commit secrets to version control**
- **Use encrypted storage** (Fly.io secrets, Vercel env vars)
- **Principle of least privilege** - only necessary services have access
- **Regular auditing** - review who has access to what

### 3. Secret Transmission
```bash
# Use secure channels for secret sharing
# Encrypted communication (Signal, ProtonMail)
# One-time secret sharing services (OneTimeSecret.com)
# Never share via Slack, email, or other persistent channels
```

### 4. Environment Separation
```bash
# Different secrets for each environment
# Development: dev-* prefixed secrets
# Staging: staging-* prefixed secrets
# Production: no prefix, highest security

# Example naming convention:
SECRET_KEY_DEV="..."
SECRET_KEY_STAGING="..."
SECRET_KEY="..."  # Production
```

## 🚨 Incident Response

### Suspected Secret Compromise

**Immediate Actions (0-30 minutes):**
1. **Assess scope** - which secrets are compromised?
2. **Rotate compromised secrets** immediately
3. **Check logs** for suspicious activity
4. **Notify team** via secure channel

**Short-term Actions (30 minutes - 4 hours):**
1. **Audit access logs** across all platforms
2. **Review recent deployments** and changes
3. **Update monitoring** and alerting
4. **Document incident** for post-mortem

**Long-term Actions (1-7 days):**
1. **Conduct post-mortem** meeting
2. **Update security procedures** based on lessons learned
3. **Review access controls** and permissions
4. **Plan security training** if needed

### Emergency Contact Procedures

**Critical Issues (Production Down):**
```bash
# Primary contacts
CTO: +1-555-xxx-xxxx
DevOps Lead: +1-555-xxx-xxxx
Security Lead: +1-555-xxx-xxxx

# Communication channels
Emergency Slack: #emergency-response
Signal Group: DueSpark Emergency
```

## 📊 Audit and Compliance

### 1. Access Logging
```bash
# Fly.io secret access is logged automatically
flyctl logs --region=all | grep "secret"

# Vercel deployment logs include env var changes
# GitHub Actions logs show secret usage (names only)
```

### 2. Regular Audits

**Monthly Audit Checklist:**
- [ ] Review who has access to Fly.io organization
- [ ] Review who has access to Vercel team
- [ ] Review GitHub repository access
- [ ] Check for any hardcoded secrets in code
- [ ] Verify all secrets are properly encrypted

**Quarterly Audit Checklist:**
- [ ] Rotate all scheduled secrets
- [ ] Review and update security procedures
- [ ] Audit third-party service access
- [ ] Update emergency contact information
- [ ] Security training for team members

### 3. Compliance Documentation
```bash
# Document all secret operations
# Maintain audit trail of rotations
# Track who accessed what and when
# Keep incident response documentation updated
```

## 🛠️ Tools and Automation

### 1. Secret Management Tools
```bash
# Consider implementing additional tools for larger teams:
# - HashiCorp Vault for centralized secret management
# - AWS Secrets Manager for AWS-hosted secrets
# - Azure Key Vault for Microsoft ecosystem
# - 1Password Business for team secret sharing
```

### 2. Automated Rotation Scripts
```bash
# Create scripts for common rotations
# Example: scripts/rotate-secret-key.sh
#!/bin/bash
set -e

NEW_KEY=$(openssl rand -base64 32)
flyctl secrets set SECRET_KEY="$NEW_KEY"
echo "✅ SECRET_KEY rotated successfully"

# Schedule with cron or GitHub Actions
# 0 2 1 */3 * /path/to/rotate-secret-key.sh  # Quarterly rotation
```

### 3. Monitoring and Alerting
```bash
# Set up alerts for:
# - Failed authentication attempts
# - Unusual API access patterns
# - Secret rotation failures
# - Unauthorized access attempts
```

---

## 📞 Emergency Procedures

### Secret Compromise Response Template

```markdown
## Incident: [INCIDENT-ID] - Secret Compromise

**Detected:** [TIMESTAMP]
**Severity:** [HIGH/CRITICAL]
**Status:** [ACTIVE/RESOLVED]

### Affected Secrets
- [ ] SECRET_KEY
- [ ] DATABASE_URL
- [ ] STRIPE_SECRET_KEY
- [ ] Other: ___________

### Actions Taken
- [ ] Rotated compromised secrets
- [ ] Reviewed access logs
- [ ] Notified team members
- [ ] Updated monitoring
- [ ] Documented incident

### Next Steps
- [ ] Conduct post-mortem
- [ ] Update procedures
- [ ] Security training
```

Remember: **When in doubt, rotate the secret.** It's better to be safe than sorry when it comes to security.