#!/bin/bash
set -e

# DueSpark Backend Production Entrypoint Script
echo "🚀 Starting DueSpark Backend in Production Mode"

# Function to wait for database to be ready
wait_for_db() {
    echo "⏳ Waiting for database connection..."
    python -c "
import os
import time
import psycopg2
from urllib.parse import urlparse

max_attempts = 30
attempt = 0

database_url = os.getenv('DATABASE_URL')
if not database_url:
    print('❌ DATABASE_URL not set')
    exit(1)

# Parse DATABASE_URL
if database_url.startswith('postgresql'):
    parsed = urlparse(database_url)

    while attempt < max_attempts:
        try:
            conn = psycopg2.connect(
                host=parsed.hostname,
                port=parsed.port or 5432,
                user=parsed.username,
                password=parsed.password,
                database=parsed.path[1:]  # Remove leading slash
            )
            conn.close()
            print('✅ Database connection successful')
            break
        except psycopg2.OperationalError as e:
            attempt += 1
            print(f'⏳ Database not ready, attempt {attempt}/{max_attempts}: {e}')
            time.sleep(2)
    else:
        print('❌ Database connection failed after all attempts')
        exit(1)
else:
    print('✅ Using SQLite database')
"
}

# Function to run database migrations
run_migrations() {
    echo "🔄 Running database migrations..."
    alembic upgrade head
    if [ $? -eq 0 ]; then
        echo "✅ Database migrations completed successfully"
    else
        echo "❌ Database migrations failed"
        exit 1
    fi
}

# Function to validate environment variables
validate_env() {
    echo "🔍 Validating environment variables..."

    required_vars=(
        "SECRET_KEY"
        "DATABASE_URL"
    )

    missing_vars=()

    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done

    if [ ${#missing_vars[@]} -ne 0 ]; then
        echo "❌ Missing required environment variables:"
        printf '%s\n' "${missing_vars[@]}"
        exit 1
    fi

    echo "✅ Environment validation passed"
}

# Function to check application health
health_check() {
    echo "🩺 Performing application health check..."
    python -c "
from app.database import engine
from sqlalchemy import text

try:
    with engine.connect() as conn:
        result = conn.execute(text('SELECT 1'))
        print('✅ Database health check passed')
except Exception as e:
    print(f'❌ Database health check failed: {e}')
    exit(1)
"
}

# Main execution flow
main() {
    echo "🏁 Starting production deployment checks..."

    # Validate environment
    validate_env

    # Wait for database
    wait_for_db

    # Run migrations
    run_migrations

    # Health check
    health_check

    echo "✅ All startup checks passed"
    echo "🚀 Starting application server..."

    # Execute the CMD passed to the container
    exec "$@"
}

# Trap signals for graceful shutdown
trap 'echo "🛑 Received shutdown signal, terminating..."; exit 0' SIGTERM SIGINT

# Run main function
main "$@"