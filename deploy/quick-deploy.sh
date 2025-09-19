#!/bin/bash

# DueSpark Quick Deployment Script
# This script provides convenient commands for deploying DueSpark components

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

    # Check if flyctl is installed
    if ! command -v flyctl &> /dev/null; then
        log_error "flyctl is not installed. Install from: https://fly.io/docs/getting-started/installing-flyctl/"
        exit 1
    fi

    # Check if vercel is installed
    if ! command -v vercel &> /dev/null; then
        log_warning "vercel CLI is not installed. Install with: npm install -g vercel"
    fi

    # Check if user is authenticated with Fly.io
    if ! flyctl auth whoami &> /dev/null; then
        log_error "Not authenticated with Fly.io. Run: flyctl auth login"
        exit 1
    fi

    log_success "Prerequisites check completed"
}

# Deploy backend to Fly.io
deploy_backend() {
    log_info "Deploying backend to Fly.io..."

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
    pytest tests/ --tb=short -q || {
        log_error "Backend tests failed. Fix issues before deploying."
        exit 1
    }

    cd ..

    # Deploy to Fly.io
    log_info "Deploying to Fly.io..."
    flyctl deploy --dockerfile sic_backend_mvp_jwt_sqlite/Dockerfile.production

    # Verify deployment
    log_info "Verifying deployment..."
    sleep 30  # Wait for deployment to stabilize

    if curl -f https://duespark-backend.fly.dev/healthz &> /dev/null; then
        log_success "Backend deployment successful!"
        log_info "Backend URL: https://duespark-backend.fly.dev"
        log_info "API Docs: https://duespark-backend.fly.dev/docs"
    else
        log_error "Backend health check failed. Check logs with: flyctl logs"
        exit 1
    fi
}

# Deploy frontend to Vercel
deploy_frontend() {
    log_info "Deploying frontend to Vercel..."

    # Navigate to frontend directory
    cd "$(dirname "$0")/../sic_app"

    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        log_info "Installing frontend dependencies..."
        npm ci
    fi

    # Run tests
    log_info "Running frontend tests..."
    npm run test -- --run || {
        log_error "Frontend tests failed. Fix issues before deploying."
        exit 1
    }

    # Build project
    log_info "Building frontend..."
    npm run build || {
        log_error "Frontend build failed."
        exit 1
    }

    # Deploy to Vercel
    if command -v vercel &> /dev/null; then
        log_info "Deploying to Vercel..."
        vercel --prod

        log_success "Frontend deployment successful!"
        log_info "Frontend URL: https://app.duespark.com"
    else
        log_warning "Vercel CLI not available. Please deploy manually:"
        log_info "1. Push to main branch for automatic deployment"
        log_info "2. Or upload dist/ folder to Vercel dashboard"
    fi
}

# Setup new environment
setup_environment() {
    log_info "Setting up new DueSpark environment..."

    # Navigate to project root
    cd "$(dirname "$0")/.."

    # Create PostgreSQL database
    log_info "Creating PostgreSQL database..."
    flyctl postgres create \
        --name duespark-db \
        --region iad \
        --initial-cluster-size 1 \
        --volume-size 10 \
        --vm-size shared-cpu-1x

    # Launch Fly.io app
    log_info "Initializing Fly.io app..."
    flyctl launch --no-deploy

    # Attach database
    log_info "Attaching database to app..."
    flyctl postgres attach duespark-db --app duespark-backend

    # Set required secrets
    log_info "Setting up secrets..."
    log_warning "You'll need to set the following secrets manually:"
    echo "flyctl secrets set SECRET_KEY=\"\$(openssl rand -base64 32)\""
    echo "flyctl secrets set STRIPE_SECRET_KEY=\"sk_...\""
    echo "flyctl secrets set POSTMARK_SERVER_TOKEN=\"...\""
    echo "flyctl secrets set EMAIL_FROM=\"DueSpark <no-reply@yourdomain.com>\""

    log_success "Environment setup completed. Set secrets and deploy with: $0 backend"
}

