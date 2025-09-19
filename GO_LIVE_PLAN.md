# 🚀 DueSpark Production Go-Live Plan

## ⚠️ **CRITICAL: PRE-DEPLOYMENT ACTION PLAN**
**⛔ PRODUCTION DEPLOYMENT BLOCKED - SECURITY ISSUES MUST BE RESOLVED FIRST**

### 🚨 **REQUIRED: 2-3 Week Security & Configuration Sprint**

Before any production deployment can proceed, the following critical issues must be addressed:

#### **Week 1: Critical Security Fixes**
- [ ] **🔐 Implement proper secrets management system**
  - [ ] Remove all hardcoded credentials (`SECRET_KEY: change-me`)
  - [ ] Establish secure secrets distribution (not via chat/1Password)
  - [ ] Create production-specific environment templates
  - [ ] Implement secrets rotation procedures

- [ ] **🛡️ Security configuration hardening**
  - [ ] Remove default passwords from Docker configurations
  - [ ] Update CORS settings for production (remove localhost)
  - [ ] Complete SSL/TLS certificate setup
  - [ ] Implement proper API rate limiting

#### **Week 2: Production Environment & Monitoring**
- [ ] **📊 Implement comprehensive monitoring/alerting**
  - [ ] Set up health check endpoints with proper validation
  - [ ] Configure error tracking and performance monitoring
  - [ ] Establish backup and recovery procedures
  - [ ] Create operational runbooks

- [ ] **🔄 CI/CD security integration**
  - [ ] Secure deployment pipelines
  - [ ] Automated security scanning in CI/CD
  - [ ] Environment-specific configuration management

#### **Week 3: Controlled Beta Deployment**
- [ ] **🧪 Beta testing with security validation**
  - [ ] Deploy to staging environment with production-like security
  - [ ] Security penetration testing
  - [ ] Load testing with security monitoring
  - [ ] User acceptance testing with security review

### **❌ DEPLOYMENT BLOCKERS IDENTIFIED:**
1. **Secrets Management Crisis** - Manual distribution of production keys via insecure channels
2. **Default Security Configurations** - Hardcoded development credentials in production configs
3. **Incomplete Environment Separation** - Development settings mixed with production configurations

### **✅ PROJECT STRENGTHS:**
- Excellent modern architecture (FastAPI + PostgreSQL + Redis)
- Strong test coverage (85% requirement) with comprehensive test suite
- Clean security scans (0 high/medium severity issues from Bandit)
- Well-planned deployment options and comprehensive documentation

---

## 📋 **Overview**
This plan outlines the complete steps to deploy DueSpark from development to a 24/7 production environment with automated reminder functionality.

**⚠️ NOTE: This deployment plan can only be executed AFTER completing the critical security fixes above.**

## 🎯 **Current Setup Analysis**
Based on the project scan, DueSpark is already configured for cloud deployment:

✅ **Backend**: Ready for Render deployment (`Dockerfile.render` included)
✅ **Frontend**: Vite React app ready for Vercel or any static hosting
✅ **Database**: PostgreSQL-ready (includes `psycopg2-binary`)
✅ **Email**: Postmark & AWS SES providers implemented
✅ **Monitoring**: Prometheus metrics built-in
✅ **Scheduler**: APScheduler with Redis locks for 24/7 operation

**⚡ Fast Track Options:**
- **Render**: Backend auto-deploys from GitHub (PostgreSQL included)
- **Vercel**: Frontend auto-deploys from GitHub
- **Railway**: Full-stack deployment option

---

## 🚀 **FAST TRACK DEPLOYMENT** (Recommended - 1-2 hours)

### **Quick Deploy to Render + Vercel**

#### **Step 1: Backend on Render (15 minutes)**
1. **Push to GitHub** (if not already there)
2. **Connect to Render**:
   - Go to render.com → "New Web Service"
   - Connect GitHub repo → Select `sic_backend_mvp_jwt_sqlite` folder
   - **Docker**: Use `Dockerfile.render`
