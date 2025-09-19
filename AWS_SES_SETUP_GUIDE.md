# AWS SES Setup Guide for DueSpark Production

## STEP 1: Generate Secure SECRET_KEY

### Quick Generation Commands:
```bash
# Method 1 (Recommended)
python -c "import secrets; print(secrets.token_urlsafe(50))"

# Method 2
openssl rand -base64 50

# Method 3 (Django style)
python -c "from secrets import token_urlsafe; print(''.join(c for c in token_urlsafe(60) if c.isalnum())[:50])"
```

**Save this key securely** - you'll need it for your environment variables.

## STEP 2: AWS SES Complete Setup

### 2.1: Access AWS SES Console
1. Log into AWS Console
2. Navigate to SES: https://console.aws.amazon.com/ses/
3. **Important**: Choose region (us-east-1, us-west-2, or eu-west-1 recommended)

### 2.2: Domain Verification

1. **In SES Console**:
   - Go to "Verified identities"
   - Click "Create identity"
   - Select "Domain"
   - Enter your domain: `yourdomain.com`

2. **DNS Configuration**:
   - AWS provides verification records
   - Add to your domain's DNS:
   ```
   Type: TXT
   Name: _amazonses.yourdomain.com
   Value: [PROVIDED_VERIFICATION_STRING]
   TTL: 1800
   ```

3. **DKIM Setup** (Critical for deliverability):
   - Enable "Easy DKIM"
   - Add 3 CNAME records AWS provides:
   ```
   [token1]._domainkey.yourdomain.com → [token1].dkim.amazonses.com
   [token2]._domainkey.yourdomain.com → [token2].dkim.amazonses.com
   [token3]._domainkey.yourdomain.com → [token3].dkim.amazonses.com
   ```

4. **Wait for Verification** (5-15 minutes)

### 2.3: Request Production Access (Exit Sandbox Mode)

**CRITICAL**: In sandbox mode, you can only send to verified addresses.

1. **In SES Console → Account Dashboard**:
   - Click "Request production access"

2. **Fill Application Form**:
   ```
   Mail Type: Transactional
   Website URL: https://yourduespark.com

   Use Case Description:
   DueSpark is an invoicing and payment reminder application that sends transactional emails to business customers. We send:

   - Invoice delivery notifications when invoices are generated
   - Payment reminders for overdue invoices
   - Account notifications (password resets, login alerts)
   - System notifications (payment confirmations, failures)

   Expected Volume: 1,000-5,000 emails per month initially

   We only send to users who have explicitly signed up for our service. All emails include clear unsubscribe links. We monitor bounce and complaint rates and maintain proper suppression lists.

   Our application has proper error handling for bounced emails and we will implement SNS notifications for bounce/complaint monitoring.

   Bounce/Complaint Handling:
   We will monitor bounce and complaint rates via CloudWatch and implement automated suppression list management. Any addresses with hard bounces or complaints will be automatically suppressed.
   ```

3. **Compliance Contact**: Provide legitimate business email

4. **Submit and Wait** (Usually 24-48 hours for approval)

### 2.4: IAM User Creation (Security Best Practice)

1. **Create Dedicated IAM User**:
   - Go to IAM Console → Users → Create User
   - Username: `ses-duespark-production`
   - Access Type: Programmatic access only

2. **Create Custom SES Policy**:
   ```json
   {
       "Version": "2012-10-17",
       "Statement": [
           {
               "Effect": "Allow",
               "Action": [
                   "ses:SendEmail",
                   "ses:SendRawEmail",
                   "ses:GetSendQuota",
                   "ses:GetSendStatistics"
               ],
               "Resource": "*",
               "Condition": {
                   "StringEquals": {
                       "ses:FromAddress": [
                           "noreply@yourdomain.com",
                           "invoices@yourdomain.com",
                           "support@yourdomain.com"
                       ]
                   }
               }
           }
       ]
   }
   ```
   - Policy Name: `DueSparkSESProductionPolicy`

