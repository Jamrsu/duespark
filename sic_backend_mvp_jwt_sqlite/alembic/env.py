from __future__ import annotations

import os
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Set DB URL from env, with PostgreSQL URL fix for Render
db_url = os.getenv("DATABASE_URL")
if db_url:
    # Fix PostgreSQL URL scheme for SQLAlchemy 2.x compatibility
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
    config.set_main_option("sqlalchemy.url", db_url)

# add your model's MetaData object here
# Handle import path issues in different environments
import sys
from pathlib import Path

# Add the parent directory to Python path if not already there
current_dir = Path(__file__).parent.parent
if str(current_dir) not in sys.path:
    sys.path.insert(0, str(current_dir))

try:
    from app.database import Base  # type: ignore
except ImportError:
    # Fallback for different path configurations
    import sys
    sys.path.insert(0, '/app')
    from app.database import Base  # type: ignore

target_metadata = Base.metadata

def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True, dialect_opts={"paramstyle": "named"})
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        # Guard against indefinite locks during migrations
        try:
            connection.exec_driver_sql("SET lock_timeout = '5s'")
            connection.exec_driver_sql("SET statement_timeout = '60s'")
        except Exception:
            pass
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
