#!/bin/bash
set -e

echo "Initializing database..."
python init_db.py

echo "Database initialized. Running command: $@"
exec "$@"