3. **Attach Policy to User**
4. **Generate Access Keys** - Save these securely!

### 2.5: Environment Configuration

**On Render, set these environment variables**:

```bash
# Core Security
SECRET_KEY=your_50_character_secret_key_generated_above

# Email Provider Selection
EMAIL_PROVIDER=ses

# AWS Credentials
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_REGION=us-east-1

# Email Configuration
EMAIL_FROM=DueSpark <noreply@yourdomain.com>
MAIL_FROM_NAME=DueSpark
MAIL_FROM=noreply@yourdomain.com

# Optional: SES Configuration Set (for advanced tracking)
# SES_CONFIGURATION_SET=duespark-transactional
```

## STEP 3: Production Validation

### 3.1: Test Email Sending

Create a test endpoint or use your existing email functionality:

```python
# Test in production
POST /test-email
{
    "to_email": "your-test@gmail.com",
    "subject": "DueSpark Production Test",
    "message": "SES is working!"
}
```

### 3.2: Monitor SES Metrics

1. **CloudWatch Metrics**:
   - Bounce Rate (keep < 5%)
   - Complaint Rate (keep < 0.1%)
   - Delivery Delay
   - Send Quota Usage

2. **SES Console Monitoring**:
   - Sending Statistics
   - Reputation Metrics
   - Suppression List

## STEP 4: Cost Comparison

### AWS SES Pricing:
- **$0.10 per 1,000 emails** (first 62,000/month free with EC2)
- **$0.12 per GB attachment**
- **No monthly fees**

### Postmark Pricing:
- **$10/month for 10,000 emails**
- **$1.25 per 1,000 additional emails**

### Cost Savings Example:
- **5,000 emails/month**: SES = $0.50, Postmark = $10
- **Savings**: ~95% cost reduction

## STEP 5: Advanced Configuration (Optional)

### 5.1: Configuration Sets (Recommended)
```bash
# Create configuration set for tracking
aws sesv2 create-configuration-set --configuration-set-name duespark-transactional

# Add to environment
SES_CONFIGURATION_SET=duespark-transactional
```

### 5.2: SNS Bounce/Complaint Notifications
1. Create SNS topics for bounces/complaints
2. Configure SES to publish to these topics
3. Monitor bounce rates programmatically

### 5.3: Dedicated IP (High Volume)
- For 50k+ emails/month
- Better reputation control
- Additional $24.95/month

## TROUBLESHOOTING

### Common Issues:

1. **"Email address not verified" error**:
   - Domain verification incomplete
   - Still in sandbox mode

2. **High bounce rate**:
   - Check email format validation
   - Monitor recipient quality

3. **Delivery delays**:
   - Check reputation metrics
   - May need dedicated IP

4. **Authentication errors**:
   - Verify IAM permissions
   - Check AWS credentials in environment

### Testing Commands:

```bash
# Test AWS credentials
aws sts get-caller-identity

# Test SES quota
aws ses get-send-quota --region us-east-1

# Test sending capability
aws sesv2 send-email \
    --from-email-address noreply@yourdomain.com \
    --destination ToAddresses=test@example.com \
    --content Simple='{Subject={Data="Test"},Body={Text={Data="Test message"}}}'
```

## CHECKLIST

- [ ] Domain verified in SES
- [ ] DKIM configured
- [ ] Production access approved
- [ ] IAM user created with minimal permissions
- [ ] Environment variables configured on Render
- [ ] Test email sent successfully
- [ ] Monitoring configured
- [ ] Bounce/complaint handling planned

## NEXT STEPS

1. Deploy with new environment variables
2. Test email sending in production
3. Monitor delivery metrics for first week
4. Set up CloudWatch alarms for bounce/complaint rates
5. Consider configuration sets for advanced tracking

---

**Need Help?**
- AWS SES Documentation: https://docs.aws.amazon.com/ses/
- Cost Calculator: https://calculator.aws/
- Support: Check AWS support plans for technical assistance