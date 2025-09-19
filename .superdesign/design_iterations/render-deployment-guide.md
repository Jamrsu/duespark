# 🚀 DueSpark Backend Deployment to Render

## Step 1: Render Setup (15 minutes)

### 1.1 Create Render Account & Connect GitHub
1. Go to [render.com](https://render.com) and sign up
2. Connect your GitHub account
3. Import your DueSpark repository

### 1.2 Create Web Service
1. Click "New +" → "Web Service"
2. Select your GitHub repository
3. **IMPORTANT**: Set Root Directory to `sic_backend_mvp_jwt_sqlite`
4. Configure these settings:
   - **Name**: `duespark-backend`
   - **Runtime**: Docker
   - **Dockerfile Path**: `Dockerfile.render` (relative to root directory)
   - **Instance Type**: Starter ($7/month) - can upgrade later

### 1.3 Environment Variables
Add these environment variables in Render dashboard:

```bash
# CRITICAL: Use secure values, not these examples
SECRET_KEY=THju99bQG2Exhk8itkcWcFjwSWpAak8oOjFJw6HKa3Y=

# Email Provider (choose Postmark OR SES)
EMAIL_PROVIDER=postmark
POSTMARK_SERVER_TOKEN=your_postmark_token_here
EMAIL_FROM="DueSpark <noreply@yourdomain.com>"
MAIL_FROM=noreply@yourdomain.com
MAIL_FROM_NAME=DueSpark

# OR use SES instead of Postmark:
# EMAIL_PROVIDER=ses
# AWS_REGION=us-east-1
# AWS_ACCESS_KEY_ID=your_access_key
# AWS_SECRET_ACCESS_KEY=your_secret_key

# Optional: Stripe (if you want payment processing)
# STRIPE_SECRET_KEY=sk_live_...
# STRIPE_WEBHOOK_SECRET=whsec_...

# Production settings
ENVIRONMENT=production
PUBLIC_BASE_URL=https://your-app-name.onrender.com
```

### 1.4 Add PostgreSQL Database
1. In Render dashboard, go to "New +" → "PostgreSQL"
2. **Name**: `duespark-database`
3. **User**: `duespark`
4. **Database**: `duespark_prod`
5. **Instance Type**: Starter ($7/month)
6. Create database and copy the connection string
7. Add to your web service environment variables:
   ```
   DATABASE_URL=postgresql://[connection_string_from_render]
   ```

### 1.5 Deploy
1. Click "Create Web Service"
2. Render will automatically build and deploy
3. **Wait 5-10 minutes** for first deployment
4. Your backend will be available at: `https://your-app-name.onrender.com`

### 1.6 Verify Deployment
Test these endpoints:
- `https://your-app-name.onrender.com/healthz` - Should return status
- `https://your-app-name.onrender.com/docs` - Should show API documentation

---

## Troubleshooting

### Common Issues:
1. **Build fails**: Check logs in Render dashboard
2. **Database connection fails**: Verify DATABASE_URL format
3. **Health check fails**: Check environment variables are set correctly

### Next Steps:
Once backend is deployed and healthy, proceed to frontend deployment on Vercel.