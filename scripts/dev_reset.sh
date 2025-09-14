#!/usr/bin/env bash
set -euo pipefail

# Dev reset helper: backup DB (if running), drop volumes, recreate schema,
# optionally seed data, and optionally bring up app or run tests.

SEED_FILE=""
UP_TARGET=""

usage() {
  cat <<USAGE
Usage: $(basename "$0") [--seed path/to/seed.sql] [--up app|test|none]

Examples:
  # Backup, wipe volumes, run tests on a clean DB
  ./scripts/dev_reset.sh --up test

  # Backup, wipe, recreate schema, seed sample data, then start app
  ./scripts/dev_reset.sh --seed docs/seed.sql --up app

  # Backup and wipe only
  ./scripts/dev_reset.sh --up none
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --seed)
      SEED_FILE="${2:-}"
      shift 2
      ;;
    --up)
      UP_TARGET="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage; exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2; usage; exit 1
      ;;
  esac
done

echo "[dev-reset] Checking running db container..."
DB_CONT=$(docker compose ps -q db || true)
BACKUP_DIR="backups"
mkdir -p "$BACKUP_DIR"
TS=$(date +%Y%m%d-%H%M%S)

if [[ -n "$DB_CONT" ]]; then
  echo "[dev-reset] Dumping DB to $BACKUP_DIR/backup-$TS.sql"
  docker exec -t "$DB_CONT" pg_dump -U duespark -d duespark > "$BACKUP_DIR/backup-$TS.sql" || true
else
  echo "[dev-reset] DB container not running; skipping backup"
fi

echo "[dev-reset] Bringing stack down and dropping volumes..."
docker compose down -v

if [[ -n "$SEED_FILE" || "$UP_TARGET" == "app" || "$UP_TARGET" == "test" ]]; then
  echo "[dev-reset] Starting db service..."
  docker compose up -d db
  echo "[dev-reset] Waiting for db to be healthy..."
  # Wait for health status
  for i in {1..60}; do
    status=$(docker inspect --format='{{json .State.Health.Status}}' "$(docker compose ps -q db)" 2>/dev/null || true)
    if [[ "$status" == '"healthy"' ]]; then break; fi
    sleep 1
  done
  echo "[dev-reset] Applying migrations (alembic upgrade head)..."
  docker compose run --rm test sh -lc "alembic upgrade head"
fi

if [[ -n "$SEED_FILE" ]]; then
  if [[ ! -f "$SEED_FILE" ]]; then
    echo "[dev-reset] Seed file not found: $SEED_FILE" >&2; exit 1
  fi
  echo "[dev-reset] Seeding DB from $SEED_FILE ..."
  docker exec -i "$(docker compose ps -q db)" psql -U duespark -d duespark < "$SEED_FILE"
fi

case "$UP_TARGET" in
  app)
    echo "[dev-reset] Bringing app up..."
    docker compose up --build app
    ;;
  test)
    echo "[dev-reset] Running tests..."
    docker compose up --build --exit-code-from test test
    ;;
  ""|none)
    echo "[dev-reset] Done. Stack is down; db volumes reset."
    ;;
  *)
    echo "[dev-reset] Unknown --up target: $UP_TARGET" >&2; exit 1
    ;;
esac

