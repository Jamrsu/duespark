# DueSpark Frontend Deployment Guide - Vercel

## 🚀 Prerequisites

1. **Vercel Account**
   - Sign up at https://vercel.com
   - Connect your GitHub account

2. **Domain Setup** (Optional)
   - Purchase domain (e.g., duespark.com)
   - Configure DNS to point to Vercel

3. **Backend Deployed**
   - Ensure DueSpark backend is deployed on Fly.io
   - Note the backend URL (e.g., https://duespark-backend.fly.dev)

## 📦 Project Configuration

### 1. Prepare Repository
```bash
# Ensure the frontend code is in the correct directory
cd /path/to/duespark/sic_app

# Install dependencies
npm install

# Test build locally
npm run build
npm run preview
```

### 2. Vercel CLI Setup (Optional)
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Link project (from sic_app directory)
vercel link
```

## 🔧 Environment Variables Configuration

### 1. Production Environment Variables
Set these in Vercel Dashboard (Settings → Environment Variables):

**Required Variables:**
```bash
# API Configuration
VITE_API_BASE_URL=https://duespark-backend.fly.dev
VITE_APP_URL=https://app.duespark.com

# Application Configuration
VITE_APP_NAME=DueSpark
VITE_APP_ENV=production
VITE_APP_VERSION=1.0.0

# Feature Flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_PWA=true
VITE_ENABLE_NOTIFICATIONS=true
VITE_ENABLE_OFFLINE_MODE=true
```

**Optional Variables:**
```bash
# External Services
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_SENTRY_DSN=https://...@sentry.io/...

# Performance Monitoring
VITE_ENABLE_PERFORMANCE_MONITORING=true
VITE_LOG_LEVEL=error

# SEO & Social
VITE_APP_DESCRIPTION="Get paid on time with smart invoice reminders"
VITE_CONTACT_EMAIL=support@duespark.com
VITE_SUPPORT_URL=https://help.duespark.com
```

### 2. Environment-Specific Variables

**Production Environment:**
- Set all variables for production use
- Use live API endpoints
- Enable all production features

**Preview Environment:**
- Use staging API endpoints
- Enable debug features
- Test new features

**Development Environment:**
- Use local API endpoints
- Enable all debug features
- Disable analytics

## 🚀 Deployment Methods

### Method 1: GitHub Integration (Recommended)

1. **Connect Repository**
   - Go to Vercel Dashboard
   - Click "New Project"
   - Import your GitHub repository
   - Select the `sic_app` directory as the root

2. **Configure Build Settings**
   ```
   Framework Preset: Vite
   Root Directory: sic_app
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm ci
   Development Command: npm run dev
   ```

3. **Deploy**
   - Vercel will automatically deploy on every push to main branch
   - Preview deployments for pull requests

### Method 2: Vercel CLI

```bash
# From sic_app directory
cd sic_app

# Deploy to production
vercel --prod

# Deploy preview
vercel
```

### Method 3: Manual Upload

```bash
# Build locally
npm run build

# Upload dist folder via Vercel dashboard
# Go to Vercel Dashboard → New Project → Upload folder
```

## 🌐 Custom Domain Configuration

### 1. Add Domain to Vercel
```bash
# Via CLI
vercel domains add duespark.com
vercel domains add app.duespark.com

# Via Dashboard
# Go to Project Settings → Domains
# Add your custom domains
```

### 2. DNS Configuration
Configure your DNS provider with these records:

```dns
# A Records (or CNAME to 76.76.19.19)
app.duespark.com    A    76.76.19.19

# Or use CNAME
app.duespark.com    CNAME    cname.vercel-dns.com

# Optional: Redirect apex domain
duespark.com        A    76.76.19.19
```

### 3. SSL Certificate
- Vercel automatically provisions SSL certificates
- Certificates auto-renew
- Custom certificates supported for Enterprise plans

## 🔍 Post-Deployment Verification

### 1. Functional Testing
```bash
# Test main application
curl -I https://app.duespark.com

# Test API connectivity
curl https://app.duespark.com/api/healthz

# Test PWA manifest
curl https://app.duespark.com/manifest.json
```

### 2. Performance Testing
```bash
# Install Lighthouse CLI
npm install -g lighthouse

# Run performance audit
lighthouse https://app.duespark.com --output=json --output-path=./lighthouse-report.json

# Check Core Web Vitals
lighthouse https://app.duespark.com --only-categories=performance
```

### 3. PWA Testing
- Test offline functionality
- Verify service worker registration
- Test app installation prompt
- Verify push notifications (if implemented)

## 📊 Monitoring & Analytics

### 1. Vercel Analytics
```bash
# Enable Vercel Analytics in dashboard
# Add to your app (if not already included):
npm install @vercel/analytics

# In your main.tsx:
import { Analytics } from '@vercel/analytics/react'

function App() {
  return (
    <>
      <YourApp />
      <Analytics />
    </>
  )
}
```

### 2. Performance Monitoring
```bash
# Web Vitals reporting
npm install web-vitals

# Custom performance tracking (already implemented)
# Check src/hooks/usePerformanceMonitoring.ts
```

### 3. Error Tracking (Optional)
```bash
# Sentry integration
npm install @sentry/react @sentry/tracing

# Configure in main.tsx:
import * as Sentry from "@sentry/react"

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.VITE_APP_ENV,
})
```

## 🔄 CI/CD Pipeline

### GitHub Actions Integration
Create `.github/workflows/deploy-frontend.yml`:

```yaml
name: Deploy Frontend to Vercel

