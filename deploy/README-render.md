# DueSpark Deployment Guide - Render + Vercel

## 🚀 Quick Start

Deploy DueSpark to production using Render (backend) + Vercel (frontend):

```bash
# 1. Setup environment (follow manual steps)
./deploy/quick-deploy-render.sh setup

# 2. Deploy everything
./deploy/quick-deploy-render.sh full

# 3. Check status
./deploy/quick-deploy-render.sh status
```

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Vercel CDN    │    │   Render Edge    │    │  PostgreSQL     │
│   (Frontend)    │────│   (Backend)      │────│  (Database)     │
│                 │    │                  │    │                 │
│ app.duespark.com│    │duespark-backend  │    │ duespark-       │
│                 │    │  .onrender.com   │    │ postgres        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Production URLs
- **Frontend**: https://app.duespark.com
- **Backend API**: https://duespark-backend.onrender.com
- **API Documentation**: https://duespark-backend.onrender.com/docs

## 📋 Platform Comparison: Render vs Fly.io

| Feature | Render | Fly.io |
|---------|--------|--------|
| **Deployment** | Git-based (automatic) | CLI-based (manual/CI) |
| **Configuration** | `render.yaml` | `fly.toml` |
| **Database** | Managed PostgreSQL | Postgres addon |
| **SSL** | Automatic | Automatic |
| **Pricing** | $7-85/month | $0-50/month |
| **Scaling** | Automatic (higher plans) | Manual/automatic |
| **Dashboard** | Web-based | CLI + Dashboard |
| **Free Tier** | 750 hours/month | Limited free |

## 📁 Render-Specific Files

| File | Purpose |
|------|---------|
| `render.yaml` | Infrastructure as Code configuration |
| `Dockerfile.render` | Render-optimized container build |
| `.env.production.render` | Frontend environment variables for Render backend |
| `vercel.render.json` | Vercel configuration for Render backend |
| `render-deployment-guide.md` | Comprehensive Render setup guide |
| `quick-deploy-render.sh` | Render + Vercel deployment automation |

## 🔧 Quick Commands

### Deployment
```bash
# Deploy backend to Render
./deploy/quick-deploy-render.sh backend

# Deploy frontend to Vercel
./deploy/quick-deploy-render.sh frontend

# Deploy everything
./deploy/quick-deploy-render.sh full
```

### Monitoring
```bash
# Check deployment status
./deploy/quick-deploy-render.sh status

# View deployment logs info
./deploy/quick-deploy-render.sh logs

# Monitor health in real-time
watch -n 10 'curl -s https://duespark-backend.onrender.com/healthz'
```

## 🔐 Required Configuration

### Render Environment Variables (Set in Dashboard)
```bash
# Core secrets
SECRET_KEY="<32-byte-random-key>"
ENCRYPTION_KEY="<32-byte-random-key>"

# Database (auto-provided by PostgreSQL service)
DATABASE_URL="postgresql://user:pass@host:port/database"

# Stripe configuration
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_CLIENT_ID="ca_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Email provider
POSTMARK_SERVER_TOKEN="..."
EMAIL_FROM="DueSpark <no-reply@yourdomain.com>"
```

### Vercel Environment Variables (Set in Dashboard)
```bash
# API configuration (points to Render backend)
VITE_API_BASE_URL="https://duespark-backend.onrender.com"
VITE_STRIPE_PUBLISHABLE_KEY="pk_live_..."
```

## 🚦 Deployment Steps

### First-Time Setup

1. **Render Setup**
   - Create account at https://dashboard.render.com
   - Connect GitHub repository
   - Render auto-detects `render.yaml`
   - Create PostgreSQL database service
   - Set environment variables in dashboard

2. **Vercel Setup**
   - Create account at https://vercel.com
   - Import GitHub repository
   - Set framework to "Vite"
   - Set root directory to "sic_app"
   - Configure environment variables

3. **Deploy**
   ```bash
   ./deploy/quick-deploy-render.sh full
   ```

### Subsequent Deployments
```bash
# Render: Automatic on git push to main branch
git push origin main

# Vercel: Automatic on git push, or manual
vercel --prod
```

## 📊 Cost Comparison

### Render Pricing
- **Starter**: $7/month (512MB RAM, shared CPU)
- **Standard**: $25/month (1GB RAM, dedicated CPU)
- **Pro**: $85/month (4GB RAM, dedicated CPU)
- **PostgreSQL**: $7/month (Starter) to $65/month (Pro)

### Vercel Pricing
- **Hobby**: Free (personal projects)
- **Pro**: $20/month (commercial use)
- **Enterprise**: Custom pricing

### Total Monthly Cost
- **Minimum**: $14/month (Render Starter + DB)
- **Recommended**: $32/month (Render Standard + DB + Vercel Pro)
- **Production**: $90+/month (Render Pro + DB + Vercel Pro)