3. **Environment Variables**:
   ```
   SECRET_KEY=your-256-bit-secret-key
   EMAIL_PROVIDER=postmark
   POSTMARK_SERVER_TOKEN=your-token
   EMAIL_FROM="DueSpark <noreply@yourdomain.com>"
   ```
4. **Database**: Add PostgreSQL addon (auto-configures DATABASE_URL)
5. **Deploy** → Get backend URL (e.g., `https://your-app.onrender.com`)

#### **Step 2: Frontend on Vercel (10 minutes)**
1. **Update API URL**:
   ```bash
   # sic_app/.env.production
   VITE_API_URL=https://your-app.onrender.com
   ```
2. **Deploy to Vercel**:
   - Go to vercel.com → "New Project"
   - Import from GitHub → Select `sic_app` folder
   - Auto-detects Vite settings
   - Deploy → Get frontend URL

#### **Step 3: Email Setup (10 minutes)**
1. **Postmark Account**: Get server token
2. **Domain Verification**: Add DKIM records
3. **Test Email**: Use `/reminders/preview` endpoint

#### **Step 4: Add Automated Reminders (30 minutes)**
The only missing piece is automated reminder creation. Add this to `scheduler.py`:

```python
def job_create_automatic_reminders():
    """Create reminders for invoices approaching due dates"""
    db = SessionLocal()
    try:
        # Find invoices needing reminders (no pending reminders)
        invoices_needing_reminders = (
            db.query(models.Invoice)
            .filter(models.Invoice.status.in_(['pending', 'overdue']))
            .filter(~exists().where(
                models.Reminder.invoice_id == models.Invoice.id,
                models.Reminder.status == 'pending'
            ))
            .all()
        )

        for invoice in invoices_needing_reminders:
            # Create reminder schedule based on due date
            create_reminder_for_invoice(db, invoice)

    finally:
        db.close()

def create_reminder_for_invoice(db: Session, invoice):
    """Create appropriate reminders based on invoice due date"""
    now = datetime.now(timezone.utc)
    due_date = datetime.fromisoformat(invoice.due_date)

    # 3 days before due date
    reminder_date = due_date - timedelta(days=3)
    if reminder_date > now:
        create_reminder(db, invoice.id, reminder_date, "friendly")

    # Day of due date
    if due_date > now:
        create_reminder(db, invoice.id, due_date, "neutral")

    # 7 days after due date
    overdue_date = due_date + timedelta(days=7)
    if overdue_date > now:
        create_reminder(db, invoice.id, overdue_date, "firm")

# Add to init_scheduler():
sched.add_job(
    job_create_automatic_reminders,
    IntervalTrigger(hours=6),  # Run every 6 hours
    id="create_automatic_reminders",
    replace_existing=True,
)
```

**Total Time: 1-2 hours → LIVE! 🎉**

---

## 🎯 **Phase 1: Core Infrastructure Setup**

### **1.1 Database Migration (Priority: Critical)**
- [ ] **Set up PostgreSQL database**
  - [ ] Choose hosting: AWS RDS, DigitalOcean Managed DB, or Railway PostgreSQL
  - [ ] Create production database instance
  - [ ] Configure backup retention (daily for 30 days minimum)
  - [ ] Set up read replicas if high availability required

- [ ] **Update connection configuration**
  ```bash
  # Production environment variable
  DATABASE_URL="postgresql://username:password@host:5432/duespark_prod"
  ```

- [ ] **Run database migrations**
  ```bash
  cd sic_backend_mvp_jwt_sqlite
  alembic upgrade head
  ```

- [ ] **Data migration (if applicable)**
  - [ ] Export development data from SQLite
  - [ ] Import into PostgreSQL
  - [ ] Verify data integrity

