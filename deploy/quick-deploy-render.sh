#!/bin/bash

# DueSpark Render + Vercel Deployment Script
# This script provides convenient commands for deploying DueSpark to Render and Vercel

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check if git is installed
    if ! command -v git &> /dev/null; then
        log_error "git is not installed."
        exit 1
    fi

    # Check if vercel is installed
    if ! command -v vercel &> /dev/null; then
        log_warning "vercel CLI is not installed. Install with: npm install -g vercel"
    fi

    # Check if we're in a git repository
    if ! git rev-parse --is-inside-work-tree &> /dev/null; then
        log_error "Not in a git repository. Render requires git-based deployment."
        exit 1
    fi

    # Check if main branch exists
    if ! git show-ref --verify --quiet refs/heads/main; then
        log_warning "No 'main' branch found. Render typically deploys from 'main' branch."
    fi

    log_success "Prerequisites check completed"
}

# Setup Render configuration
setup_render() {
    log_info "Setting up Render configuration..."

    # Navigate to project root
    cd "$(dirname "$0")/.."

    # Check if render.yaml exists
    if [ ! -f "render.yaml" ]; then
        log_error "render.yaml not found. Make sure you're in the DueSpark project root."
        exit 1
    fi

    # Validate render.yaml
    log_info "Validating render.yaml configuration..."

    # Basic validation
    if ! grep -q "duespark-backend" render.yaml; then
        log_error "Invalid render.yaml: service name not found"
        exit 1
    fi

    if ! grep -q "duespark-postgres" render.yaml; then
        log_error "Invalid render.yaml: database name not found"
        exit 1
    fi

    log_success "Render configuration validated"
}

# Deploy backend to Render
deploy_backend() {
    log_info "Preparing backend deployment to Render..."

    # Navigate to project root
    cd "$(dirname "$0")/.."

    # Run pre-deployment tests
    log_info "Running backend tests..."
    cd sic_backend_mvp_jwt_sqlite

    if [ -d ".venv" ]; then
        source .venv/bin/activate
    else
        log_warning "Virtual environment not found. Creating one..."
        python -m venv .venv
        source .venv/bin/activate
        pip install -r requirements.txt
    fi

    # Run quick tests
    if pytest tests/ --tb=short -q; then
        log_success "Backend tests passed"
    else
        log_error "Backend tests failed. Fix issues before deploying."
        exit 1
    fi

    cd ..

    # Check git status
    if ! git diff --quiet HEAD; then
        log_warning "You have uncommitted changes. Render deploys from git commits."
        read -p "Do you want to commit and push these changes? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git add .
            git commit -m "Deploy: $(date '+%Y-%m-%d %H:%M:%S')"
            git push origin main
        else
            log_info "Please commit and push your changes, then run this script again."
            exit 1
        fi
    fi

    # Push to trigger deployment
    log_info "Pushing to git to trigger Render deployment..."
    git push origin main

    log_success "Backend deployment initiated!"
    log_info "🔗 Monitor deployment at: https://dashboard.render.com"
    log_info "📊 Once deployed, backend will be available at: https://duespark-backend.onrender.com"
    log_info "📚 API docs will be at: https://duespark-backend.onrender.com/docs"

    # Wait and verify deployment
    log_info "Waiting for deployment to complete (this may take several minutes)..."
    sleep 180  # Wait 3 minutes for initial deployment

    # Try to verify deployment
    if curl -f --max-time 10 https://duespark-backend.onrender.com/healthz &> /dev/null; then
        log_success "Backend deployment successful and healthy!"
    else
        log_warning "Backend deployment may still be in progress or failed."
        log_info "Check the Render dashboard for deployment status."
    fi
}

