#!/usr/bin/env python3
"""
Create admin user for DueSpark application.
This script can be run standalone or during app startup.
"""
import os
import sys
import logging
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

# Add the app directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine
from app.models import User
from app.auth import hash_password

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def create_admin_user(email: str = None, password: str = None) -> bool:
    """
    Create an admin user if one doesn't exist.

    Args:
        email: Admin email (defaults to ADMIN_EMAIL env var)
        password: Admin password (defaults to ADMIN_PASSWORD env var)

    Returns:
        bool: True if user was created or already exists, False if failed
    """
    # Get credentials from environment or parameters
    admin_email = email or os.getenv("ADMIN_EMAIL", "admin@duespark.com")
    admin_password = password or os.getenv("ADMIN_PASSWORD")

    if not admin_password:
        logger.error("ADMIN_PASSWORD environment variable is required")
        return False

    try:
        from sqlalchemy import text
        # Use direct SQL to avoid model/schema mismatch issues
        with engine.connect() as conn:
            # Check if admin user already exists
            result = conn.execute(
                text("SELECT email FROM users WHERE email = :email LIMIT 1"),
                {"email": admin_email}
            )
            if result.fetchone():
                logger.info(f"Admin user {admin_email} already exists")
                return True

            # Create new admin user with direct SQL
            hashed_password = hash_password(admin_password)
            conn.execute(
                text("""
                    INSERT INTO users (email, password_hash, created_at)
                    VALUES (:email, :password_hash, CURRENT_TIMESTAMP)
                """),
                {
                    "email": admin_email,
                    "password_hash": hashed_password
                }
            )
            conn.commit()

            logger.info(f"✓ Created admin user: {admin_email}")
            return True

    except IntegrityError as e:
        logger.error(f"Failed to create admin user (integrity error): {e}")
        return False
    except Exception as e:
        logger.error(f"Failed to create admin user: {e}")
        return False


def main():
    """Main function for standalone execution"""
    logger.info("Creating admin user...")

    # Check if database tables exist
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='users';"))
            if not result.fetchone():
                logger.error("Users table does not exist. Run database migrations first.")
                sys.exit(1)
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        sys.exit(1)

    # Create admin user
    success = create_admin_user()
    if success:
        logger.info("Admin user creation completed successfully")
        sys.exit(0)
    else:
        logger.error("Admin user creation failed")
        sys.exit(1)


if __name__ == "__main__":
    main()