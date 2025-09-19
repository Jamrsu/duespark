# Email Addresses to Verify in AWS SES Console 📧

## IMMEDIATE ACTION: Verify These Emails

While waiting for production access approval, go to AWS SES Console and verify these email addresses:

### 1. **Your Personal Email** (MOST IMPORTANT)
- Use your main email address for testing
- This will be your primary test account

### 2. **System Email Addresses**
```
admin@duespark.com
support@duespark.com
no-reply@duespark.com
```

### 3. **Test Client Emails** (if you have them)
- Any email addresses you'll use for testing client accounts
- Example: testclient@yourdomain.com

## How to Verify Emails in AWS SES:

1. **Open AWS SES Console**: https://console.aws.amazon.com/sesv2/
2. **Switch to eu-north-1 region** (top right)
3. **Go to "Verified identities"** (left menu)
4. **Click "Create identity"**
5. **Select "Email address"**
6. **Enter the email address**
7. **Click "Create identity"**
8. **Check the email inbox and click verification link**

## Quick Verification Script:

Save this AWS CLI command to verify emails programmatically:

```bash
#!/bin/bash
# Verify emails via AWS CLI (alternative method)

aws ses verify-email-identity --email-address admin@duespark.com --region eu-north-1
aws ses verify-email-identity --email-address support@duespark.com --region eu-north-1
aws ses verify-email-identity --email-address no-reply@duespark.com --region eu-north-1
aws ses verify-email-identity --email-address YOUR_PERSONAL_EMAIL@domain.com --region eu-north-1

echo "Verification emails sent! Check your inboxes."
```

## ⚠️ IMPORTANT NOTES:

- **You MUST verify emails before testing** - unverified emails will be rejected in sandbox mode
- **Domain verification helps** - since duespark.com is verified, any @duespark.com email should work
- **Personal email is critical** - you need at least one working email for testing
- **Check spam folders** - verification emails sometimes go to spam

## After Verification:

Once emails are verified, you can:
1. **Deploy to Render immediately**
2. **Test email functionality** with verified addresses
3. **Run the production test script** with verified emails
4. **Monitor sending statistics** in AWS SES console

## Verification Status Check:

```bash
# Check which emails are verified
aws ses get-identity-verification-attributes --identities admin@duespark.com support@duespark.com --region eu-north-1
```

## Production Access Timeline:

- **Typical approval**: 24-48 hours
- **Business hours**: AWS typically reviews during US business hours
- **No action required**: Just wait for approval email
- **Auto-activation**: No code changes needed when approved