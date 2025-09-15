# DueSpark Operations Runbooks

## 📖 Overview

This document contains step-by-step procedures for critical operational tasks. Each runbook includes prerequisites, detailed steps, verification procedures, and rollback instructions.

---

## 🔑 Runbook 1: Secret Key Rotation

### Purpose
Rotate application secret keys to maintain security compliance and respond to potential compromises.

### Prerequisites
- Fly.io CLI installed and authenticated
- Admin access to DueSpark backend
- Active maintenance window (recommended)

### Procedure

#### Step 1: Pre-rotation Verification
```bash
# 1. Verify current application status
flyctl status

# 2. Check current secret key is working
curl -s https://duespark-backend.fly.dev/healthz | jq .

# 3. Backup current secrets list
flyctl secrets list > secrets-backup-$(date +%Y%m%d-%H%M).txt

# 4. Test user authentication (verify current JWT works)
curl -X POST https://duespark-backend.fly.dev/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=test@example.com&password=testpass123"
```

#### Step 2: Generate New Secret Key
```bash
# Generate cryptographically secure secret key
NEW_SECRET_KEY=$(openssl rand -base64 32)

# Verify key was generated properly
echo "New key length: ${#NEW_SECRET_KEY}"  # Should be ~44 characters
echo "New key starts with: ${NEW_SECRET_KEY:0:10}..."
```

#### Step 3: Update Secret Key
```bash
# Set new secret key (this will trigger app restart)
flyctl secrets set SECRET_KEY="$NEW_SECRET_KEY"

# Monitor deployment
flyctl logs --app duespark-backend
```

#### Step 4: Verification
```bash
# 1. Wait for application to restart (typically 30-60 seconds)
sleep 60

# 2. Verify application is healthy
flyctl status
curl -s https://duespark-backend.fly.dev/healthz

# 3. Test new authentication (old tokens will be invalid)
curl -X POST https://duespark-backend.fly.dev/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=test@example.com&password=testpass123"

# 4. Verify new JWT token works
# Extract token from login response and test protected endpoint
TOKEN="<token_from_login>"
curl -H "Authorization: Bearer $TOKEN" \
  https://duespark-backend.fly.dev/clients
```

#### Step 5: Post-rotation Tasks
```bash
# 1. Update monitoring alerts (if any depend on specific metrics)
# 2. Notify team that users need to re-authenticate
# 3. Update documentation with rotation date
echo "SECRET_KEY rotated on $(date)" >> rotation-log.txt

# 4. Clear local variables
unset NEW_SECRET_KEY
unset TOKEN
```

### Rollback Procedure
```bash
# If issues occur, rollback to previous secret
# Note: You'll need the previous secret key from backup
PREVIOUS_SECRET_KEY="<from_backup>"
flyctl secrets set SECRET_KEY="$PREVIOUS_SECRET_KEY"

# Monitor and verify
flyctl logs
curl -s https://duespark-backend.fly.dev/healthz
```

### Success Criteria
- [ ] Application returns 200 OK for health check
- [ ] New user authentication works
- [ ] Protected endpoints accessible with new JWT tokens
- [ ] No error logs related to authentication

---

## 💾 Runbook 2: Database Backup and Restoration

### Purpose
Create database backups and restore from snapshots for disaster recovery or data migration.

### Prerequisites
- Fly.io CLI with PostgreSQL access
- Sufficient storage for backup files
- `pg_dump` and `pg_restore` tools available

### Procedure: Creating Manual Backup

#### Step 1: Pre-backup Verification
```bash
# 1. Check database status
flyctl postgres info -a duespark-db

# 2. Check available disk space
flyctl postgres connect -a duespark-db
# In PostgreSQL:
SELECT pg_size_pretty(pg_database_size('duespark')) as db_size;
\q

# 3. Verify application connectivity
curl -s https://duespark-backend.fly.dev/healthz
```

#### Step 2: Create Backup
```bash
# 1. Create backup directory
mkdir -p backups/$(date +%Y%m%d)
cd backups/$(date +%Y%m%d)

# 2. Create full database backup
flyctl postgres connect -a duespark-db --command \
  "pg_dump -h localhost -U postgres -d duespark --no-password --verbose" > \
  duespark-backup-$(date +%Y%m%d-%H%M%S).sql

# 3. Create compressed backup
flyctl postgres connect -a duespark-db --command \
  "pg_dump -h localhost -U postgres -d duespark --no-password -Fc" > \
  duespark-backup-$(date +%Y%m%d-%H%M%S).dump

# 4. Verify backup files
ls -la *.sql *.dump
wc -l *.sql  # Should have substantial line count
```

#### Step 3: Backup Verification
```bash
# 1. Test backup integrity
pg_restore --list duespark-backup-$(date +%Y%m%d-*.dump) | head -20

# 2. Verify critical tables are present
grep -E "(CREATE TABLE|COPY)" duespark-backup-$(date +%Y%m%d-*.sql) | grep -E "(users|clients|invoices|reminders)"

# 3. Upload to secure storage (recommended)
# aws s3 cp duespark-backup-*.sql s3://duespark-backups/
# OR encrypt and store securely
gpg --symmetric --cipher-algo AES256 duespark-backup-*.sql
```

