#!/bin/bash
set -euo pipefail

# Production Deployment Script with Validation and Rollback
# Usage: ./scripts/deploy.sh [environment] [rollback_version]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT="${1:-staging}"
ROLLBACK_VERSION="${2:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $*"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✅${NC} $*"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️${NC} $*"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌${NC} $*"
}

# Configuration
DOCKER_REGISTRY="${DOCKER_REGISTRY:-localhost:5000}"
IMAGE_NAME="duespark-backend"
SERVICE_NAME="duespark-backend"
DEPLOYMENT_LOG="$PROJECT_ROOT/deployment.log"

# Create deployment log
exec 1> >(tee -a "$DEPLOYMENT_LOG")
exec 2> >(tee -a "$DEPLOYMENT_LOG" >&2)

log "Starting deployment to $ENVIRONMENT environment"

# Validate environment
validate_environment() {
    log "Validating environment configuration..."

    case "$ENVIRONMENT" in
        staging|production)
            ;;
        *)
            error "Invalid environment: $ENVIRONMENT"
            error "Supported environments: staging, production"
            exit 1
            ;;
    esac

    # Check required environment files
    ENV_FILE="$PROJECT_ROOT/.env.$ENVIRONMENT"
    if [[ ! -f "$ENV_FILE" ]]; then
        error "Environment file not found: $ENV_FILE"
        exit 1
    fi

    # Validate critical environment variables
    source "$ENV_FILE"

    if [[ -z "${SECRET_KEY:-}" ]]; then
        error "SECRET_KEY not set in $ENV_FILE"
        exit 1
    fi

    if [[ ${#SECRET_KEY} -lt 32 ]]; then
        error "SECRET_KEY too short (must be at least 32 characters)"
        exit 1
    fi

    if [[ -z "${DATABASE_URL:-}" ]]; then
        error "DATABASE_URL not set in $ENV_FILE"
        exit 1
    fi

    success "Environment validation passed"
}

# Pre-deployment checks
pre_deployment_checks() {
    log "Running pre-deployment checks..."

    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        error "Docker is not running"
        exit 1
    fi

    # Check if required tools are available
    for tool in docker docker-compose; do
        if ! command -v "$tool" &> /dev/null; then
            error "$tool is not installed"
            exit 1
        fi
    done

    # Verify we're on the correct branch for production
    if [[ "$ENVIRONMENT" == "production" ]]; then
        CURRENT_BRANCH=$(git branch --show-current)
        if [[ "$CURRENT_BRANCH" != "main" ]]; then
            error "Production deployments must be from main branch (currently on $CURRENT_BRANCH)"
            exit 1
        fi

        # Check for uncommitted changes
        if [[ -n $(git status --porcelain) ]]; then
            error "Uncommitted changes detected. Commit or stash changes before deploying to production"
            exit 1
        fi
    fi

    success "Pre-deployment checks passed"
}

# Build and tag images
build_images() {
    log "Building Docker images..."

    # Generate version tag
    VERSION_TAG="${VERSION_TAG:-$(date +%Y%m%d-%H%M%S)-$(git rev-parse --short HEAD)}"

    # Build backend image
    log "Building backend image..."
    docker build \
        -t "$DOCKER_REGISTRY/$IMAGE_NAME:$VERSION_TAG" \
        -t "$DOCKER_REGISTRY/$IMAGE_NAME:latest" \
        "$PROJECT_ROOT/sic_backend_mvp_jwt_sqlite"

    # Push to registry if configured
    if [[ "$DOCKER_REGISTRY" != "localhost:5000" ]]; then
        log "Pushing images to registry..."
        docker push "$DOCKER_REGISTRY/$IMAGE_NAME:$VERSION_TAG"
        docker push "$DOCKER_REGISTRY/$IMAGE_NAME:latest"
    fi

    success "Images built and tagged: $VERSION_TAG"
    echo "$VERSION_TAG" > "$PROJECT_ROOT/.last_deployment_version"
}

# Database migration with backup
run_migrations() {
    log "Running database migrations..."

    # Create backup before migrations
    if [[ "$ENVIRONMENT" == "production" ]]; then
        log "Creating database backup before migration..."
        docker-compose -f "$PROJECT_ROOT/docker-compose.$ENVIRONMENT.yml" exec -T db \
            pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" | \
            gzip > "$PROJECT_ROOT/backup-pre-migration-$(date +%Y%m%d-%H%M%S).sql.gz"
        success "Database backup created"
    fi

    # Run migrations
    docker-compose -f "$PROJECT_ROOT/docker-compose.$ENVIRONMENT.yml" exec -T backend \
        alembic upgrade head

    success "Database migrations completed"
}

# Health checks
health_check() {
    local url="$1"
    local max_attempts=30
    local attempt=1

    log "Running health checks against $url..."

    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s "$url/health" > /dev/null; then
            success "Health check passed (attempt $attempt)"
            return 0
        fi

        warning "Health check failed (attempt $attempt/$max_attempts)"
        sleep 10
        ((attempt++))
    done

    error "Health check failed after $max_attempts attempts"
    return 1
}

# Comprehensive service validation
validate_deployment() {
    log "Validating deployment..."

    # Get service URL
    case "$ENVIRONMENT" in
        staging)
            SERVICE_URL="${STAGING_URL:-http://localhost:8001}"
            ;;
        production)
            SERVICE_URL="${PRODUCTION_URL:-http://localhost:8000}"
            ;;
    esac

    # Basic health check
    if ! health_check "$SERVICE_URL"; then
        error "Basic health check failed"
        return 1
    fi

    # Detailed health check
    log "Running detailed health checks..."
    HEALTH_RESPONSE=$(curl -s "$SERVICE_URL/health/detailed" || echo "failed")

    if [[ "$HEALTH_RESPONSE" == "failed" ]]; then
        error "Detailed health check failed"
        return 1
    fi

    # Check if any components are unhealthy
    if echo "$HEALTH_RESPONSE" | jq -e '.components | to_entries[] | select(.value.status == "unhealthy")' > /dev/null 2>&1; then
        warning "Some components are unhealthy:"
        echo "$HEALTH_RESPONSE" | jq '.components | to_entries[] | select(.value.status == "unhealthy")'

        # In production, this should fail the deployment
        if [[ "$ENVIRONMENT" == "production" ]]; then
            error "Unhealthy components detected in production deployment"
            return 1
        fi
    fi

    # Test critical endpoints
    log "Testing critical endpoints..."

    # Test authentication endpoint
    if ! curl -f -s "$SERVICE_URL/docs" > /dev/null; then
        error "API documentation endpoint is not accessible"
        return 1
    fi

    # Test metrics endpoint
    if ! curl -f -s "$SERVICE_URL/metrics" > /dev/null; then
        warning "Metrics endpoint is not accessible"
    fi

    success "Deployment validation passed"
}