### **1.2 Production Server Setup (Priority: Critical)**
- [ ] **Choose deployment platform**
  - Option A: VPS (DigitalOcean/AWS EC2)
  - Option B: Platform-as-a-Service (Railway/Render/Heroku)
  - Option C: Containerized (Docker + Kubernetes)

- [ ] **Server provisioning**
  - [ ] Ubuntu 22.04 LTS server (minimum 2GB RAM, 1 vCPU)
  - [ ] Configure SSH access with key-based authentication
  - [ ] Set up firewall (UFW) - ports 22, 80, 443, 8005
  - [ ] Install essential packages: `nginx`, `python3.11`, `redis-server`

### **1.3 Domain & SSL Setup (Priority: High)**
- [ ] **Domain configuration**
  - [ ] Register domain or configure subdomain
  - [ ] Point DNS A records to server IP
  - [ ] Configure CNAME for www subdomain

- [ ] **SSL certificate setup**
  - [ ] Install Certbot: `sudo apt install certbot python3-certbot-nginx`
  - [ ] Generate certificates: `sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com`
  - [ ] Configure auto-renewal: `sudo crontab -e` → `0 12 * * * /usr/bin/certbot renew --quiet`

---

## 🔧 **Phase 2: Application Deployment**

### **2.1 Backend Deployment (Priority: Critical)**
- [ ] **Environment setup**
  ```bash
  # Clone repository
  git clone https://github.com/your-org/duespark.git
  cd duespark/sic_backend_mvp_jwt_sqlite

  # Python environment
  python3 -m venv venv
  source venv/bin/activate
  pip install -r requirements.txt
  ```

- [ ] **Production environment variables**
  Create `/etc/duespark/.env`:
  ```bash
  # Database
  DATABASE_URL=postgresql://username:password@host:5432/duespark_prod

  # Security
  SECRET_KEY=your-256-bit-secret-key-here

  # Email Provider (choose one)
  EMAIL_PROVIDER=postmark
  POSTMARK_API_TOKEN=your_postmark_token
  # OR
  EMAIL_PROVIDER=ses
  AWS_ACCESS_KEY_ID=your_aws_key
  AWS_SECRET_ACCESS_KEY=your_aws_secret
  AWS_REGION=us-east-1

  # Payments
  STRIPE_SECRET_KEY=sk_live_your_stripe_key
  STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

  # Optional: Redis for caching/locks
  REDIS_URL=redis://localhost:6379

  # Scheduler configuration
  SCHEDULER_BATCH_SIZE=200
  OUTBOX_ENABLED=true

  # Production settings
  ENVIRONMENT=production
  ```

- [ ] **Systemd service setup**
  Create `/etc/systemd/system/duespark-api.service`:
  ```ini
  [Unit]
  Description=DueSpark API
  After=network.target postgresql.service

  [Service]
  Type=exec
  User=duespark
  Group=duespark
  WorkingDirectory=/home/duespark/duespark/sic_backend_mvp_jwt_sqlite
  Environment=PATH=/home/duespark/duespark/sic_backend_mvp_jwt_sqlite/venv/bin
  EnvironmentFile=/etc/duespark/.env
  ExecStart=/home/duespark/duespark/sic_backend_mvp_jwt_sqlite/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8005
  Restart=always
  RestartSec=3

  [Install]
  WantedBy=multi-user.target
  ```

- [ ] **Enable and start services**
  ```bash
  sudo systemctl daemon-reload
  sudo systemctl enable duespark-api
  sudo systemctl start duespark-api
  sudo systemctl status duespark-api
  ```

### **2.2 Frontend Deployment (Priority: Critical)**
- [ ] **Build production assets**
  ```bash
  cd sic_app
  npm install
  npm run build
  ```

