SHELL := /bin/bash

.PHONY: help test testv reset-test up app down monitor-up monitor-down migrate migrate-down-one seed db-shell

help:
	@echo "Available targets:"
	@echo "  test               - Run tests in container (init_db + pytest)"
	@echo "  testv              - Run verbose tests (-vv)"
	@echo "  reset-test         - Backup DB, drop volumes, migrate, run tests"
	@echo "  up                 - Build and start app + db"
	@echo "  app                - Start only app (db must be up)"
	@echo "  down               - Stop stack and remove containers"
	@echo "  monitor-up         - Start Prometheus + Grafana"
	@echo "  monitor-down       - Stop Prometheus + Grafana"
	@echo "  migrate            - Alembic upgrade head"
	@echo "  migrate-down-one   - Alembic downgrade -1"
	@echo "  seed               - Seed DB with docs/seed.sql"
	@echo "  db-shell           - Open psql shell to DB"
	@echo "  admin-seed         - Seed an admin user (ADMIN_EMAIL/ADMIN_PASSWORD)"

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
