# DueSpark Deployment Guide

## 🚀 Quick Start

The fastest way to deploy DueSpark to production:

```bash
# 1. One-time setup
./deploy/quick-deploy.sh setup

# 2. Set required secrets (follow prompts from setup)
flyctl secrets set SECRET_KEY="$(openssl rand -base64 32)"
flyctl secrets set STRIPE_SECRET_KEY="sk_..."
flyctl secrets set POSTMARK_SERVER_TOKEN="..."

# 3. Deploy everything
./deploy/quick-deploy.sh full
```

## 📁 Deployment Files Overview

| File | Purpose |
|------|---------|
| `quick-deploy.sh` | One-command deployment script |
| `flyio-deployment-guide.md` | Comprehensive Fly.io backend deployment |
| `vercel-deployment-guide.md` | Complete Vercel frontend deployment |
| `secrets-management.md` | Secure secrets handling procedures |
| `runbooks.md` | Operations runbooks for production |
| `deployment-validation.md` | Testing and validation procedures |

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Vercel CDN    │    │   Fly.io Edge    │    │  PostgreSQL     │
│   (Frontend)    │────│   (Backend)      │────│  (Database)     │
│                 │    │                  │    │                 │
│ app.duespark.com│    │duespark-backend  │    │ duespark-db     │
│                 │    │    .fly.dev      │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Production URLs
- **Frontend**: https://app.duespark.com
- **Backend API**: https://duespark-backend.fly.dev
- **API Documentation**: https://duespark-backend.fly.dev/docs

## 🔧 Quick Commands

### Deployment
```bash
# Deploy backend only
./deploy/quick-deploy.sh backend

# Deploy frontend only
./deploy/quick-deploy.sh frontend

# Deploy everything
./deploy/quick-deploy.sh full
```

### Monitoring
```bash
# Check status
./deploy/quick-deploy.sh status

# View logs
./deploy/quick-deploy.sh logs

# Monitor in real-time
flyctl logs --app duespark-backend
```

### Emergency
```bash
# Rollback deployment
./deploy/quick-deploy.sh rollback

# Emergency database backup
flyctl postgres backup create -a duespark-db

# Scale up resources
flyctl scale count 3
flyctl scale memory 2048
```

## 📋 Prerequisites Checklist