# Full deployment (backend + frontend)
deploy_full() {
    log_info "Starting full DueSpark deployment..."

    deploy_backend
    deploy_frontend

    # Run post-deployment tests
    log_info "Running post-deployment validation..."

    # Basic health checks
    if curl -f https://duespark-backend.fly.dev/healthz &> /dev/null; then
        log_success "Backend health check passed"
    else
        log_error "Backend health check failed"
    fi

    if curl -f https://app.duespark.com &> /dev/null; then
        log_success "Frontend health check passed"
    else
        log_error "Frontend health check failed"
    fi

    log_success "Full deployment completed!"
    log_info "🚀 DueSpark is now live!"
    log_info "📱 Frontend: https://app.duespark.com"
    log_info "🔗 Backend: https://duespark-backend.fly.dev"
    log_info "📚 API Docs: https://duespark-backend.fly.dev/docs"
}

# Rollback deployment
rollback_deployment() {
    log_warning "Rolling back deployment..."

    # Rollback backend
    log_info "Rolling back backend..."
    flyctl releases rollback

    # Rollback frontend (if using Vercel CLI)
    if command -v vercel &> /dev/null; then
        log_info "Rolling back frontend..."
        cd "$(dirname "$0")/../sic_app"
        # Vercel doesn't have a direct rollback command, but you can redeploy previous version
        log_warning "Frontend rollback requires manual action in Vercel dashboard"
    fi

    log_success "Rollback completed"
}

# Status check
check_status() {
    log_info "Checking DueSpark status..."

    # Backend status
    log_info "Backend status:"
    flyctl status || log_error "Failed to get backend status"

    # Database status
    log_info "Database status:"
    flyctl postgres info -a duespark-db || log_error "Failed to get database status"

    # Health checks
    log_info "Health checks:"
    if curl -f https://duespark-backend.fly.dev/healthz &> /dev/null; then
        log_success "Backend: Healthy"
    else
        log_error "Backend: Unhealthy"
    fi

    if curl -f https://app.duespark.com &> /dev/null; then
        log_success "Frontend: Healthy"
    else
        log_error "Frontend: Unhealthy"
    fi
}

# Show logs
show_logs() {
    log_info "Showing recent logs..."

    echo "=== Backend Logs ==="
    flyctl logs --app duespark-backend | tail -50

    echo "=== Database Logs ==="
    flyctl postgres logs -a duespark-db | tail -20
}

# Usage information
show_usage() {
    echo "DueSpark Deployment Script"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  setup       Setup new environment (database, secrets, etc.)"
    echo "  backend     Deploy backend only"
    echo "  frontend    Deploy frontend only"
    echo "  full        Deploy both backend and frontend"
    echo "  rollback    Rollback latest deployment"
    echo "  status      Check current deployment status"
    echo "  logs        Show recent application logs"
    echo "  help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 setup           # First-time environment setup"
    echo "  $0 full            # Deploy everything"
    echo "  $0 backend         # Deploy backend only"
    echo "  $0 status          # Check if everything is running"
    echo ""
    echo "For detailed documentation, see:"
    echo "  deploy/flyio-deployment-guide.md"
    echo "  deploy/vercel-deployment-guide.md"
}

# Main script logic
main() {
    case "${1:-help}" in
        "setup")
            check_prerequisites
            setup_environment
            ;;
        "backend")
            check_prerequisites
            deploy_backend
            ;;
        "frontend")
            check_prerequisites
            deploy_frontend
            ;;
        "full")
            check_prerequisites
            deploy_full
            ;;
        "rollback")
            check_prerequisites
            rollback_deployment
            ;;
        "status")
            check_prerequisites
            check_status
            ;;
        "logs")
            check_prerequisites
            show_logs
            ;;
        "help"|*)
            show_usage
            ;;
    esac
}

# Run main function with all arguments
main "$@"