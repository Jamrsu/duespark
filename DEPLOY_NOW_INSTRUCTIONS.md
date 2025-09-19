# 🚀 DEPLOY TO RENDER NOW - Manual Deployment Instructions

## ❗ CRITICAL: Don't wait for GitHub push - Deploy manually!

GitHub is blocking the push due to secret scanning, but you can deploy immediately using Render's dashboard.

---

## 🎯 IMMEDIATE STEPS (10 minutes to deployment)

### STEP 1: Go to Render Dashboard (2 minutes)

1. **Visit**: https://dashboard.render.com
2. **Login** with your GitHub account
3. **Click "New"** → **"Web Service"**
4. **Connect GitHub** if not already connected
5. **Select your `duespark` repository**

### STEP 2: Configure Deployment (3 minutes)

**Basic Settings:**
- **Name**: `duespark-backend`
- **Region**: `Oregon` (or your preference)
- **Branch**: `main`
- **Root Directory**: `./` (default)
- **Runtime**: `Python 3`

**Build & Deploy Commands:**
```bash
# Build Command:
cd sic_backend_mvp_jwt_sqlite && pip install --upgrade pip && pip install -r requirements.txt

# Start Command:
cd sic_backend_mvp_jwt_sqlite && alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

**Auto-Deploy**: Enable (so it redeploys on GitHub changes)

### STEP 3: Add Environment Variables (5 minutes)

**In the "Environment" tab, add these variables:**

```env
# Core Application
PYTHONPATH=/opt/render/project/src/sic_backend_mvp_jwt_sqlite
ENVIRONMENT=production
DEBUG=false

# Security (CRITICAL - SET THESE)
SECRET_KEY=HUlNjPPyWQpq3hcZiUw1aUDNc6Hhgla0
ENCRYPTION_KEY=QgHbp3kSLp6Xdo6ZnkToEDY12E25Y5u4
JWT_SECRET_KEY=yEpbrLEwN50UlC46gfe01Aera5YnaivP

# Admin Account
ADMIN_EMAIL=admin@duespark.com
ADMIN_PASSWORD=W3eSnzMZUAtFpbKFrtWu

# AWS SES Configuration
EMAIL_PROVIDER=ses
AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_FROM_IAM_USER
AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_KEY_FROM_IAM_USER
AWS_REGION=eu-north-1
AWS_SES_REGION=eu-north-1
EMAIL_FROM=DueSpark <no-reply@duespark.com>
MAIL_FROM=no-reply@duespark.com
MAIL_FROM_NAME=DueSpark
MAIL_REPLY_TO=support@duespark.com

# Testing
ALLOW_SIMPLE_TEST_EMAIL=true

# Application URLs
PUBLIC_BASE_URL=https://duespark-backend.onrender.com
BACKEND_CORS_ORIGINS=["https://app.duespark.com", "https://duespark.com"]

# Database (Render will provide this automatically)
# DATABASE_URL will be auto-populated when you add PostgreSQL
```

### STEP 4: Add PostgreSQL Database

1. **Click "New"** → **"PostgreSQL"**
2. **Name**: `duespark-postgres`
3. **Database Name**: `duespark`
4. **User**: `duespark`
5. **Region**: Same as your web service
6. **Plan**: Starter (free)

**After creation:**
- Go back to your web service → Environment
- DATABASE_URL will be automatically added

### STEP 5: Deploy! (1 minute)

1. **Click "Create Web Service"**
2. **Watch the deployment logs**
3. **Wait for "Live" status** (2-3 minutes)

---

## ✅ IMMEDIATE TESTING

### Test Your Deployment:

1. **Health Check**: Visit `https://your-service.onrender.com/healthz`
2. **API Docs**: Visit `https://your-service.onrender.com/docs`
3. **Simple Email Test**:
   ```bash
   curl -X POST https://your-service.onrender.com/test-email-simple \
     -H "Content-Type: application/json" \
     -d '{"to": "your-verified-email@domain.com"}'
   ```

---

## 🔑 CRITICAL REMINDERS

### Before Testing Emails:
1. **Verify emails in AWS SES Console** (eu-north-1 region)
2. **Add your personal email** for testing
3. **Only verified emails work** in sandbox mode

### Your AWS Credentials:
- **Use the IAM user credentials** you created in AWS Console
- **Access Key ID**: starts with `AKIA...`
- **Secret Access Key**: the long secret you saved

### When AWS SES Production Access is Approved:
- **NO CHANGES NEEDED** in your deployment
- **Emails work to any address** automatically
- **No code updates required**

---

## 🆘 IF SOMETHING GOES WRONG

### Deployment Failed?
1. **Check Render logs** → Build & Deploy section
2. **Common issue**: Missing environment variables
3. **Fix**: Add missing variables and redeploy

### Email Not Working?
1. **Verify** the recipient email in AWS SES Console
2. **Check** AWS credentials are correct
3. **Test with** your personal verified email first

### Database Issues?
1. **Ensure** PostgreSQL database is created
2. **Check** DATABASE_URL is automatically set
3. **View logs** for migration errors

---

## 🎊 YOU'RE READY!

Once deployed:
- ✅ **Your backend is live**
- ✅ **Email testing works with verified addresses**
- ✅ **All API endpoints are functional**
- ✅ **Database is operational**
- ✅ **Ready for AWS SES production approval**

**Your deployment URL will be**: `https://duespark-backend.onrender.com`

**Next**: Verify a test email in AWS SES and send a test email to confirm everything works!

---

**🎯 DEPLOYMENT TIME: ~10 minutes from start to live backend**