## 🔍 Monitoring & Health Checks

### Automated Monitoring
- **Render**: Built-in health checks via `/healthz`
- **Vercel**: Automatic monitoring and alerts
- **Database**: Render provides PostgreSQL monitoring

### Manual Health Checks
```bash
# Backend health
curl https://duespark-backend.onrender.com/healthz

# Frontend accessibility
curl https://app.duespark.com

# API documentation
curl https://duespark-backend.onrender.com/docs

# Database connectivity (indirect)
curl https://duespark-backend.onrender.com/clients
```

## 🚨 Troubleshooting

### Common Render Issues

**Service Won't Start**
- Check environment variables are set
- Verify DATABASE_URL format
- Review build logs in dashboard
- Ensure `PORT` environment variable is used

**Database Connection Failed**
- Verify database service is running
- Check DATABASE_URL connection string
- Ensure database and web service in same region
- Test connection with external tool

**Slow Cold Starts**
- Render services sleep after inactivity (free/starter)
- Consider higher plan for always-on services
- Implement warm-up strategies

### Common Vercel Issues

**Build Failures**
- Check Node.js version compatibility
- Verify all dependencies are in package.json
- Review build logs for specific errors

**API Connection Issues**
- Verify VITE_API_BASE_URL is correct
- Check CORS configuration in backend
- Ensure backend is running and healthy

## 🔄 CI/CD Integration

### Automatic Deployments
- **Render**: Automatic on push to main branch
- **Vercel**: Automatic on push to any branch (configurable)

### GitHub Actions (Optional)
```yaml
name: Test and Deploy
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: |
          # Backend tests
          cd sic_backend_mvp_jwt_sqlite
          pip install -r requirements.txt
          pytest

          # Frontend tests
          cd ../sic_app
          npm ci
          npm run test

  # Deployment happens automatically via platform integrations
```

## 🔒 Security Considerations

### Render Security
- Environment variables encrypted at rest
- HTTPS/TLS automatic for all services
- Network isolation between services
- Regular security updates

### Vercel Security
- Automatic HTTPS with SSL certificates
- Edge security features
- Environment variable encryption
- DDoS protection

### Best Practices
- Use different secrets for each environment
- Regular secret rotation (see secrets-management.md)
- Monitor access logs
- Enable two-factor authentication

## 📈 Scaling Strategy

### Vertical Scaling (Render)
```bash
# Upgrade service plan
# Starter → Standard → Pro
# More CPU, RAM, and features
```

### Horizontal Scaling
```bash
# Render handles load balancing automatically
# Vercel scales automatically globally
# Database: Use connection pooling
```

### Performance Optimization
```bash
# Backend: Optimize queries, add caching
# Frontend: Bundle optimization, CDN
# Database: Indexing, connection pooling
```

## 📞 Support Resources

### Platform Support
- **Render**: community.render.com, paid support available
- **Vercel**: vercel.com/help, Discord community
- **General**: Project documentation and issue tracker

### Emergency Contacts
- **Primary**: [Your team's primary contact]
- **Secondary**: [Your team's secondary contact]
- **Platform Issues**: Use platform status pages

## ✅ Deployment Success Checklist

### Pre-deployment
- [ ] Render account with billing configured
- [ ] Vercel account connected to GitHub
- [ ] Repository configured with render.yaml
- [ ] Environment variables documented
- [ ] Domain names configured (optional)

### Initial Deployment
- [ ] PostgreSQL database created on Render
- [ ] Web service deployed and running
- [ ] Environment variables configured
- [ ] Frontend deployed to Vercel
- [ ] Custom domains configured (if applicable)

### Post-deployment Verification
- [ ] Backend health check passes (200 OK)
- [ ] Frontend loads without errors
- [ ] API documentation accessible
- [ ] User registration/login works
- [ ] Database queries executing
- [ ] Email sending functional
- [ ] HTTPS certificates active

### Monitoring Setup
- [ ] Health check alerts configured
- [ ] Error tracking operational
- [ ] Performance monitoring active
- [ ] Backup schedules confirmed
- [ ] Team access permissions set

## 🎉 Success!

When all checklist items are complete:

**🚀 DueSpark is now live on Render + Vercel!**

- 📱 **Frontend**: https://app.duespark.com
- 🔗 **Backend**: https://duespark-backend.onrender.com
- 📚 **API Docs**: https://duespark-backend.onrender.com/docs

---

## 📚 Additional Resources

- **Render Documentation**: https://render.com/docs
- **Vercel Documentation**: https://vercel.com/docs
- **DueSpark Guides**: See other files in `/deploy` directory
- **Support**: Use platform community forums and documentation

*Remember: Both Render and Vercel provide automatic deployments, making ongoing updates seamless once initial setup is complete.*