### Procedure: Database Restoration

#### Step 1: Pre-restoration Checks
```bash
# 1. Verify backup file exists and is accessible
ls -la duespark-backup-*.sql
file duespark-backup-*.sql  # Should show text/SQL file

# 2. Put application in maintenance mode (optional)
flyctl scale count 0  # Stop application instances

# 3. Backup current data before restoration
flyctl postgres connect -a duespark-db --command \
  "pg_dump -h localhost -U postgres -d duespark --no-password" > \
  pre-restore-backup-$(date +%Y%m%d-%H%M%S).sql
```

#### Step 2: Database Restoration
```bash
# 1. Connect to database
flyctl postgres connect -a duespark-db

# 2. Create new database for restoration (optional, safer)
CREATE DATABASE duespark_restore;
\q

# 3. Restore from backup
flyctl postgres connect -a duespark-db --command \
  "psql -h localhost -U postgres -d duespark_restore" < duespark-backup-*.sql

# 4. If restoring to main database (BE CAREFUL)
# flyctl postgres connect -a duespark-db --command \
#   "psql -h localhost -U postgres -d duespark" < duespark-backup-*.sql
```

#### Step 3: Post-restoration Verification
```bash
# 1. Connect and verify data
flyctl postgres connect -a duespark-db
\c duespark_restore
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM clients;
SELECT COUNT(*) FROM invoices;
SELECT COUNT(*) FROM reminders;
\q

# 2. Run database migrations if needed
flyctl scale count 1  # Start one instance
flyctl ssh console
alembic upgrade head
exit

# 3. Start application
flyctl scale count 2  # Back to normal capacity

# 4. Verify application functionality
curl -s https://duespark-backend.fly.dev/healthz
```

### Automated Backup Script
```bash
#!/bin/bash
# automated-backup.sh

set -e

BACKUP_DIR="/app/backups"
DATE=$(date +%Y%m%d-%H%M%S)
APP_NAME="duespark-db"

echo "🗄️  Starting automated backup at $(date)"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create backup
flyctl postgres connect -a $APP_NAME --command \
  "pg_dump -h localhost -U postgres -d duespark --no-password -Fc" > \
  $BACKUP_DIR/duespark-auto-backup-$DATE.dump

# Verify backup
if [ -f "$BACKUP_DIR/duespark-auto-backup-$DATE.dump" ]; then
    echo "✅ Backup created successfully: duespark-auto-backup-$DATE.dump"

    # Upload to S3 (if configured)
    # aws s3 cp $BACKUP_DIR/duespark-auto-backup-$DATE.dump s3://duespark-backups/

    # Clean up old backups (keep last 7 days)
    find $BACKUP_DIR -name "duespark-auto-backup-*.dump" -mtime +7 -delete

    echo "✅ Backup process completed"
else
    echo "❌ Backup failed"
    exit 1
fi
```

---

## 🔄 Runbook 3: Zero-Downtime Deployment

### Purpose
Deploy new application versions without service interruption.

### Prerequisites
- Multi-instance deployment configured
- Health checks properly configured
- Rollback plan prepared

### Procedure

#### Step 1: Pre-deployment Checks
```bash
# 1. Verify current deployment status
flyctl status
flyctl releases

# 2. Check application health
curl -s https://duespark-backend.fly.dev/healthz

# 3. Verify database migration status
flyctl ssh console
alembic current
alembic check  # Verify no pending migrations
exit

# 4. Backup current release for quick rollback
CURRENT_RELEASE=$(flyctl releases --json | jq -r '.[0].version')
echo "Current release: $CURRENT_RELEASE" > pre-deploy-release.txt
```

#### Step 2: Deploy New Version
```bash
# 1. Deploy with rolling strategy
flyctl deploy --strategy=rolling

# 2. Monitor deployment progress
flyctl logs --app duespark-backend

# 3. Watch health checks
watch -n 5 'flyctl status | grep -E "(healthy|unhealthy)"'
```

#### Step 3: Post-deployment Verification
```bash
# 1. Verify all instances are healthy
flyctl status

# 2. Test critical endpoints
curl -s https://duespark-backend.fly.dev/healthz
curl -s https://duespark-backend.fly.dev/docs

# 3. Test database connectivity
curl -X POST https://duespark-backend.fly.dev/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=test@example.com&password=testpass123"

# 4. Check application logs for errors
flyctl logs --region=all | grep -i error
```

### Rollback Procedure
```bash
# If deployment fails, rollback immediately
PREVIOUS_RELEASE=$(cat pre-deploy-release.txt | cut -d' ' -f3)
flyctl releases rollback $PREVIOUS_RELEASE

# Monitor rollback
flyctl status
flyctl logs
```

---

## 🚨 Runbook 4: Incident Response

### Purpose
Respond to production incidents quickly and systematically.

### Prerequisites
- Access to monitoring tools
- Communication channels established
- Escalation procedures defined

### Procedure