- [ ] **Nginx configuration**
  Create `/etc/nginx/sites-available/duespark`:
  ```nginx
  server {
      listen 80;
      server_name yourdomain.com www.yourdomain.com;
      return 301 https://$server_name$request_uri;
  }

  server {
      listen 443 ssl http2;
      server_name yourdomain.com www.yourdomain.com;

      ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
      ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

      # Frontend
      location / {
          root /home/duespark/duespark/sic_app/dist;
          try_files $uri $uri/ /index.html;

          # Cache static assets
          location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
              expires 1y;
              add_header Cache-Control "public, immutable";
          }
      }

      # API proxy
      location /api/ {
          proxy_pass http://localhost:8005/;
          proxy_set_header Host $host;
          proxy_set_header X-Real-IP $remote_addr;
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
          proxy_set_header X-Forwarded-Proto $scheme;
      }
  }
  ```

- [ ] **Enable site**
  ```bash
  sudo ln -s /etc/nginx/sites-available/duespark /etc/nginx/sites-enabled/
  sudo nginx -t
  sudo systemctl reload nginx
  ```

---

## 📧 **Phase 3: Email Configuration**

### **3.1 Email Provider Setup (Priority: Critical)**
Choose one email provider:

#### **Option A: Postmark (Recommended)**
- [ ] Sign up at postmark.com
- [ ] Create server and get API token
- [ ] Add sender signature (verify email domain)
- [ ] Configure DKIM records in DNS
- [ ] Test email sending

#### **Option B: AWS SES**
- [ ] Set up AWS SES in your region
- [ ] Verify domain and email addresses
- [ ] Request production access (remove sandbox)
- [ ] Configure IAM user with SES permissions
- [ ] Set up SNS for bounce/complaint handling

### **3.2 Email Template Configuration (Priority: Medium)**
- [ ] **Create email templates directory**
  ```bash
  mkdir -p /home/duespark/duespark/templates/email
  ```

- [ ] **Add default templates**
  Create template files for different reminder types:
  - `friendly_reminder.md` - Initial gentle reminder
  - `urgent_reminder.md` - For overdue invoices
  - `final_notice.md` - Last reminder before collections

### **3.3 Email Deliverability (Priority: High)**
- [ ] **Configure DNS records**
  - [ ] SPF record: `v=spf1 include:spf.postmarkapp.com ~all`
  - [ ] DKIM record (provided by email service)
  - [ ] DMARC record: `v=DMARC1; p=quarantine; rua=mailto:reports@yourdomain.com`

- [ ] **Test email delivery**
  - [ ] Send test emails to Gmail, Outlook, Yahoo
  - [ ] Check spam folder placement
  - [ ] Verify links and formatting

---

## 🤖 **Phase 4: Automated Reminder System**

### **4.1 Implement Automated Reminder Creation (Priority: High)**
- [ ] **Add reminder automation logic**
  Create new function in `scheduler.py`:
  ```python
  def job_create_automatic_reminders():
      """Create reminders for invoices based on due dates and payment status"""
      db = SessionLocal()
      try:
          # Logic to create reminders 3 days before due, on due date, 7 days after
          create_reminder_schedules(db)
      finally:
          db.close()
  ```

- [ ] **Configure reminder schedules**
  - [ ] 3 days before due date (friendly reminder)
  - [ ] On due date (payment due reminder)
  - [ ] 7 days after due (overdue notice)
  - [ ] 14 days after due (urgent notice)
  - [ ] 30 days after due (final notice)

- [ ] **Add to scheduler initialization**
  Update `init_scheduler()` to include automated reminder job

### **4.2 Smart Reminder Logic (Priority: Medium)**
- [ ] **Client payment history analysis**
  - [ ] Track average payment times
  - [ ] Adjust reminder frequency based on client behavior
  - [ ] Skip reminders for clients who pay early

- [ ] **Template selection logic**
  - [ ] Friendly tone for first-time clients
  - [ ] Escalating tone for repeat late payers
  - [ ] Professional tone for enterprise clients

---

## 💳 **Phase 5: Payment Integration**

### **5.1 Stripe Configuration (Priority: High)**
- [ ] **Production Stripe setup**
  - [ ] Activate Stripe account for live payments
  - [ ] Configure webhook endpoints
  - [ ] Set up payment link generation
  - [ ] Test payment flows