# Deploy frontend to Vercel
deploy_frontend() {
    log_info "Deploying frontend to Vercel..."

    # Navigate to frontend directory
    cd "$(dirname "$0")/../sic_app"

    # Check if we should use Render-specific config
    if [ -f "vercel.render.json" ]; then
        log_info "Using Render-specific Vercel configuration..."
        cp vercel.render.json vercel.json
    fi

    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        log_info "Installing frontend dependencies..."
        npm ci
    fi

    # Run tests
    log_info "Running frontend tests..."
    if npm run test -- --run; then
        log_success "Frontend tests passed"
    else
        log_error "Frontend tests failed. Fix issues before deploying."
        exit 1
    fi

    # Build project
    log_info "Building frontend..."
    if npm run build; then
        log_success "Frontend build successful"
    else
        log_error "Frontend build failed."
        exit 1
    fi

    # Deploy to Vercel
    if command -v vercel &> /dev/null; then
        log_info "Deploying to Vercel..."
        vercel --prod

        log_success "Frontend deployment successful!"
        log_info "📱 Frontend URL: https://app.duespark.com"
    else
        log_warning "Vercel CLI not available. Alternative deployment options:"
        log_info "1. Push to main branch for automatic deployment (if GitHub integration is set up)"
        log_info "2. Upload dist/ folder to Vercel dashboard manually"
        log_info "3. Install Vercel CLI: npm install -g vercel"
    fi
}

# Setup new environment
setup_environment() {
    log_info "Setting up new DueSpark environment on Render + Vercel..."

    # Navigate to project root
    cd "$(dirname "$0")/.."

    # Setup instructions
    log_info "🏗️  Setting up Render + Vercel deployment..."
    echo ""
    echo "📋 Manual Setup Steps Required:"
    echo ""
    echo "1️⃣  RENDER SETUP:"
    echo "   • Go to https://dashboard.render.com"
    echo "   • Connect your GitHub account"
    echo "   • Import this repository"
    echo "   • Render will auto-detect render.yaml configuration"
    echo ""
    echo "2️⃣  DATABASE SETUP:"
    echo "   • In Render dashboard, create PostgreSQL database:"
    echo "     - Name: duespark-postgres"
    echo "     - Database: duespark"
    echo "     - User: duespark"
    echo "   • Note the connection string for environment variables"
    echo ""
    echo "3️⃣  ENVIRONMENT VARIABLES (Set in Render dashboard):"
    echo "   SECRET_KEY=\"\$(openssl rand -base64 32)\""
    echo "   ENCRYPTION_KEY=\"\$(openssl rand -base64 32)\""
    echo "   STRIPE_SECRET_KEY=\"sk_...\""
    echo "   STRIPE_CLIENT_ID=\"ca_...\""
    echo "   STRIPE_WEBHOOK_SECRET=\"whsec_...\""
    echo "   POSTMARK_SERVER_TOKEN=\"...\""
    echo "   EMAIL_FROM=\"DueSpark <no-reply@yourdomain.com>\""
    echo ""
    echo "4️⃣  VERCEL SETUP:"
    echo "   • Go to https://vercel.com/dashboard"
    echo "   • Import your GitHub repository"
    echo "   • Set framework preset to 'Vite'"
    echo "   • Set root directory to 'sic_app'"
    echo ""
    echo "5️⃣  VERCEL ENVIRONMENT VARIABLES:"
    echo "   VITE_API_BASE_URL=\"https://duespark-backend.onrender.com\""
    echo "   VITE_STRIPE_PUBLISHABLE_KEY=\"pk_...\""
    echo ""

    read -p "Have you completed the manual setup steps above? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_success "✅ Environment setup acknowledged. You can now deploy!"
        echo ""
        log_info "Next steps:"
        echo "  $0 backend     # Deploy backend to Render"
        echo "  $0 frontend    # Deploy frontend to Vercel"
        echo "  $0 full        # Deploy both"
    else
        log_warning "Please complete the setup steps above before deploying."
        exit 1
    fi
}

# Full deployment (backend + frontend)
deploy_full() {
    log_info "Starting full DueSpark deployment (Render + Vercel)..."

    deploy_backend
    sleep 30  # Wait between deployments
    deploy_frontend

    # Run post-deployment tests
    log_info "Running post-deployment validation..."

    # Basic health checks
    log_info "Testing backend health..."
    if curl -f --max-time 10 https://duespark-backend.onrender.com/healthz &> /dev/null; then
        log_success "Backend health check passed"
    else
        log_warning "Backend health check failed or still starting up"
    fi

    log_info "Testing frontend accessibility..."
    if curl -f --max-time 10 https://app.duespark.com &> /dev/null; then
        log_success "Frontend health check passed"
    else
        log_warning "Frontend health check failed"
    fi

    log_success "🎉 Full deployment completed!"
    echo ""
    log_info "🚀 DueSpark is now live!"
    log_info "📱 Frontend: https://app.duespark.com"
    log_info "🔗 Backend: https://duespark-backend.onrender.com"
    log_info "📚 API Docs: https://duespark-backend.onrender.com/docs"
    echo ""
    log_info "📊 Monitor your services:"
    log_info "   • Render Dashboard: https://dashboard.render.com"
    log_info "   • Vercel Dashboard: https://vercel.com/dashboard"
}

