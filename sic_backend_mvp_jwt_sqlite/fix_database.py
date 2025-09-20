#!/usr/bin/env python3
"""
Database Fix Script for DueSpark Deployment

This script ensures all necessary tables exist for the application to function properly.
It can be run safely multiple times and will only create missing tables.
"""

import os
import sqlite3
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.database import Base, engine
from app.models import *
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_missing_tables():
    """Create any missing tables that are required for the application"""
    logger.info("Creating missing database tables...")

    # Create all tables defined in models
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("✅ All tables created successfully")
    except Exception as e:
        logger.error(f"❌ Error creating tables: {e}")
        raise

def add_missing_columns():
    """Add any missing columns to existing tables"""
    logger.info("Adding missing columns...")

    with engine.connect() as conn:
        # Check and add missing columns to users table
        try:
            # Check if role column exists
            result = conn.execute(text("PRAGMA table_info(users)")).fetchall()
            columns = [row[1] for row in result]

            if 'role' not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'owner' NOT NULL"))
                logger.info("✅ Added role column to users table")

            if 'referral_code' not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN referral_code VARCHAR(16)"))
                logger.info("✅ Added referral_code column to users table")

            if 'email_verified' not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT 0 NOT NULL"))
                logger.info("✅ Added email_verified column to users table")

            if 'email_verification_token' not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN email_verification_token VARCHAR(255)"))
                logger.info("✅ Added email_verification_token column to users table")

            if 'onboarding_status' not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN onboarding_status VARCHAR(30) DEFAULT 'not_started' NOT NULL"))
                logger.info("✅ Added onboarding_status column to users table")

            if 'updated_at' not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL"))
                logger.info("✅ Added updated_at column to users table")

            conn.commit()

        except Exception as e:
            logger.warning(f"⚠️  Warning adding columns to users table: {e}")

def create_essential_tables():
    """Create the most essential tables that are missing from basic schema"""
    logger.info("Creating essential missing tables...")

    with engine.connect() as conn:
        try:
            # Create dead_letters table - essential for error handling
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS dead_letters (
                    id INTEGER PRIMARY KEY,
                    kind VARCHAR(64),
                    payload JSON NOT NULL,
                    error TEXT NOT NULL,
                    retries INTEGER DEFAULT 0,
                    next_attempt_at DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """))
            logger.info("✅ Created dead_letters table")

            # Create outbox table - essential for reliable message processing
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS outbox (
                    id INTEGER PRIMARY KEY,
                    topic VARCHAR(64),
                    payload JSON NOT NULL,
                    status VARCHAR(16) DEFAULT 'pending',
                    attempts INTEGER DEFAULT 0,
                    next_attempt_at DATETIME,
                    dispatched_at DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """))
            logger.info("✅ Created outbox table")

            # Create indexes for performance
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_dead_letters_kind ON dead_letters (kind)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_outbox_status ON outbox (status)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_outbox_topic ON outbox (topic)"))

            conn.commit()
            logger.info("✅ Created essential tables and indexes")

        except Exception as e:
            logger.error(f"❌ Error creating essential tables: {e}")
            raise

def update_alembic_version():
    """Update alembic version to reflect current state"""
    logger.info("Updating alembic version...")

    with engine.connect() as conn:
        try:
            # Create alembic_version table if it doesn't exist
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS alembic_version (
                    version_num VARCHAR(32) NOT NULL,
                    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
                )
            """))

            # Clear any existing version
            conn.execute(text("DELETE FROM alembic_version"))

            # Set to the latest migration
            conn.execute(text("INSERT INTO alembic_version (version_num) VALUES ('0015_missing_schema_elements')"))

            conn.commit()
            logger.info("✅ Updated alembic version to 0015_missing_schema_elements")

        except Exception as e:
            logger.error(f"❌ Error updating alembic version: {e}")
            raise

def main():
    """Main function to fix database issues"""
    logger.info("🔧 Starting database fix process...")

    try:
        # 1. Create all tables from models
        create_missing_tables()

        # 2. Add any missing columns
        add_missing_columns()

        # 3. Create essential tables that might be missing
        create_essential_tables()

        # 4. Update alembic version
        update_alembic_version()

        logger.info("🎉 Database fix completed successfully!")

        # Verify critical tables exist
        with engine.connect() as conn:
            result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table'")).fetchall()
            tables = [row[0] for row in result]

            essential_tables = ['users', 'clients', 'invoices', 'reminders', 'dead_letters', 'outbox']
            missing_tables = [table for table in essential_tables if table not in tables]

            if missing_tables:
                logger.error(f"❌ Still missing essential tables: {missing_tables}")
                return False
            else:
                logger.info(f"✅ All essential tables present: {essential_tables}")
                return True

    except Exception as e:
        logger.error(f"❌ Database fix failed: {e}")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)