- [ ] **Webhook handling**
  - [ ] Implement webhook verification
  - [ ] Handle payment success events
  - [ ] Auto-update invoice status
  - [ ] Send payment confirmation emails

### **5.2 Payment Link Generation (Priority: Medium)**
- [ ] **Implement payment link creation**
  - [ ] Generate Stripe payment links for invoices
  - [ ] Include payment links in reminder emails
  - [ ] Track payment link clicks

---

## 📊 **Phase 6: Monitoring & Observability**

### **6.1 Application Monitoring (Priority: High)**
- [ ] **Error tracking**
  - [ ] Set up Sentry for error monitoring
  - [ ] Configure alert thresholds
  - [ ] Add performance monitoring

- [ ] **Health checks**
  - [ ] Implement `/health` endpoint
  - [ ] Database connectivity check
  - [ ] Email service check
  - [ ] Scheduler status check

### **6.2 Infrastructure Monitoring (Priority: Medium)**
- [ ] **Server monitoring**
  - [ ] Set up Prometheus + Grafana
  - [ ] Monitor CPU, memory, disk usage
  - [ ] Database performance metrics
  - [ ] Email delivery metrics

- [ ] **Log management**
  - [ ] Configure structured logging
  - [ ] Set up log rotation
  - [ ] Centralized log aggregation

### **6.3 Alerting (Priority: High)**
- [ ] **Critical alerts**
  - [ ] Database connection failures
  - [ ] Email delivery failures
  - [ ] High error rates
  - [ ] Scheduler job failures

- [ ] **Business alerts**
  - [ ] Failed payment webhook processing
  - [ ] Unusual reminder send volumes
  - [ ] Client payment pattern changes

---

## 🔒 **Phase 7: Security & Compliance**

### **7.1 Security Hardening (Priority: Critical)**
- [ ] **Server security**
  - [ ] Disable root login
  - [ ] Configure fail2ban for SSH protection
  - [ ] Set up automatic security updates
  - [ ] Regular security audits

- [ ] **Application security**
  - [ ] Environment variable security
  - [ ] API rate limiting
  - [ ] CORS configuration
  - [ ] Input validation review

### **7.2 Data Protection (Priority: High)**
- [ ] **Backup strategy**
  - [ ] Automated daily database backups
  - [ ] Cross-region backup storage
  - [ ] Backup restoration testing
  - [ ] Data retention policies

- [ ] **Privacy compliance**
  - [ ] GDPR compliance review
  - [ ] Data processing agreements
  - [ ] Cookie policy
  - [ ] Privacy policy updates

---

## 🧪 **Phase 8: Testing & Validation**

### **8.1 End-to-End Testing (Priority: Critical)**
- [ ] **User workflows**
  - [ ] Client registration and login
  - [ ] Invoice creation and editing
  - [ ] Reminder scheduling and sending
  - [ ] Payment processing

- [ ] **Email testing**
  - [ ] Template rendering
  - [ ] Delivery to major email providers
  - [ ] Link functionality
  - [ ] Unsubscribe handling

### **8.2 Load Testing (Priority: Medium)**
- [ ] **Performance validation**
  - [ ] API response times under load
  - [ ] Database query optimization
  - [ ] Email sending capacity
  - [ ] Scheduler performance

### **8.3 User Acceptance Testing (Priority: High)**
- [ ] **Beta user testing**
  - [ ] Select test users
  - [ ] Gather feedback
  - [ ] Fix critical issues
  - [ ] Document known limitations

---

## 🚀 **Phase 9: Go-Live Execution**

### **9.1 Pre-Launch Checklist (Priority: Critical)**
- [ ] All previous phases completed
- [ ] Backup and rollback plans ready
- [ ] Support documentation prepared
- [ ] Monitoring dashboards configured
- [ ] Alert channels tested

