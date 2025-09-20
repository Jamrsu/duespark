"""
Emergency Database Initialization Module

This module provides emergency database setup functionality that bypasses
Alembic migrations when they fail, allowing the application to bootstrap
its database tables directly using SQLAlchemy.
"""

import logging
import os
from typing import Dict, List, Any

from sqlalchemy import text, inspect
from sqlalchemy.exc import SQLAlchemyError

from app.database import engine, Base
from app.models import (
    User, Client, Invoice, Reminder, Payment, Template, Event,
    StripeAccount, DeadLetter, Outbox, Subscription, UsageLimits,
    BillingEvent, Referral, SubscriptionCredit
)

logger = logging.getLogger(__name__)


def skip_migrations_mode() -> bool:
    """
    Check if the application should skip migrations and use emergency database setup.

    Returns:
        bool: True if SKIP_MIGRATIONS environment variable is set to 'true'
    """
    return os.getenv("SKIP_MIGRATIONS", "false").lower() == "true"


def emergency_database_setup() -> Dict[str, Any]:
    """
    Emergency database setup that creates all tables without using Alembic migrations.

    This function:
    1. Tests database connectivity
    2. Checks existing tables
    3. Creates missing tables
    4. Returns detailed status report

    Returns:
        Dict containing success status, connectivity info, tables created, and any warnings/errors
    """
    result = {
        "success": False,
        "connectivity": {},
        "tables_created": [],
        "existing_tables": [],
        "warnings": [],
        "errors": []
    }

    try:
        logger.info("Starting emergency database setup...")

        # Test database connectivity
        logger.info("Testing database connectivity...")
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            result["connectivity"]["status"] = "connected"
            result["connectivity"]["engine"] = str(engine.url).split("@")[-1] if "@" in str(engine.url) else str(engine.url)
            logger.info("✓ Database connectivity confirmed")

        # Check existing tables
        logger.info("Checking existing tables...")
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        result["existing_tables"] = existing_tables
        logger.info(f"Found {len(existing_tables)} existing tables: {existing_tables}")

        # Get all model tables that should exist
        model_tables = []
        for table in Base.metadata.tables.values():
            model_tables.append(table.name)

        logger.info(f"Expected model tables: {model_tables}")

        # Identify missing tables
        missing_tables = set(model_tables) - set(existing_tables)

        if missing_tables:
            logger.info(f"Creating {len(missing_tables)} missing tables: {list(missing_tables)}")

            # Create missing tables
            Base.metadata.create_all(bind=engine, tables=[
                Base.metadata.tables[table_name] for table_name in missing_tables
            ])

            result["tables_created"] = list(missing_tables)
            logger.info("✓ Missing tables created successfully")
        else:
            logger.info("✓ All required tables already exist")
            result["warnings"].append("No missing tables found - all tables already exist")

        # Verify table creation
        logger.info("Verifying table creation...")
        inspector = inspect(engine)
        final_tables = inspector.get_table_names()

        still_missing = set(model_tables) - set(final_tables)
        if still_missing:
            result["errors"].append(f"Failed to create tables: {list(still_missing)}")
            logger.error(f"✗ Failed to create tables: {list(still_missing)}")
        else:
            logger.info("✓ All required tables verified")
            result["success"] = True

        # Log summary
        logger.info(f"Emergency database setup completed. Success: {result['success']}")
        if result["tables_created"]:
            logger.info(f"Created tables: {result['tables_created']}")
        if result["warnings"]:
            for warning in result["warnings"]:
                logger.warning(warning)

    except SQLAlchemyError as e:
        error_msg = f"SQLAlchemy error during emergency database setup: {str(e)}"
        logger.error(error_msg)
        result["errors"].append(error_msg)
        result["connectivity"]["status"] = "error"
        result["connectivity"]["error"] = str(e)

    except Exception as e:
        error_msg = f"Unexpected error during emergency database setup: {str(e)}"
        logger.error(error_msg)
        result["errors"].append(error_msg)
        result["connectivity"]["status"] = "error"
        result["connectivity"]["error"] = str(e)

    return result


def get_database_status() -> Dict[str, Any]:
    """
    Get current database status without making any changes.

    Returns:
        Dict containing connectivity status and table information
    """
    status = {
        "connectivity": {},
        "tables": {},
        "models_defined": []
    }

    try:
        # Test connectivity
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            status["connectivity"]["status"] = "connected"
            status["connectivity"]["url"] = str(engine.url).split("@")[-1] if "@" in str(engine.url) else str(engine.url)

        # Get existing tables
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        status["tables"]["existing"] = existing_tables
        status["tables"]["count"] = len(existing_tables)

        # Get model tables
        model_tables = list(Base.metadata.tables.keys())
        status["models_defined"] = model_tables
        status["tables"]["expected"] = model_tables
        status["tables"]["missing"] = list(set(model_tables) - set(existing_tables))

    except Exception as e:
        status["connectivity"]["status"] = "error"
        status["connectivity"]["error"] = str(e)

    return status