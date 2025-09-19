# DueSpark Render Deployment Guide 🚀

## CRITICAL: Deploy NOW - Don't Wait for AWS SES Production Access!

Your AWS SES production access request is pending, but you can and SHOULD deploy immediately. Here's why:

✅ **Deploy while in sandbox mode** - Your backend will work perfectly with verified email addresses
✅ **Test complete functionality** - Verify your entire email workflow before going live
✅ **Be ready for instant production** - Switch to full production immediately when approved

---

## 🎯 IMMEDIATE DEPLOYMENT STEPS

### 1. **Deploy to Render** (5 minutes)

```bash
# From your project root
git add .
git commit -m "Configure AWS SES for production deployment"
git push origin main

# Then deploy using render.yaml
render blueprint deploy
```

**OR** Use Render Dashboard:
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Connect your GitHub repository
3. Select "New Web Service"
4. Choose your `duespark` repository
5. Render will automatically detect the `render.yaml` configuration

### 2. **Set Secret Environment Variables in Render Dashboard**

⚠️ **CRITICAL**: Set these in Render Dashboard (not in code):

```env
# Security Keys (from your .env.production)
SECRET_KEY=HUlNjPPyWQpq3hcZiUw1aUDNc6Hhgla0
ENCRYPTION_KEY=QgHbp3kSLp6Xdo6ZnkToEDY12E25Y5u4
JWT_SECRET_KEY=yEpbrLEwN50UlC46gfe01Aera5YnaivP
ADMIN_PASSWORD=W3eSnzMZUAtFpbKFrtWu

# AWS SES Credentials (from your IAM user)
AWS_ACCESS_KEY_ID=YOUR_ACTUAL_AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=YOUR_ACTUAL_AWS_SECRET_ACCESS_KEY

# Stripe (when ready)
STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_STRIPE_SECRET_KEY
STRIPE_CLIENT_ID=ca_YOUR_LIVE_STRIPE_CLIENT_ID
STRIPE_WEBHOOK_SECRET=whsec_YOUR_LIVE_WEBHOOK_SECRET
```

### 3. **Verify Email Addresses for Testing**

While in sandbox mode, verify these emails in AWS SES Console:

```
1. Your personal email (for testing)
2. admin@duespark.com (for system emails)
3. support@duespark.com (for replies)
4. Any test client emails you want to use
```

**How to verify:**
1. AWS SES Console → Verified identities
2. Click "Create identity"
3. Choose "Email address"
4. Enter email and click "Create identity"
5. Check email and click verification link

---

## 🧪 TESTING IN SANDBOX MODE

### Test Email Functionality

Once deployed, test your email system:

```bash
# Test API endpoint (replace with your Render URL)
curl -X POST https://duespark-backend.onrender.com/api/v1/test-email \
  -H "Content-Type: application/json" \
  -d '{"to": "your-verified-email@example.com"}'
```

### Key Features to Test:

✅ **User registration emails**
✅ **Password reset emails**
✅ **Invoice reminder emails**
✅ **Payment confirmation emails**
✅ **System notification emails**

---

## 🌟 WHEN AWS SES PRODUCTION ACCESS IS APPROVED

When AWS approves your production access (usually 24-48 hours):

### 1. **NO CODE CHANGES NEEDED!**
Your deployment is already configured for production.

### 2. **Remove Email Restrictions**
AWS will automatically:
- Remove the 200 email/day limit
- Allow sending to any email address
- Remove the sandbox restrictions

### 3. **Test Production Sending**
```bash
# Test with any email address (no verification needed)
curl -X POST https://duespark-backend.onrender.com/api/v1/test-email \
  -H "Content-Type: application/json" \
  -d '{"to": "anyone@example.com"}'
```

### 4. **Monitor Your Email Reputation**
- Check AWS SES Console for bounce/complaint rates
- Monitor your sending statistics
- Set up CloudWatch alarms if needed

---

## 🔍 DEPLOYMENT VERIFICATION CHECKLIST

After deployment, verify these endpoints:

```bash
# Health check
curl https://duespark-backend.onrender.com/healthz

# API docs
curl https://duespark-backend.onrender.com/docs

# Test authenticated endpoint
curl https://duespark-backend.onrender.com/api/v1/users/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🚨 TROUBLESHOOTING

### Common Issues:

**1. Email not sending:**
- Check AWS SES sending statistics in console
- Verify recipient email is verified (in sandbox mode)
- Check Render logs for error messages

**2. Database migration issues:**
```bash
# Check Render logs for migration errors
# The startCommand includes: alembic upgrade head
```

**3. Environment variable issues:**
- Double-check all secret variables in Render dashboard
- Ensure AWS credentials are correct
- Verify JWT/encryption keys are set

**4. CORS issues:**
- Frontend domain must match CORS settings
- Update if using different domain than duespark.com

---

## 📊 MONITORING YOUR DEPLOYMENT

### Render Dashboard Monitoring:
- CPU/Memory usage
- Response times
- Error rates
- Deployment logs

### AWS SES Monitoring:
- Sending quota usage
- Bounce rate
- Complaint rate
- Reputation metrics

---

## 🎉 NEXT STEPS AFTER DEPLOYMENT

1. **Set up domain DNS** for api.duespark.com → Render service
2. **Configure frontend deployment** (Vercel/Netlify)
3. **Set up monitoring alerts** (Sentry, AWS CloudWatch)
4. **Configure custom domain** in Render
5. **Set up SSL certificate** (automatic with custom domain)

---

## 🔑 KEY POINTS TO REMEMBER

- ✅ **Deploy immediately** - don't wait for production access
- ✅ **Test with verified emails** in sandbox mode
- ✅ **Monitor AWS SES console** for approval status
- ✅ **No code changes needed** when approved
- ✅ **Your reputation starts clean** with AWS SES

Your deployment will be production-ready from day one! 🚀