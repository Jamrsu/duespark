SHELL := /bin/bash
BACKEND_DIR := sic_backend_mvp_jwt_sqlite
FRONTEND_DIR := sic_app

.PHONY: help setup install-dev test testv reset-test up app down monitor-up monitor-down
.PHONY: migrate migrate-down-one seed db-shell admin-seed
.PHONY: lint format security check-all
.PHONY: backend-lint backend-format backend-test backend-security
.PHONY: frontend-lint frontend-format frontend-test frontend-build
.PHONY: pre-commit docker-build docker-scan

help:
	@echo "🚀 DueSpark Development Commands"
	@echo ""
	@echo "📋 Setup & Installation:"
	@echo "  setup              - Complete development setup (deps + pre-commit)"
	@echo "  install-dev        - Install all development dependencies"
	@echo ""
	@echo "🧪 Testing:"
	@echo "  test               - Run all tests (backend + frontend)"
	@echo "  testv              - Run verbose tests (-vv)"
	@echo "  reset-test         - Backup DB, drop volumes, migrate, run tests"
	@echo "  backend-test       - Run backend tests with coverage"
	@echo "  frontend-test      - Run frontend tests"
	@echo ""
	@echo "🔍 Code Quality:"
	@echo "  check-all          - Run all linting, formatting, and security checks"
	@echo "  lint               - Run linting (backend + frontend)"
	@echo "  format             - Run code formatting (backend + frontend)"
	@echo "  security           - Run security scans (bandit + safety)"
	@echo ""
	@echo "🏗️  Backend Commands:"
	@echo "  backend-lint       - Run backend linting (flake8, mypy)"
	@echo "  backend-format     - Run backend formatting (black, isort)"
	@echo "  backend-security   - Run backend security scans"
	@echo ""
	@echo "🎨 Frontend Commands:"
	@echo "  frontend-lint      - Run frontend linting (eslint)"
	@echo "  frontend-format    - Run frontend formatting (prettier)"
	@echo "  frontend-test      - Run frontend unit tests"
	@echo "  frontend-build     - Build frontend for production"
	@echo ""
	@echo "🐳 Docker & Infrastructure:"
	@echo "  up                 - Build and start app + db"
	@echo "  app                - Start only app (db must be up)"
	@echo "  down               - Stop stack and remove containers"
	@echo "  docker-build       - Build Docker images"
	@echo "  docker-scan        - Run Trivy security scan on images"
	@echo "  monitor-up         - Start Prometheus + Grafana"
	@echo "  monitor-down       - Stop Prometheus + Grafana"
	@echo ""
	@echo "🗄️  Database:"
	@echo "  migrate            - Alembic upgrade head"
	@echo "  migrate-down-one   - Alembic downgrade -1"
	@echo "  seed               - Seed DB with docs/seed.sql"
	@echo "  db-shell           - Open psql shell to DB"
	@echo "  admin-seed         - Seed an admin user (ADMIN_EMAIL/ADMIN_PASSWORD)"
	@echo ""
	@echo "🔧 Development Tools:"
	@echo "  pre-commit         - Run pre-commit on all files"

test:
	docker compose run --rm test

testv:
	docker compose run --rm test sh -lc "python init_db.py && pytest -vv"

reset-test:
	bash scripts/dev_reset.sh --up test

up:
	docker compose up --build

app:
	docker compose up --build app

down:
	docker compose down

monitor-up:
	docker compose -f docker-compose.monitoring.yml up -d

monitor-down:
	docker compose -f docker-compose.monitoring.yml down

migrate:
	docker compose run --rm test sh -lc "alembic -c sic_backend_mvp_jwt_sqlite/alembic.ini upgrade head"

migrate-down-one:
	docker compose run --rm test sh -lc "alembic -c sic_backend_mvp_jwt_sqlite/alembic.ini downgrade -1"

seed:
	@echo "Seeding DB from docs/seed.sql..."
	@docker compose exec -T db psql -U duespark -d duespark < docs/seed.sql

db-shell:
	docker compose exec db psql -U duespark -d duespark

