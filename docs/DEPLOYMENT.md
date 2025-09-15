# Documentation Deployment Guide

This guide explains how to deploy the DueSpark documentation to GitHub Pages with automatic OpenAPI generation.

## Overview

The documentation is built using:
- **Docusaurus** - Static site generator
- **OpenAPI Plugin** - Auto-generates API reference from OpenAPI spec
- **GitHub Actions** - Automated deployment pipeline
- **GitHub Pages** - Free hosting for documentation

## Setup Instructions

### 1. Enable GitHub Pages

1. Go to your repository settings
2. Navigate to "Pages" in the left sidebar
3. Under "Source", select "GitHub Actions"
4. Save the configuration

### 2. Configure Custom Domain (Optional)

If you want to use a custom domain like `docs.duespark.com`:

1. In repository settings → Pages
2. Enter your custom domain: `docs.duespark.com`
3. Check "Enforce HTTPS"
4. Update your DNS records:
   ```
   CNAME docs.duespark.com duespark.github.io
   ```

The CNAME file is already created in `/docs/static/CNAME`.

### 3. Repository Permissions

Ensure the following permissions are set:

1. Go to Settings → Actions → General
2. Under "Workflow permissions":
   - Select "Read and write permissions"
   - Check "Allow GitHub Actions to create and approve pull requests"

### 4. Environment Variables

The workflow automatically handles all necessary configurations. No additional environment variables are needed.

## Deployment Process

### Automatic Deployment

The documentation deploys automatically when:
- Changes are pushed to the `main` branch
- Files in the following paths change:
  - `docs/**` (documentation content)
  - `sic_backend_mvp_jwt_sqlite/generate_openapi.py`
  - `sic_backend_mvp_jwt_sqlite/app/**` (backend API changes)

### Manual Deployment

To trigger a manual deployment:

1. Go to Actions tab in your repository
2. Select "Deploy Documentation to GitHub Pages"
3. Click "Run workflow"
4. Select the branch (usually `main`)
5. Click "Run workflow"

## Deployment Pipeline

The deployment process consists of these steps:

### 1. Generate OpenAPI Specification
```bash
# Runs in sic_backend_mvp_jwt_sqlite directory
python generate_openapi.py
```

This creates `openapi.json` with your complete API specification.

### 2. Build Documentation
```bash
# Runs in docs directory
npm ci
npm run build
```

This builds the static documentation site with:
- All markdown pages
- Auto-generated API reference
- Search functionality
- Responsive design

### 3. Deploy to GitHub Pages
- Uploads build artifacts to GitHub Pages
- Makes the site available at your configured URL

## Local Development

To work on documentation locally:

```bash
cd docs

# Install dependencies
npm install

# Generate latest OpenAPI spec (optional)
cd ../sic_backend_mvp_jwt_sqlite
python generate_openapi.py
cp openapi.json ../docs/static/api/

# Return to docs directory
cd ../docs

# Start development server
npm run start
```

This starts a local server at http://localhost:3000 with hot reloading.

## File Structure

```
docs/
├── docs/                          # Documentation pages
│   ├── overview.md               # Platform overview
│   ├── quickstart.md             # Getting started guide
│   ├── api/                      # API documentation
│   │   ├── index.md             # API overview
│   │   ├── authentication.md    # Auth endpoints
│   │   ├── clients.md           # Client management
│   │   └── invoices.md          # Invoice management
│   └── examples/                 # Code examples
│       ├── index.md             # Examples overview
│       └── basic-setup.md       # Complete setup example
├── static/                       # Static assets
│   ├── api/                     # API specifications
│   │   └── openapi.json        # Auto-generated OpenAPI spec
│   ├── img/                     # Images
│   └── CNAME                    # Custom domain configuration
├── docusaurus.config.ts         # Docusaurus configuration
├── package.json                 # Node.js dependencies
└── sidebars.ts                  # Navigation structure
```

## Customization

### Adding New Pages

1. Create markdown files in `docs/docs/`
2. Update `sidebars.ts` to include in navigation
3. Push to main branch - deploys automatically

### Updating API Documentation

API documentation is automatically generated from your FastAPI backend:

1. Update your FastAPI endpoints
2. Modify `generate_openapi.py` if needed
3. Push changes - new API docs deploy automatically

### Styling and Branding

Customize appearance in `docusaurus.config.ts`:

```typescript
const config: Config = {
  title: 'DueSpark Documentation',
  tagline: 'Invoice management with automated reminders',
  favicon: 'img/favicon.ico',

  themeConfig: {
    navbar: {
      title: 'DueSpark',
      logo: {
        alt: 'DueSpark Logo',
        src: 'img/logo.svg',
      },
      // ... additional config
    }
  }
};
```

## Monitoring

### Deployment Status

Monitor deployments:
- Actions tab shows workflow runs
- Pages settings shows deployment status
- Check the live site URL

### Analytics (Optional)

Add Google Analytics by updating `docusaurus.config.ts`:

```typescript
presets: [
  [
    '@docusaurus/preset-classic',
    {
      gtag: {
        trackingID: 'G-YOUR-TRACKING-ID',
        anonymizeIP: true,
      },
    },
  ],
],
```

## Troubleshooting

### Common Issues

**Build Failures:**
- Check Actions tab for error details
- Ensure all dependencies are correctly installed
- Verify OpenAPI generation works locally

**Broken Links:**
- Use relative paths for internal links
- Check that all referenced files exist
- Test locally before pushing

**Custom Domain Issues:**
- Verify DNS CNAME record
- Check CNAME file in static directory
- Allow time for DNS propagation

**API Documentation Missing:**
- Ensure OpenAPI generation step succeeds
- Check that `openapi.json` is created
- Verify plugin configuration in `docusaurus.config.ts`

### Debug Commands

```bash
# Test OpenAPI generation
cd sic_backend_mvp_jwt_sqlite
python generate_openapi.py

# Test documentation build
cd docs
npm run build

# Check for broken links
npm install -g broken-link-checker
blc http://localhost:3000 --recursive
```

## Support

For deployment issues:
- Check GitHub Actions logs
- Review this deployment guide
- Open an issue in the repository

The documentation site should be automatically available at:
- **GitHub Pages**: https://duespark.github.io/duespark/
- **Custom Domain**: https://docs.duespark.com (if configured)

## Success Indicators

✅ **Successful Deployment:**
- Green checkmark in Actions tab
- Site loads at GitHub Pages URL
- API documentation shows latest endpoints
- All internal links work
- Search functionality works

🚀 **Ready for Production:**
- Custom domain configured and working
- HTTPS enabled
- Analytics tracking (if desired)
- Regular automatic updates from main branch