#!/usr/bin/env python
import os
import sys

from app.database import SessionLocal
from app import models
from app.auth import hash_password


def main() -> int:
    email = os.getenv("ADMIN_EMAIL", "admin@example.com")
    password = os.getenv("ADMIN_PASSWORD", "admin123")
    print(f"[seed_admin] Using ADMIN_EMAIL={email}")
    if not email or not password:
        print("[seed_admin] ADMIN_EMAIL and ADMIN_PASSWORD are required", file=sys.stderr)
        return 2

    db = SessionLocal()
    try:
        u = db.query(models.User).filter(models.User.email == email).first()
        if u:
            print("[seed_admin] User exists; updating role/password…")
            u.role = models.UserRole.admin
            u.password_hash = hash_password(password)
            db.commit(); db.refresh(u)
        else:
            print("[seed_admin] Creating admin user…")
            u = models.User(email=email, password_hash=hash_password(password), role=models.UserRole.admin)
            db.add(u)
            db.commit(); db.refresh(u)
        print(f"[seed_admin] Seeded admin user {u.email} (role={u.role.value})")
        return 0
    except Exception as e:
        db.rollback()
        print(f"[seed_admin] Error: {e}", file=sys.stderr)
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())

