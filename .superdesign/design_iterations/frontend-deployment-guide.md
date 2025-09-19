# 🎯 DueSpark Frontend Deployment to Vercel

## Step 2: Frontend Deployment (10 minutes)

### 2.1 Create Production Environment File
First, update your frontend configuration for production:

**Create `/sic_app/.env.production`:**
```bash
# Replace with your actual Render backend URL
VITE_API_URL=https://your-app-name.onrender.com
```

### 2.2 Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) and sign up
2. Click "New Project"
3. Import your GitHub repository
4. **IMPORTANT**: Set Root Directory to `sic_app`
5. Configure these settings:
   - **Project Name**: `duespark-frontend`
   - **Framework Preset**: Vite (should auto-detect)
   - **Root Directory**: `sic_app`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### 2.3 Environment Variables in Vercel
Add this environment variable in Vercel dashboard:
```bash
VITE_API_URL=https://your-backend-app-name.onrender.com
```

### 2.4 Deploy
1. Click "Deploy"
2. Wait 2-3 minutes for build and deployment
3. Your frontend will be available at: `https://your-frontend-name.vercel.app`

### 2.5 Verify Deployment
1. Visit your Vercel URL
2. Try to register/login
3. Check that API calls work (Network tab in browser dev tools)
4. Verify all pages load correctly

---

## Alternative: Manual Git Setup (if needed)

If you don't have GitHub set up yet:

```bash
# Initialize git repository
git init
git add .
git commit -m "Initial production deployment"

# Create GitHub repository and push
gh repo create duespark --public
git remote add origin https://github.com/your-username/duespark.git
git branch -M main
git push -u origin main
```

Then follow the deployment steps above.

---

## Next Steps
After both backend and frontend are deployed, proceed to email configuration.