# Check deployment status
check_status() {
    log_info "Checking DueSpark deployment status..."

    # Backend health check
    log_info "Backend status:"
    if curl -f --max-time 10 https://duespark-backend.onrender.com/healthz &> /dev/null; then
        log_success "Backend: Healthy ✅"

        # Get additional info if possible
        BACKEND_RESPONSE=$(curl -s --max-time 5 https://duespark-backend.onrender.com/healthz 2>/dev/null)
        if [ $? -eq 0 ]; then
            echo "   Response: $BACKEND_RESPONSE"
        fi
    else
        log_error "Backend: Unhealthy or unreachable ❌"
        log_info "Check Render dashboard: https://dashboard.render.com"
    fi

    # Frontend health check
    log_info "Frontend status:"
    if curl -f --max-time 10 https://app.duespark.com &> /dev/null; then
        log_success "Frontend: Healthy ✅"
    else
        log_error "Frontend: Unhealthy or unreachable ❌"
        log_info "Check Vercel dashboard: https://vercel.com/dashboard"
    fi

    # API connectivity test
    log_info "API connectivity from frontend:"
    if curl -f --max-time 10 https://app.duespark.com/api/healthz &> /dev/null; then
        log_success "Frontend → Backend: Connected ✅"
    else
        log_warning "Frontend → Backend: Connection issues ⚠️"
    fi

    # Database connectivity (indirect test)
    log_info "Testing API endpoints (indicates DB connectivity):"
    if curl -f --max-time 10 https://duespark-backend.onrender.com/docs &> /dev/null; then
        log_success "API Documentation: Available ✅"
    else
        log_warning "API Documentation: Unavailable ⚠️"
    fi

    log_info "📊 For detailed monitoring:"
    log_info "   • Render: https://dashboard.render.com"
    log_info "   • Vercel: https://vercel.com/dashboard"
}

# Show deployment logs
show_logs() {
    log_info "For deployment logs, visit:"
    log_info "🔗 Render Logs: https://dashboard.render.com (go to your service → Logs tab)"
    log_info "🔗 Vercel Logs: https://vercel.com/dashboard (go to your project → Functions tab)"
    echo ""
    log_info "📱 Real-time monitoring:"
    echo "   watch -n 10 'curl -s https://duespark-backend.onrender.com/healthz'"
}

# Usage information
show_usage() {
    echo "DueSpark Render + Vercel Deployment Script"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  setup       Setup new environment (instructions for Render + Vercel)"
    echo "  backend     Deploy backend to Render"
    echo "  frontend    Deploy frontend to Vercel"
    echo "  full        Deploy both backend and frontend"
    echo "  status      Check current deployment status"
    echo "  logs        Show how to access deployment logs"
    echo "  help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 setup           # First-time environment setup instructions"
    echo "  $0 full            # Deploy everything"
    echo "  $0 backend         # Deploy backend only"
    echo "  $0 status          # Check if everything is running"
    echo ""
    echo "Platform URLs:"
    echo "  Backend:  https://duespark-backend.onrender.com"
    echo "  Frontend: https://app.duespark.com"
    echo ""
    echo "Dashboards:"
    echo "  Render:   https://dashboard.render.com"
    echo "  Vercel:   https://vercel.com/dashboard"
    echo ""
    echo "For detailed documentation, see:"
    echo "  deploy/render-deployment-guide.md"
    echo "  deploy/vercel-deployment-guide.md"
}

# Main script logic
main() {
    case "${1:-help}" in
        "setup")
            check_prerequisites
            setup_render
            setup_environment
            ;;
        "backend")
            check_prerequisites
            setup_render
            deploy_backend
            ;;
        "frontend")
            check_prerequisites
            deploy_frontend
            ;;
        "full")
            check_prerequisites
            setup_render
            deploy_full
            ;;
        "status")
            check_status
            ;;
        "logs")
            show_logs
            ;;
        "help"|*)
            show_usage
            ;;
    esac
}

# Run main function with all arguments
main "$@"