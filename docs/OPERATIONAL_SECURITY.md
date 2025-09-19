# Operational Security & Incident Response Procedures

## Table of Contents
1. [Security Monitoring](#security-monitoring)
2. [Secret Management](#secret-management)
3. [Incident Response](#incident-response)
4. [Access Controls](#access-controls)
5. [Backup & Recovery](#backup--recovery)
6. [Security Maintenance](#security-maintenance)
7. [Compliance & Auditing](#compliance--auditing)

## Security Monitoring

### Real-time Monitoring

#### Health Check Monitoring
- **Basic Health Check**: `/health` - Load balancer health checks (< 1s response)
- **Detailed Health Check**: `/health/detailed` - Comprehensive component health
- **Readiness Check**: `/health/ready` - Kubernetes readiness probe
- **Liveness Check**: `/health/live` - Kubernetes liveness probe

#### Security Metrics
```bash
# Monitor security events
curl -s http://localhost:8000/metrics | grep -E "(security|auth|error)"

# Check failed login attempts
grep "authentication_failed" /var/log/duespark/app.log | tail -20

# Monitor suspicious activity
grep -E "(sql_injection|xss_attempt|unauthorized_access)" /var/log/duespark/security.log
```

#### Alerting Configuration

**Critical Alerts** (PagerDuty + Slack):
- Database connection failures
- Authentication system failures
- Payment processing errors
- Security breaches
- Service downtime > 5 minutes

**Warning Alerts** (Slack only):
- High error rates (> 5% of requests)
- Slow response times (> 10s average)
- Resource usage > 80%
- Failed health checks

### Log Analysis

#### Security Event Monitoring
```bash
# Real-time security log monitoring
tail -f /var/log/duespark/security.log | grep -E "(CRITICAL|ERROR)"

# Failed authentication attempts
grep "auth_failed" /var/log/duespark/app.log | \
  awk '{print $1, $2, $NF}' | sort | uniq -c | sort -nr

# Suspicious IP addresses (> 10 failed attempts)
grep "401" /var/log/nginx/access.log | \
  awk '{print $1}' | sort | uniq -c | sort -nr | head -20
```

## Secret Management

### Secret Rotation Schedule

#### JWT Secret Key (SECRET_KEY)
- **Frequency**: Every 90 days
- **Process**:
  1. Generate new 32+ character secret
  2. Update in production environment
  3. Deploy with zero-downtime
  4. Invalidate all existing tokens
  5. Force user re-authentication

```bash
# Generate new secret
openssl rand -base64 32

# Update secret (production deployment required)
echo "SECRET_KEY=new_secret_here" >> .env.production
```

#### Database Credentials
- **Frequency**: Every 180 days
- **Process**:
  1. Create new database user
  2. Grant appropriate permissions
  3. Update DATABASE_URL
  4. Deploy application
  5. Remove old database user

#### API Keys (Stripe, Email Providers)
- **Frequency**: Every 365 days or when compromised
- **Process**:
  1. Generate new keys in provider dashboard
  2. Update environment variables
  3. Deploy application
  4. Test functionality
  5. Deactivate old keys

### Secret Storage Security

#### Environment Variables
- Never commit secrets to version control
- Use encrypted storage (AWS Secrets Manager, HashiCorp Vault)
- Implement least-privilege access
- Audit secret access regularly

#### Production Secret Management
```bash
# Encrypt secrets with SOPS
sops -e secrets.yaml > secrets.encrypted.yaml

# Decrypt in production
sops -d secrets.encrypted.yaml | kubectl apply -f -

# Verify secret accessibility
kubectl get secret duespark-secrets -o yaml
```

## Incident Response

### Incident Classification

#### Severity Levels

**Critical (P0)** - Immediate Response Required
- Complete service outage
- Data breach or security incident
- Payment processing failure
- Database corruption

**High (P1)** - Response within 1 hour
- Partial service degradation
- Authentication issues
- Performance issues affecting users
- Failed backups

**Medium (P2)** - Response within 4 hours
- Non-critical feature failures
- Monitoring alerts
- Third-party integration issues

**Low (P3)** - Response within 24 hours
- Cosmetic issues
- Documentation updates
- Non-urgent improvements

### Incident Response Procedures

#### Initial Response (First 15 minutes)
1. **Acknowledge incident** in PagerDuty/Slack
2. **Assess severity** using classification above
3. **Notify stakeholders** based on severity
4. **Begin investigation** and document findings

#### Investigation Process
```bash
# Check service status
curl -f https://api.duespark.com/health/detailed

# Review recent deployments
git log --oneline -10

# Check error logs
grep -i error /var/log/duespark/app.log | tail -50

# Monitor system resources
top -p $(pgrep -f "uvicorn")
```

#### Communication Templates

**Initial Alert (< 15 minutes)**
```
🚨 INCIDENT ALERT - [SEVERITY]
Service: DueSpark API
Issue: [Brief description]
Start Time: [timestamp]
Status: Investigating
Next Update: [timestamp + 30 min]
```

**Status Update (Every 30 minutes)**
```
📊 INCIDENT UPDATE - [SEVERITY]
Service: DueSpark API
Issue: [Brief description]
Status: [Investigating/Mitigating/Resolved]
Actions Taken: [List key actions]
Next Update: [timestamp + 30 min]
```

**Resolution Notice**
```
✅ INCIDENT RESOLVED - [SEVERITY]
Service: DueSpark API
Issue: [Brief description]
Resolution: [How it was fixed]
Duration: [total incident time]
Post-mortem: [Link to post-mortem if P0/P1]
```

### Recovery Procedures

#### Database Recovery
```bash
# List available backups
python -c "
from app.backup_service import backup_service
import asyncio
backups = asyncio.run(backup_service.list_backups())
for backup in backups:
    print(f'{backup[\"backup_id\"]} - {backup[\"created_at\"]}')
"

# Restore from backup (CRITICAL - requires confirmation)
python -c "
from app.backup_service import backup_service
import asyncio
result = asyncio.run(backup_service.restore_backup('backup_id_here'))
print(result)
"
```

#### Service Recovery
```bash
# Rollback to previous version
./scripts/deploy.sh production rollback_version_here

# Restart services
docker-compose -f docker-compose.production.yml restart

# Clear caches
redis-cli FLUSHALL
```

## Access Controls

### Production Access Management

#### SSH Access
- **Principle**: Least privilege access
- **Requirement**: MFA enabled for all accounts
- **Logging**: All SSH sessions logged and monitored
- **Review**: Access permissions reviewed monthly

```bash
# Add new user with limited permissions
useradd -m -s /bin/bash newuser
usermod -aG duespark newuser

# Setup SSH key authentication
mkdir -p /home/newuser/.ssh
cp authorized_keys /home/newuser/.ssh/
chmod 600 /home/newuser/.ssh/authorized_keys
chown -R newuser:newuser /home/newuser/.ssh
```

#### Database Access
- **Production DB**: Read-only access for developers
- **Admin access**: Limited to 2-3 senior engineers
- **Audit trail**: All database queries logged

```sql
-- Create read-only user for developers
CREATE USER developer_readonly WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE duespark TO developer_readonly;
GRANT USAGE ON SCHEMA public TO developer_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO developer_readonly;
```

#### Application Access
- **API Keys**: Rotate every 6 months
- **Service Accounts**: Minimal permissions required
- **Monitoring**: Track all API key usage

### Access Review Process

**Monthly Review**:
- Audit all user accounts
- Review database permissions
- Check API key usage
- Update access documentation

**Quarterly Review**:
- Full security audit
- Update access policies
- Review incident logs
- Update procedures

## Backup & Recovery

### Backup Strategy

#### Automated Daily Backups
```bash
# Schedule daily backups (crontab)
0 2 * * * /usr/local/bin/python -c "
from app.backup_service import backup_service
import asyncio
result = asyncio.run(backup_service.create_backup('scheduled'))
print(result)
" >> /var/log/backup.log 2>&1
```

#### Backup Verification
```bash
# Weekly backup integrity check
0 3 * * 0 /usr/local/bin/python -c "
from app.backup_service import backup_service
import asyncio
backups = asyncio.run(backup_service.list_backups())
for backup in backups[-7:]:  # Check last 7 backups
    result = asyncio.run(backup_service.verify_backup_integrity(backup['backup_id']))
    print(f'{backup[\"backup_id\"]}: {result[\"status\"]}')
" >> /var/log/backup-verification.log 2>&1
```

#### Backup Retention Policy
- **Daily backups**: Kept for 30 days
- **Weekly backups**: Kept for 12 weeks
- **Monthly backups**: Kept for 12 months
- **Annual backups**: Kept for 7 years

### Disaster Recovery

#### Recovery Time Objective (RTO): 4 hours
#### Recovery Point Objective (RPO): 24 hours

**Recovery Procedures**:
1. Deploy infrastructure from code
2. Restore database from latest backup
3. Update DNS to point to new infrastructure
4. Verify all services are operational
5. Communicate with users about service restoration

## Security Maintenance

### Regular Security Tasks

#### Weekly Tasks
- [ ] Review security alerts and logs
- [ ] Check for security updates
- [ ] Verify backup completion
- [ ] Monitor resource usage

#### Monthly Tasks
- [ ] Update dependencies
- [ ] Review access permissions
- [ ] Security scan of infrastructure
- [ ] Update security documentation

#### Quarterly Tasks
- [ ] Full security audit
- [ ] Penetration testing
- [ ] Disaster recovery test
- [ ] Update incident response procedures

### Security Updates

#### Dependency Updates
```bash
# Check for security updates
safety check --full-report

# Update Python dependencies
pip-audit --fix

# Update Docker base images
docker pull python:3.11-slim
docker build --no-cache -t duespark-backend .
```

#### System Updates
```bash
# Ubuntu/Debian security updates
apt update && apt upgrade -y

# Check for reboot requirement
test -f /var/run/reboot-required && echo "Reboot required"
```

## Compliance & Auditing

### Audit Logging

#### Application Logs
- All authentication attempts
- Data access and modifications
- Administrative actions
- Security events

#### System Logs
- SSH access logs
- Database connection logs
- Network traffic logs
- File system changes

### Compliance Requirements

#### Data Protection
- **Encryption**: All data encrypted at rest and in transit
- **Access controls**: Strict access controls implemented
- **Data retention**: Clear data retention policies
- **Privacy**: User privacy protection measures

#### Financial Compliance
- **PCI compliance**: For payment processing
- **SOX compliance**: For financial reporting
- **Audit trail**: Complete audit trail for financial transactions

### Regular Audits

#### Security Audit Checklist
- [ ] Access controls review
- [ ] Encryption verification
- [ ] Backup and recovery testing
- [ ] Incident response testing
- [ ] Compliance verification
- [ ] Security training updates

#### Audit Documentation
- Maintain audit logs for minimum 7 years
- Document all security incidents
- Record all access changes
- Track compliance metrics

---

## Emergency Contacts

**Security Team**: security@duespark.com
**On-call Engineer**: +1-555-DUESPARK
**PagerDuty**: https://duespark.pagerduty.com
**Slack Channel**: #security-alerts

## Document Updates

This document should be reviewed and updated quarterly or after any security incident.

**Last Updated**: 2024-09-19
**Next Review**: 2024-12-19
**Document Owner**: Security Team