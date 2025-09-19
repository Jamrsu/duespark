#!/usr/bin/env python
import logging
import os

from app.database import SessionLocal
from app import models
from app.auth import hash_password


logger = logging.getLogger("duespark.seed_admin")


def configure_logging() -> None:
    """Ensure structured logging for the seed script."""
    if logging.getLogger().handlers:
        return

    logging.basicConfig(
        level=os.getenv("DUESPARK_LOG_LEVEL", "INFO"),
        format='{"timestamp":"%(asctime)s","logger":"%(name)s","level":"%(levelname)s","message":"%(message)s"}'
    )


def main() -> int:
    configure_logging()
    email = os.getenv("ADMIN_EMAIL", "admin@example.com")
    password = os.getenv("ADMIN_PASSWORD")

    # Security: No default password allowed
    if not password:
        logger.error("ADMIN_PASSWORD environment variable is required and cannot be empty")
        logger.error("Please set a secure admin password: export ADMIN_PASSWORD='your_secure_password'")
        logger.error("For security reasons, no default password is provided")
        return 2

    if password == "admin123":
        logger.error("Default password 'admin123' is not allowed for security reasons")
        logger.error("Please set a secure admin password: export ADMIN_PASSWORD='your_secure_password'")
        return 2

    logger.info("seeding admin user", extra={"admin_email": email})
    if not email:
        logger.error("missing email for admin seed")
        return 2

    db = SessionLocal()
    try:
        u = db.query(models.User).filter(models.User.email == email).first()
        if u:
            logger.info("admin user exists; updating role and password", extra={"admin_email": email})
            u.role = models.UserRole.admin
            u.password_hash = hash_password(password)
            db.commit(); db.refresh(u)
        else:
            logger.info("creating admin user", extra={"admin_email": email})
            u = models.User(email=email, password_hash=hash_password(password), role=models.UserRole.admin)
            db.add(u)
            db.commit(); db.refresh(u)
        logger.info("admin user ready", extra={"admin_email": u.email, "role": u.role.value})
        return 0
    except Exception:
        db.rollback()
        logger.exception("failed seeding admin user", extra={"admin_email": email})
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
