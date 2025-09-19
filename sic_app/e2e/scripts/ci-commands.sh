#!/bin/bash

# DueSpark E2E Test CI/CD Commands
# Usage: ./e2e/scripts/ci-commands.sh [command]

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

# Check if backend is running
check_backend() {
    log_info "Checking if backend is running..."

    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if curl -f --silent --max-time 5 "${BACKEND_URL:-http://localhost:8005}/healthz" > /dev/null; then
            log_success "Backend is running"
            return 0
        fi

        log_info "Attempt $attempt/$max_attempts: Backend not ready, waiting..."
        sleep 2
        attempt=$((attempt + 1))
    done

    log_error "Backend is not responding after $max_attempts attempts"
    return 1
}

# Check if frontend is running
check_frontend() {
    log_info "Checking if frontend is running..."

    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if curl -f --silent --max-time 5 "${FRONTEND_URL:-http://localhost:5173}" > /dev/null; then
            log_success "Frontend is running"
            return 0
        fi

        log_info "Attempt $attempt/$max_attempts: Frontend not ready, waiting..."
        sleep 2
        attempt=$((attempt + 1))
    done

    log_error "Frontend is not responding after $max_attempts attempts"
    return 1
}

# Install dependencies
install_deps() {
    log_info "Installing dependencies..."

    npm ci

    # Install Playwright browsers if not in CI
    if [ -z "$CI" ]; then
        npx playwright install --with-deps chromium
    else
        npx playwright install chromium
    fi

    log_success "Dependencies installed"
}

# Run E2E tests
run_tests() {
    local test_type="${1:-all}"
    local browser="${2:-chromium}"
    local headed="${3:-false}"

    log_info "Running E2E tests (type: $test_type, browser: $browser, headed: $headed)"

    # Set environment variables
    export PLAYWRIGHT_BASE_URL="${FRONTEND_URL:-http://localhost:5173}"
    export API_BASE_URL="${BACKEND_URL:-http://localhost:8005}"

    local cmd="npx playwright test"

    # Add browser filter
    if [ "$browser" != "all" ]; then
        cmd="$cmd --project=$browser"
    fi

    # Add test filter
    case $test_type in
        "happy-path")
            cmd="$cmd happy-path.spec.ts"
            ;;
        "critical")
            cmd="$cmd critical-flows.spec.ts"
            ;;
        "auth")
            cmd="$cmd auth.spec.ts"
            ;;
        "mobile")
            cmd="$cmd mobile-navigation.spec.ts happy-path.spec.ts"
            ;;
        "smoke")
            cmd="$cmd --grep '@smoke'"
            ;;
        *)
            # Run all tests
            ;;
    esac

    # Add headed mode for local development
    if [ "$headed" = "true" ]; then
        cmd="$cmd --headed"
    fi

    # Add debug options for CI
    if [ -n "$CI" ]; then
        cmd="$cmd --reporter=github"
    else
        cmd="$cmd --reporter=html"
    fi

    log_info "Executing: $cmd"
    eval $cmd

    log_success "E2E tests completed"
}

# Run tests with retry
run_tests_with_retry() {
    local retries="${RETRY_COUNT:-2}"
    local attempt=1

    while [ $attempt -le $((retries + 1)) ]; do
        log_info "Test attempt $attempt/$((retries + 1))"

        if run_tests "$@"; then
            log_success "Tests passed on attempt $attempt"
            return 0
        else
            if [ $attempt -le $retries ]; then
                log_warning "Tests failed on attempt $attempt, retrying..."
                sleep 5
            else
                log_error "Tests failed after $((retries + 1)) attempts"
                return 1
            fi
        fi

        attempt=$((attempt + 1))
    done
}

# Start services for testing
start_services() {
    log_info "Starting services for E2E testing..."

    # Start backend in background
    if [ -z "$SKIP_BACKEND_START" ]; then
        log_info "Starting backend..."
        cd ../sic_backend_mvp_jwt_sqlite

        # Set test environment
        export DATABASE_URL="sqlite:///./test_e2e.db"
        export SECRET_KEY="test-secret-key-for-e2e-testing"
        export ENCRYPTION_KEY="test-encryption-key-for-e2e"

        # Start backend
        python -m uvicorn app.main:app --host 0.0.0.0 --port 8005 &
        BACKEND_PID=$!

        cd ../sic_app

        # Wait for backend
        if ! check_backend; then
            log_error "Backend failed to start"
            return 1
        fi
    fi

    # Start frontend in background
    if [ -z "$SKIP_FRONTEND_START" ]; then
        log_info "Starting frontend..."

        # Set test environment
        export VITE_API_BASE_URL="http://localhost:8005"
        export VITE_APP_ENV="test"

        # Start frontend
        npm run dev &
        FRONTEND_PID=$!

        # Wait for frontend
        if ! check_frontend; then
            log_error "Frontend failed to start"
            return 1
        fi
    fi

    log_success "Services started successfully"
}