### **9.2 Launch Day (Priority: Critical)**
- [ ] **Morning checks**
  - [ ] Verify all services running
  - [ ] Check monitoring systems
  - [ ] Confirm email delivery
  - [ ] Test payment processing

- [ ] **Go-live execution**
  - [ ] Update DNS to production
  - [ ] Monitor error rates
  - [ ] Watch user registrations
  - [ ] Validate reminder sending

### **9.3 Post-Launch Monitoring (Priority: Critical)**
- [ ] **First 24 hours**
  - [ ] Continuous monitoring
  - [ ] User support response
  - [ ] Performance optimization
  - [ ] Bug fix deployments

- [ ] **First week**
  - [ ] Usage analytics review
  - [ ] Email deliverability analysis
  - [ ] User feedback collection
  - [ ] Feature usage metrics

---

## 📞 **Phase 10: Support & Maintenance**

### **10.1 Support Documentation (Priority: High)**
- [ ] **User guides**
  - [ ] Getting started guide
  - [ ] Feature documentation
  - [ ] Troubleshooting guide
  - [ ] FAQ section

- [ ] **Admin documentation**
  - [ ] Deployment procedures
  - [ ] Backup/restore procedures
  - [ ] Monitoring runbooks
  - [ ] Emergency procedures

### **10.2 Ongoing Maintenance (Priority: Medium)**
- [ ] **Regular updates**
  - [ ] Security patch schedule
  - [ ] Feature update pipeline
  - [ ] Database maintenance
  - [ ] Performance optimization

---

## 📅 **Timeline Estimate**

### **Fast Track (Recommended)**
| Step | Duration | Description |
|------|----------|-------------|
| Render Backend | 15 minutes | Deploy with PostgreSQL |
| Vercel Frontend | 10 minutes | Auto-deploy from GitHub |
| Email Setup | 10 minutes | Postmark + DNS |
| Add Automation | 30 minutes | Implement reminder logic |
| **TOTAL** | **1-2 hours** | **LIVE!** |

### **Full Enterprise Setup**
| Phase | Duration | Dependencies | Priority |
|-------|----------|--------------|----------|
| Phase 1: Infrastructure | 2-3 days | Domain, hosting | Critical |
| Phase 2: Deployment | 1-2 days | Phase 1 | Critical |
| Phase 3: Email Config | 1 day | Domain DNS | Critical |
| Phase 4: Automation | 2-3 days | Phase 2,3 | High |
| Phase 5: Payments | 1-2 days | Stripe account | High |
| Phase 6: Monitoring | 1-2 days | Phase 2 | High |
| Phase 7: Security | 1-2 days | Phase 1,2 | Critical |
| Phase 8: Testing | 2-3 days | Phase 4,5 | Critical |
| Phase 9: Go-Live | 1 day | All phases | Critical |
| Phase 10: Support | Ongoing | Phase 9 | Medium |

**Total Estimated Time: 2-3 weeks**

---

## ⚠️ **Risk Mitigation**

### **High-Risk Items**
1. **Email deliverability issues** → Test thoroughly, have backup provider
2. **Database migration problems** → Test on staging, have rollback plan
3. **Payment processing failures** → Extensive Stripe testing, webhook monitoring
4. **DNS propagation delays** → Plan for 24-48 hour buffer

### **Contingency Plans**
- [ ] Rollback procedures documented
- [ ] Emergency contact list prepared
- [ ] Backup systems ready to activate
- [ ] Support escalation procedures

---

## ✅ **Success Criteria**

### **Technical Metrics**
- [ ] 99.9% uptime achieved
- [ ] Email delivery rate > 95%
- [ ] API response time < 200ms
- [ ] Zero critical security issues

### **Business Metrics**
- [ ] User registration flow working
- [ ] Automated reminders sending
- [ ] Payment processing functional
- [ ] Customer support response < 4 hours

---

*Last Updated: [Current Date]*
*Project Manager: [Your Name]*
*Technical Lead: [Your Name]*