# 📧 Email Configuration Guide

## Step 3: Email Service Setup (10 minutes)

Choose **ONE** email provider. Postmark is recommended for easier setup.

---

## Option A: Postmark (Recommended)

### A.1 Create Postmark Account
1. Sign up at [postmarkapp.com](https://postmarkapp.com)
2. Create a new server
3. Get your **Server Token** from the API Tokens section

### A.2 Add Sender Signature
1. Go to "Sender Signatures"
2. Add your sending email (e.g., `noreply@yourdomain.com`)
3. **IMPORTANT**: You'll need to verify this email address

### A.3 DNS Configuration (If you have a domain)
Add these DNS records to improve deliverability:
```
Type: TXT
Name: @
Value: v=spf1 include:spf.postmarkapp.com ~all

Type: TXT
Name: pm._domainkey
Value: [DKIM record from Postmark dashboard]
```

### A.4 Environment Variables (Add to Render)
```bash
EMAIL_PROVIDER=postmark
POSTMARK_SERVER_TOKEN=your_server_token_here
EMAIL_FROM="DueSpark <noreply@yourdomain.com>"
MAIL_FROM=noreply@yourdomain.com
MAIL_FROM_NAME=DueSpark
```

---

## Option B: AWS SES (Advanced Users)

### B.1 AWS SES Setup
1. Go to AWS SES Console
2. Verify your domain or email address
3. Request production access (removes sandbox limitations)
4. Create IAM user with SES permissions

### B.2 Environment Variables (Add to Render)
```bash
EMAIL_PROVIDER=ses
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
EMAIL_FROM="DueSpark <noreply@yourdomain.com>"
MAIL_FROM=noreply@yourdomain.com
MAIL_FROM_NAME=DueSpark
```

---

## Step 4: Test Email Delivery

### 4.1 Use Preview Endpoint
Your DueSpark backend includes email preview endpoints:

1. Visit: `https://your-backend.onrender.com/reminders/preview/friendly`
2. This shows what emails will look like
3. Check different tones: `friendly`, `neutral`, `firm`

### 4.2 Test Email Sending
Once configured, create a test invoice and reminder to verify emails send correctly.

### 4.3 Check Deliverability
- Send test emails to Gmail, Outlook, Yahoo
- Check spam folders initially
- Monitor delivery rates in your email provider dashboard

---

## Troubleshooting

### Common Issues:
1. **Email not sending**: Check server token/credentials
2. **Emails go to spam**: Add SPF/DKIM records
3. **Template not loading**: Check EMAIL_FROM format

### Email Template Customization
Templates are located in `/sic_backend_mvp_jwt_sqlite/app/email_templates.py`
You can modify the messaging and styling there.

---

## Next Steps
After email is configured and tested, proceed to final validation and go-live.