# Stop services
stop_services() {
    log_info "Stopping services..."

    if [ -n "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
        log_info "Backend stopped"
    fi

    if [ -n "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
        log_info "Frontend stopped"
    fi

    # Kill any remaining processes
    pkill -f "uvicorn app.main:app" 2>/dev/null || true
    pkill -f "vite" 2>/dev/null || true

    log_success "Services stopped"
}

# Cleanup function
cleanup() {
    log_info "Cleaning up..."
    stop_services

    # Remove test database
    rm -f ../sic_backend_mvp_jwt_sqlite/test_e2e.db

    log_success "Cleanup completed"
}

# Generate test report
generate_report() {
    log_info "Generating test report..."

    if [ -d "playwright-report" ]; then
        # Open report in CI-friendly mode
        if [ -n "$CI" ]; then
            log_info "Report available in playwright-report/ directory"
        else
            npx playwright show-report
        fi
    else
        log_warning "No test report found"
    fi
}

# Run smoke tests (quick validation)
run_smoke_tests() {
    log_info "Running smoke tests..."

    export PLAYWRIGHT_BASE_URL="${FRONTEND_URL:-http://localhost:5173}"

    # Run only smoke tests with minimal browser coverage
    npx playwright test \
        --project=chromium \
        --grep="@smoke" \
        --reporter=line \
        --max-failures=3

    log_success "Smoke tests completed"
}

# Full test suite for CI
run_full_ci() {
    log_info "Running full CI test suite..."

    # Trap to ensure cleanup
    trap cleanup EXIT INT TERM

    # Install dependencies
    install_deps

    # Start services
    start_services

    # Run tests with retry
    run_tests_with_retry "$@"

    # Generate report
    generate_report

    log_success "Full CI test suite completed"
}

# Docker-based testing
run_docker_tests() {
    log_info "Running tests in Docker..."

    # Build test image
    docker build -t duespark-e2e-tests -f e2e/Dockerfile .

    # Run tests in container
    docker run --rm \
        -v "$(pwd)/playwright-report:/app/playwright-report" \
        -v "$(pwd)/test-results:/app/test-results" \
        -e CI=true \
        duespark-e2e-tests

    log_success "Docker tests completed"
}

# Performance test
run_performance_tests() {
    log_info "Running performance tests..."

    # Use lighthouse for performance testing
    if command -v lighthouse &> /dev/null; then
        lighthouse http://localhost:5173 \
            --output=json \
            --output-path=./performance-report.json \
            --chrome-flags="--headless"

        log_success "Performance test completed - see performance-report.json"
    else
        log_warning "Lighthouse not installed, skipping performance tests"
    fi
}

# Usage information
show_usage() {
    echo "DueSpark E2E Test Commands"
    echo ""
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  install         Install dependencies and Playwright browsers"
    echo "  start           Start backend and frontend services"
    echo "  stop            Stop all services"
    echo "  test            Run E2E tests"
    echo "  smoke           Run smoke tests only"
    echo "  happy-path      Run happy path test only"
    echo "  critical        Run critical flow tests"
    echo "  mobile          Run mobile tests"
    echo "  retry           Run tests with retry on failure"
    echo "  ci              Run full CI test suite"
    echo "  docker          Run tests in Docker container"
    echo "  performance     Run performance tests"
    echo "  report          Generate/show test report"
    echo "  cleanup         Clean up test artifacts"
    echo ""
    echo "Options:"
    echo "  --browser       Browser to test (chromium, firefox, webkit, all)"
    echo "  --headed        Run in headed mode (for debugging)"
    echo "  --retry-count   Number of retries on failure (default: 2)"
    echo ""
    echo "Environment Variables:"
    echo "  FRONTEND_URL    Frontend URL (default: http://localhost:5173)"
    echo "  BACKEND_URL     Backend URL (default: http://localhost:8005)"
    echo "  SKIP_BACKEND_START    Skip starting backend service"
    echo "  SKIP_FRONTEND_START   Skip starting frontend service"
    echo "  RETRY_COUNT     Number of test retries (default: 2)"
    echo ""
    echo "Examples:"
    echo "  $0 ci                           # Run full CI suite"
    echo "  $0 test --browser chromium      # Run tests on Chrome only"
    echo "  $0 happy-path --headed          # Run happy path with UI"
    echo "  $0 smoke                        # Quick validation tests"
    echo "  $0 performance                  # Performance testing"
}

# Main script logic
main() {
    case "${1:-help}" in
        "install")
            install_deps
            ;;
        "start")
            start_services
            ;;
        "stop")
            stop_services
            ;;
        "test")
            shift
            run_tests "$@"
            ;;
        "smoke")
            run_smoke_tests
            ;;
        "happy-path")
            shift
            run_tests "happy-path" "$@"
            ;;
        "critical")
            shift
            run_tests "critical" "$@"
            ;;
        "mobile")
            shift
            run_tests "mobile" "$@"
            ;;
        "retry")
            shift
            run_tests_with_retry "$@"
            ;;
        "ci")
            shift
            run_full_ci "$@"
            ;;
        "docker")
            run_docker_tests
            ;;
        "performance")
            run_performance_tests
            ;;
        "report")
            generate_report
            ;;
        "cleanup")
            cleanup
            ;;
        "help"|*)
            show_usage
            ;;
    esac
}

# Run main function with all arguments
main "$@"