admin-seed:
	@echo "Seeding admin user (set ADMIN_EMAIL/ADMIN_PASSWORD env vars to override)…"
	docker compose run --rm -e ADMIN_EMAIL -e ADMIN_PASSWORD test python scripts/seed_admin.py

# ============================================================================
# Setup & Installation
# ============================================================================

setup: install-dev pre-commit
	@echo "✅ Development environment setup complete!"

install-dev:
	@echo "📦 Installing backend development dependencies..."
	cd $(BACKEND_DIR) && pip install -r requirements-dev.txt
	@echo "📦 Installing frontend dependencies..."
	cd $(FRONTEND_DIR) && npm ci
	@echo "📦 Installing pre-commit..."
	pip install pre-commit

# ============================================================================
# Testing
# ============================================================================

test: backend-test frontend-test
	@echo "✅ All tests completed!"

backend-test:
	@echo "🧪 Running backend tests with coverage..."
	cd $(BACKEND_DIR) && pytest --cov=app --cov-report=term-missing --cov-fail-under=85

frontend-test:
	@echo "🧪 Running frontend tests..."
	cd $(FRONTEND_DIR) && npm run test

# ============================================================================
# Code Quality & Linting
# ============================================================================

check-all: lint format security
	@echo "✅ All quality checks completed!"

lint: backend-lint frontend-lint
	@echo "✅ All linting completed!"

format: backend-format frontend-format
	@echo "✅ All formatting completed!"

security: backend-security
	@echo "✅ All security scans completed!"

# Backend Quality
backend-lint:
	@echo "🔍 Running backend linting..."
	cd $(BACKEND_DIR) && flake8 .
	cd $(BACKEND_DIR) && mypy .

backend-format:
	@echo "🎨 Formatting backend code..."
	cd $(BACKEND_DIR) && black .
	cd $(BACKEND_DIR) && isort .

backend-security:
	@echo "🛡️  Running backend security scans..."
	cd $(BACKEND_DIR) && bandit -r . -f json -o bandit-report.json || true
	cd $(BACKEND_DIR) && safety check --output json > safety-report.json || true

# Frontend Quality
frontend-lint:
	@echo "🔍 Running frontend linting..."
	cd $(FRONTEND_DIR) && npm run lint

frontend-format:
	@echo "🎨 Formatting frontend code..."
	cd $(FRONTEND_DIR) && npm run format

frontend-build:
	@echo "🏗️  Building frontend for production..."
	cd $(FRONTEND_DIR) && npm run build

# ============================================================================
# Docker
# ============================================================================

docker-build:
	@echo "🐳 Building Docker images..."
	docker build -t duespark-backend:latest $(BACKEND_DIR)
	docker build -t duespark-frontend:latest $(FRONTEND_DIR)

docker-scan:
	@echo "🔒 Scanning Docker images for vulnerabilities..."
	docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
		-v ~/.cache:/root/.cache aquasec/trivy image duespark-backend:latest
	docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
		-v ~/.cache:/root/.cache aquasec/trivy image duespark-frontend:latest

# ============================================================================
# Development Tools
# ============================================================================

pre-commit:
	@echo "🔧 Running pre-commit hooks on all files..."
	pre-commit run --all-files

pre-commit-install:
	@echo "🔧 Installing pre-commit hooks..."
	pre-commit install
	pre-commit install --hook-type commit-msg

# ============================================================================
# Quick Development Workflows
# ============================================================================

dev-setup: setup pre-commit-install
	@echo "🚀 Complete development setup finished!"
	@echo ""
	@echo "Next steps:"
	@echo "  1. Copy .env.example to .env in both backend and frontend"
	@echo "  2. Configure your environment variables"
	@echo "  3. Run 'make up' to start the development environment"
	@echo "  4. Run 'make test' to verify everything works"

dev-check: check-all test
	@echo "✅ Development environment health check complete!"

ci-check: backend-lint backend-security backend-test frontend-lint frontend-test frontend-build
	@echo "✅ CI pipeline checks complete!"