# Rollback function
rollback() {
    local rollback_version="$1"

    error "Rolling back to version: $rollback_version"

    # Stop current services
    docker-compose -f "$PROJECT_ROOT/docker-compose.$ENVIRONMENT.yml" down

    # Update image tags to rollback version
    sed -i.bak "s|$DOCKER_REGISTRY/$IMAGE_NAME:.*|$DOCKER_REGISTRY/$IMAGE_NAME:$rollback_version|g" \
        "$PROJECT_ROOT/docker-compose.$ENVIRONMENT.yml"

    # Start services with rollback version
    docker-compose -f "$PROJECT_ROOT/docker-compose.$ENVIRONMENT.yml" up -d

    # Validate rollback
    sleep 30
    if validate_deployment; then
        success "Rollback to $rollback_version completed successfully"

        # Send alert about rollback
        curl -X POST "${SLACK_WEBHOOK_URL:-}" \
            -H 'Content-type: application/json' \
            --data "{\"text\":\"🔄 DueSpark $ENVIRONMENT rolled back to version $rollback_version\"}" \
            > /dev/null 2>&1 || true
    else
        error "Rollback validation failed"
        exit 1
    fi
}

# Main deployment function
deploy() {
    log "Starting deployment process..."

    # Validate environment
    validate_environment

    # Pre-deployment checks
    pre_deployment_checks

    # Build images
    build_images

    # Get current version for potential rollback
    PREVIOUS_VERSION=""
    if [[ -f "$PROJECT_ROOT/.last_deployment_version" ]]; then
        PREVIOUS_VERSION=$(cat "$PROJECT_ROOT/.last_deployment_version")
    fi

    # Deploy services
    log "Deploying services..."

    # Update docker-compose file with new image tag
    sed -i.bak "s|$DOCKER_REGISTRY/$IMAGE_NAME:.*|$DOCKER_REGISTRY/$IMAGE_NAME:$VERSION_TAG|g" \
        "$PROJECT_ROOT/docker-compose.$ENVIRONMENT.yml"

    # Deploy with zero-downtime strategy
    if [[ "$ENVIRONMENT" == "production" ]]; then
        # Blue-green deployment simulation
        log "Performing blue-green deployment..."

        # Start new version alongside current
        docker-compose -f "$PROJECT_ROOT/docker-compose.$ENVIRONMENT.yml" up -d --scale backend=2

        # Wait for new instance to be healthy
        sleep 30

        # Scale down old instance
        docker-compose -f "$PROJECT_ROOT/docker-compose.$ENVIRONMENT.yml" up -d --scale backend=1
    else
        # Simple deployment for staging
        docker-compose -f "$PROJECT_ROOT/docker-compose.$ENVIRONMENT.yml" up -d
    fi

    # Run database migrations
    run_migrations

    # Validate deployment
    if ! validate_deployment; then
        error "Deployment validation failed"

        if [[ -n "$PREVIOUS_VERSION" ]]; then
            warning "Attempting automatic rollback to $PREVIOUS_VERSION"
            rollback "$PREVIOUS_VERSION"
        else
            error "No previous version available for rollback"
            exit 1
        fi
    fi

    success "Deployment completed successfully!"

    # Send success notification
    curl -X POST "${SLACK_WEBHOOK_URL:-}" \
        -H 'Content-type: application/json' \
        --data "{\"text\":\"🚀 DueSpark $ENVIRONMENT deployed successfully - Version: $VERSION_TAG\"}" \
        > /dev/null 2>&1 || true

    # Update last successful deployment
    echo "$VERSION_TAG" > "$PROJECT_ROOT/.last_successful_deployment"
}

# Handle rollback if version specified
if [[ -n "$ROLLBACK_VERSION" ]]; then
    log "Rollback requested to version: $ROLLBACK_VERSION"
    validate_environment
    rollback "$ROLLBACK_VERSION"
    exit 0
fi

# Main deployment
deploy

log "Deployment process completed"