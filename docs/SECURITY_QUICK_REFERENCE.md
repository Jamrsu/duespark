# DueSpark Security Quick Reference

## 🚨 Critical Actions Required

### 1. Generate Secure Secrets (IMMEDIATE)
```bash
# Run the automated setup
./scripts/setup-secure-env.sh

# Or generate manually
openssl rand -base64 32  # For SECRET_KEY, ENCRYPTION_KEY, JWT_SECRET_KEY
openssl rand -base64 16  # For database passwords
```

### 2. Replace Hardcoded Values
**Find and replace these immediately:**
- `SECRET_KEY: change-me` → Use generated 32-byte key
- `POSTGRES_PASSWORD: duespark` → Use secure password
- `ADMIN_PASSWORD: admin123` → Use strong password

### 3. Environment Files Checklist
- [ ] `.env` (Docker Compose) - Secure secrets set
- [ ] `.env.development` - Development-specific config
- [ ] `.env.production` - Production-specific config (never commit)
- [ ] `sic_backend_mvp_jwt_sqlite/.env` - Backend config

## Command Cheat Sheet

### Secret Generation
```bash
# 32-byte secret for cryptographic keys
openssl rand -base64 32

# 16-byte password for databases
openssl rand -base64 16 | tr -d "=+/"

# 20-character password for admin
openssl rand -base64 20 | tr -d "=+/"
```

### Environment Setup
```bash
# Development
cp .env.development.template .env.development
# Edit file and replace placeholders

# Production
cp .env.production.template .env.production
# Edit file and replace placeholders
# Store securely, DO NOT commit
```

### Docker Compose
```bash
# Create secure .env for Docker
./scripts/setup-secure-env.sh
# Choose option 5: "Generate Docker Compose environment"
```

### Validation
```bash
# Validate environment file
./scripts/setup-secure-env.sh
# Choose option 4: "Validate existing environment file"

# Check for security issues
grep -r "change-me\|admin123" --exclude-dir=.git .
```

## Environment Variables Reference

### Required Security Variables
```bash
SECRET_KEY=              # 32-byte key for general encryption
ENCRYPTION_KEY=          # 32-byte key for data encryption
JWT_SECRET_KEY=          # 32-byte key for JWT tokens
POSTGRES_PASSWORD=       # Secure database password
ADMIN_PASSWORD=          # Secure admin account password
```

### Environment-Specific
```bash
ENVIRONMENT=             # development|staging|production
DEBUG=                   # true (dev/staging) | false (production)
BACKEND_CORS_ORIGINS=    # JSON array of allowed origins
```

### Production Requirements
```bash
ENVIRONMENT=production
DEBUG=false
BACKEND_CORS_ORIGINS=["https://app.yourdomain.com"]
```

## Security Status Check

### Files Modified ✅
- `/docker-compose.yml` - Uses environment variables
- `/.env.example` - Secure template
- `/scripts/seed_admin.py` - Enforces secure passwords
- `/sic_backend_mvp_jwt_sqlite/app/main.py` - Environment-based CORS
- `/sic_backend_mvp_jwt_sqlite/.env.example` - Security warnings

### Templates Created ✅
- `.env.development.template` - Development environment
- `.env.staging.template` - Staging environment
- `.env.production.template` - Production environment
- `scripts/setup-secure-env.sh` - Automated setup tool

### Critical Issues Fixed ✅
- Hardcoded database credentials
- Default SECRET_KEY values
- Default admin passwords
- Hardcoded CORS configurations
- Missing environment separation

## Deployment Checklist

### Before Deployment
- [ ] Generate unique secrets for target environment
- [ ] Set ENVIRONMENT=production (for production)
- [ ] Set DEBUG=false (for production)
- [ ] Configure CORS for target domain
- [ ] Validate all environment variables
- [ ] Test database connection
- [ ] Test admin account login

### Production Deployment
- [ ] Store secrets in cloud provider secret manager
- [ ] Use HTTPS everywhere
- [ ] Configure security headers
- [ ] Enable monitoring and logging
- [ ] Set up backup encryption
- [ ] Plan secret rotation schedule

## Emergency Procedures

### If Secrets Compromised
1. **Generate new secrets immediately**
2. **Update all environments**
3. **Deploy new configuration**
4. **Monitor for unauthorized access**
5. **Document the incident**

### Quick Secret Rotation
```bash
# Generate new secrets
NEW_SECRET=$(openssl rand -base64 32)

# Update in cloud provider (example for Fly.io)
flyctl secrets set SECRET_KEY="$NEW_SECRET"

# Deploy immediately
flyctl deploy
```

## Support Resources

- **Full Implementation Guide:** `docs/SECURITY_IMPLEMENTATION_GUIDE.md`
- **Security Audit Report:** `docs/SECURITY_AUDIT_REPORT.md`
- **Automated Setup Tool:** `scripts/setup-secure-env.sh`
- **Deployment Guides:** `deploy/` directory