#### Step 1: Incident Detection and Assessment
```bash
# 1. Verify incident scope
flyctl status
curl -s https://duespark-backend.fly.dev/healthz

# 2. Check recent deployments
flyctl releases | head -5

# 3. Review application logs
flyctl logs --region=all | tail -100

# 4. Check database status
flyctl postgres info -a duespark-db

# 5. Assess severity
# - P0: Complete service outage
# - P1: Major functionality broken
# - P2: Minor functionality affected
# - P3: No immediate user impact
```

#### Step 2: Immediate Response
```bash
# For P0/P1 incidents:

# 1. Notify stakeholders
echo "INCIDENT DETECTED: $(date)" | tee incident-$(date +%Y%m%d-%H%M).log

# 2. Check for quick fixes
# - Scale up if resource exhaustion
flyctl scale count 4

# - Rollback if recent deployment
flyctl releases rollback

# - Restart if hanging processes
flyctl restart

# 3. Implement workaround if possible
# - Route traffic to backup
# - Enable maintenance mode
# - Scale down problematic features
```

#### Step 3: Investigation and Resolution
```bash
# 1. Gather diagnostic information
flyctl logs --region=all > incident-logs-$(date +%Y%m%d-%H%M).txt
flyctl postgres logs -a duespark-db > db-logs-$(date +%Y%m%d-%H%M).txt

# 2. Identify root cause
# - Application errors
# - Database issues
# - Infrastructure problems
# - External service failures

# 3. Implement fix
# - Code changes
# - Configuration updates
# - Infrastructure scaling
# - Service restarts

# 4. Deploy fix
flyctl deploy --strategy=rolling
```

#### Step 4: Post-incident Actions
```bash
# 1. Verify resolution
flyctl status
curl -s https://duespark-backend.fly.dev/healthz

# 2. Monitor for stability
watch -n 30 'curl -s https://duespark-backend.fly.dev/healthz'

# 3. Document incident
cat > incident-report-$(date +%Y%m%d).md << EOF
# Incident Report

**Date:** $(date)
**Duration:** X minutes
**Severity:** PX
**Root Cause:** [Description]
**Resolution:** [Description]
**Lessons Learned:** [Description]
**Action Items:** [List]
EOF

# 4. Schedule post-mortem
# 5. Update monitoring/alerting if needed
```

---

## 🔍 Runbook 5: Performance Investigation

### Purpose
Investigate and resolve performance issues systematically.

### Prerequisites
- Access to performance monitoring tools
- Database query analysis tools
- Load testing capabilities

### Procedure

#### Step 1: Performance Assessment
```bash
# 1. Check current resource usage
flyctl status
flyctl metrics

# 2. Review database performance
flyctl postgres connect -a duespark-db
SELECT query, mean_time, calls FROM pg_stat_statements
ORDER BY mean_time DESC LIMIT 10;
\q

# 3. Check application response times
curl -w "@curl-format.txt" -s https://duespark-backend.fly.dev/healthz
```

#### Step 2: Identify Bottlenecks
```bash
# 1. CPU usage patterns
flyctl ssh console
top -p $(pgrep python)
exit

# 2. Memory usage
flyctl ssh console
free -h
ps aux --sort=-%mem | head -10
exit

# 3. Database connections
flyctl postgres connect -a duespark-db
SELECT count(*) as active_connections FROM pg_stat_activity WHERE state = 'active';
\q

# 4. Slow query analysis
flyctl postgres connect -a duespark-db
SELECT query, mean_time, calls, total_time FROM pg_stat_statements
WHERE mean_time > 1000 ORDER BY mean_time DESC;
\q
```

#### Step 3: Optimization Implementation
```bash
# 1. Scale resources if needed
flyctl scale memory 2048
flyctl scale count 3

# 2. Database optimizations
flyctl postgres connect -a duespark-db
VACUUM ANALYZE;  # Run maintenance
\q

# 3. Application-level optimizations
# - Deploy code optimizations
# - Update caching strategies
# - Optimize database queries

# 4. Monitor improvements
flyctl metrics
```

---

## 📋 General Runbook Guidelines

### Before Starting Any Runbook
1. **Read the entire runbook** before beginning
2. **Verify prerequisites** are met
3. **Have rollback plan** ready
4. **Notify stakeholders** if needed
5. **Take baseline measurements** for comparison

### During Runbook Execution
1. **Follow steps exactly** as written
2. **Document any deviations** and reasons
3. **Verify each step** before proceeding
4. **Stop if unexpected results** occur
5. **Communicate progress** to stakeholders

### After Runbook Completion
1. **Verify success criteria** are met
2. **Document any issues** encountered
3. **Update runbook** if improvements needed
4. **Clean up temporary files** and resources
5. **Schedule follow-up** monitoring if needed

### Emergency Contacts

**Incident Escalation:**
- Primary: [Your primary contact]
- Secondary: [Your secondary contact]
- Emergency: [24/7 emergency contact]

**External Services:**
- Fly.io Support: [support method]
- Vercel Support: [support method]
- Database Specialist: [contact info]

---

Remember: **When in doubt, ask for help.** It's better to escalate early than to cause additional problems through hasty actions.