on:
  push:
    branches: [main]
    paths: ['sic_app/**']
  pull_request:
    branches: [main]
    paths: ['sic_app/**']

env:
  VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: sic_app/package-lock.json

      - name: Install dependencies
        run: cd sic_app && npm ci

      - name: Run tests
        run: cd sic_app && npm run test

      - name: Build project
        run: cd sic_app && npm run build

      - name: Install Vercel CLI
        run: npm install --global vercel@latest

      - name: Pull Vercel Environment Information
        run: cd sic_app && vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}

      - name: Build Project Artifacts
        run: cd sic_app && vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}

      - name: Deploy Project Artifacts to Vercel
        run: cd sic_app && vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
```

### Required GitHub Secrets
```bash
# Get these from Vercel dashboard
VERCEL_ORG_ID=team_...
VERCEL_PROJECT_ID=prj_...
VERCEL_TOKEN=...
```

## 🔧 Troubleshooting

### Common Issues

**1. Build Failures**
```bash
# Check build logs in Vercel dashboard
# Common causes:
# - Missing environment variables
# - TypeScript errors
# - Import path issues

# Debug locally:
cd sic_app
npm run build
npm run type-check
npm run lint
```

**2. Runtime Errors**
```bash
# Check browser console
# Check Vercel function logs
# Verify environment variables are set

# Test API connectivity:
curl https://app.duespark.com/api/healthz
```

**3. PWA Issues**
```bash
# Check service worker registration
# Verify manifest.json is accessible
# Check HTTPS configuration

# Debug service worker:
# Open DevTools → Application → Service Workers
```

**4. Performance Issues**
```bash
# Run Lighthouse audit
lighthouse https://app.duespark.com

# Check bundle size
cd sic_app
npm run analyze

# Optimize images and assets
# Enable compression in vercel.json
```

### Performance Optimization

**1. Bundle Optimization**
```javascript
// vite.config.ts optimization
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          query: ['@tanstack/react-query'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
})
```

**2. Image Optimization**
```bash
# Use Vercel Image Optimization
# Convert images to WebP/AVIF
# Implement lazy loading
```

## 🔒 Security Considerations

### 1. Environment Variables Security
- Never commit `.env` files with secrets
- Use Vercel's encrypted environment variables
- Rotate API keys regularly
- Use different keys for preview/production

### 2. Content Security Policy
```javascript
// Add to vercel.json headers
{
  "key": "Content-Security-Policy",
  "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://duespark-backend.fly.dev"
}
```

### 3. API Security
- Ensure CORS is properly configured on backend
- Use HTTPS everywhere
- Validate all user inputs
- Implement rate limiting

## 📈 Scaling Considerations

### 1. CDN Configuration
- Vercel's global CDN is automatically configured
- Optimize cache headers for static assets
- Use appropriate cache strategies

### 2. Performance Budgets
```javascript
// Set performance budgets in CI/CD
{
  "budgets": [
    {
      "type": "bundle",
      "name": "main",
      "maximumWarning": "500kb",
      "maximumError": "1mb"
    }
  ]
}
```

### 3. Monitoring & Alerts
- Set up Vercel alerts for deployment failures
- Monitor Core Web Vitals scores
- Track error rates and user experience

---

## 📞 Support Resources

- **Vercel Documentation**: https://vercel.com/docs
- **Vercel Community**: https://github.com/vercel/vercel/discussions
- **DueSpark Issues**: Project issue tracker
- **Performance Guidelines**: https://web.dev/vitals/