### Required Tools
- [ ] [Fly.io CLI](https://fly.io/docs/getting-started/installing-flyctl/) installed
- [ ] [Vercel CLI](https://vercel.com/cli) installed (optional)
- [ ] [Docker](https://docs.docker.com/get-docker/) installed
- [ ] [Node.js 18+](https://nodejs.org/) installed
- [ ] [Python 3.11+](https://www.python.org/) installed

### Accounts & Authentication
- [ ] Fly.io account with billing enabled
- [ ] Vercel account connected to GitHub
- [ ] Domain name configured (optional)
- [ ] External service accounts (Stripe, Postmark, etc.)

### Environment Setup
- [ ] Repository cloned locally
- [ ] Environment variables configured
- [ ] Secrets properly set
- [ ] Dependencies installed

## 🔐 Required Secrets

### Backend (Fly.io)
```bash
# Core application
SECRET_KEY=<32-byte-random-key>
DATABASE_URL=<auto-set-by-postgres-addon>

# Payment processing
STRIPE_SECRET_KEY=sk_live_...
STRIPE_CLIENT_ID=ca_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email delivery
POSTMARK_SERVER_TOKEN=...
EMAIL_FROM="DueSpark <no-reply@yourdomain.com>"
```

### Frontend (Vercel)
```bash
# API configuration
VITE_API_BASE_URL=https://duespark-backend.fly.dev
VITE_APP_URL=https://app.duespark.com

# External services
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_SENTRY_DSN=https://...@sentry.io/...
```

## 🚦 Deployment Environments

### Production
- **Backend**: Fly.io with PostgreSQL
- **Frontend**: Vercel with custom domain
- **Monitoring**: Fly.io metrics + Vercel analytics
- **Secrets**: Encrypted platform storage

### Staging (Optional)
- **Backend**: Separate Fly.io app (staging-duespark-backend)
- **Frontend**: Vercel preview deployments
- **Database**: Shared PostgreSQL with staging database
- **Secrets**: Staging-specific values

### Development
- **Backend**: Local development server
- **Frontend**: Local Vite dev server
- **Database**: Local SQLite or containerized PostgreSQL
- **Secrets**: `.env` files (not committed)

## 📊 Monitoring & Health Checks

### Automated Monitoring
- **Health Endpoints**: `/healthz` (backend), root (frontend)
- **Metrics**: Prometheus metrics at `/metrics_prom`
- **Logs**: Centralized logging via Fly.io and Vercel
- **Alerts**: Platform-native alerting systems

### Manual Checks
```bash
# Health check
curl https://duespark-backend.fly.dev/healthz
curl https://app.duespark.com

# Performance check
lighthouse https://app.duespark.com

# Security check
curl -I https://app.duespark.com | grep -E "(X-|Content-Security)"
```

## 🔄 CI/CD Pipeline

### GitHub Actions
The repository includes GitHub Actions workflows for:

1. **Backend Testing**: `pytest`, `mypy`, `bandit`, `flake8`
2. **Frontend Testing**: `vitest`, `playwright`, `eslint`, `type-check`
3. **Deployment**: Automatic deployment on push to `main`
4. **Security**: Dependency scanning and vulnerability checks

### Manual Deployment
For manual deployments or rollbacks:
```bash
# Backend manual deployment
cd sic_backend_mvp_jwt_sqlite
flyctl deploy --dockerfile Dockerfile.production

# Frontend manual deployment
cd sic_app
vercel --prod
```

## 🚨 Emergency Procedures

### Service Down
1. **Check status**: `./deploy/quick-deploy.sh status`
2. **View logs**: `./deploy/quick-deploy.sh logs`
3. **Rollback**: `./deploy/quick-deploy.sh rollback`
4. **Scale up**: `flyctl scale count 3`

### Database Issues
1. **Check DB health**: `flyctl postgres info -a duespark-db`
2. **Create backup**: `flyctl postgres backup create -a duespark-db`
3. **Review logs**: `flyctl postgres logs -a duespark-db`
4. **Scale DB**: `flyctl postgres update --vm-size performance-1x -a duespark-db`

### Security Incident
1. **Rotate secrets**: Follow `secrets-management.md` procedures
2. **Review logs**: Check for suspicious activity
3. **Update passwords**: Database and service passwords
4. **Notify team**: Use established communication channels

## 📞 Support Contacts

### Platform Support
- **Fly.io Support**: [community.fly.io](https://community.fly.io)
- **Vercel Support**: [vercel.com/help](https://vercel.com/help)
- **PostgreSQL**: [postgresql.org/support](https://www.postgresql.org/support/)

### Internal Escalation
- **Primary**: [Your primary contact]
- **Secondary**: [Your secondary contact]
- **Emergency**: [24/7 emergency contact]

## 📚 Additional Resources

### Documentation
- [Fly.io Documentation](https://fly.io/docs/)
- [Vercel Documentation](https://vercel.com/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)

### Monitoring & Debugging
- [Fly.io Metrics](https://fly.io/docs/reference/metrics/)
- [Vercel Analytics](https://vercel.com/docs/analytics)
- [PostgreSQL Performance](https://www.postgresql.org/docs/current/monitoring.html)

### Security Best Practices
- [OWASP Security Guidelines](https://owasp.org/www-project-top-ten/)
- [Fly.io Security](https://fly.io/docs/reference/security/)
- [Vercel Security](https://vercel.com/docs/security)

---

## 🎯 Success Criteria

Your deployment is successful when:

- [ ] Backend health check returns 200 OK
- [ ] Frontend loads without errors
- [ ] User can register and login
- [ ] API endpoints respond correctly
- [ ] Database queries execute successfully
- [ ] Email sending works
- [ ] PWA features function properly
- [ ] Performance scores meet targets
- [ ] Security headers are present
- [ ] Monitoring is operational

**🎉 Congratulations! DueSpark is now live in production!**

---

*For detailed procedures, see the individual guide files in this directory.*