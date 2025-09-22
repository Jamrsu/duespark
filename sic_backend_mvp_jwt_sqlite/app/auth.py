import os
import secrets
import sys
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app import models
from app.database import get_db

ALGORITHM = "HS256"
SECRET_KEY = os.getenv("SECRET_KEY")

# Ensure SECRET_KEY is set and secure
if not SECRET_KEY:
    # Allow deterministic but securely generated key during tests
    import sys

    if "pytest" in sys.modules or os.getenv("TESTING") == "true":
        SECRET_KEY = os.getenv("TEST_SECRET_KEY", secrets.token_hex(32))
    else:
        raise RuntimeError(
            "SECRET_KEY environment variable must be set. "
            "Generate a secure key with: openssl rand -hex 32"
        )
elif len(SECRET_KEY) < 32 and "pytest" not in sys.modules:
    raise RuntimeError(
        "SECRET_KEY must be at least 32 characters long and secure. "
        "Generate a secure key with: openssl rand -hex 32"
    )

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
# Optional variant for endpoints that can work without auth (e.g., public preview)
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return pwd_context.verify(password, hashed)


def create_access_token(sub: str, expires_minutes: int = 60) -> str:
    """Create JWT access token with enhanced security"""
    now = datetime.now(timezone.utc)

    # Limit token expiration to reasonable bounds
    if expires_minutes > 1440:  # 24 hours max
        expires_minutes = 1440
    if expires_minutes < 1:  # 1 minute min
        expires_minutes = 1

    payload = {
        "sub": sub,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=expires_minutes)).timestamp()),
        "iss": "duespark",  # Issuer claim
        "aud": "duespark-api",  # Audience claim
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)
) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
    )
    try:
        # Decode with additional security checks
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
            audience="duespark-api",
            issuer="duespark",
            options={"require_exp": True, "require_iat": True}
        )
        email: Optional[str] = payload.get("sub")

        # Additional token validation
        if not email or not isinstance(email, str):
            raise credentials_exception

        # Check if token is not too old (additional security)
        iat = payload.get("iat")
        if iat:
            token_age = datetime.now(timezone.utc).timestamp() - iat
            if token_age > 86400:  # 24 hours absolute max
                raise credentials_exception

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
        )
    except jwt.InvalidTokenError:
        raise credentials_exception
    except Exception:
        raise credentials_exception
    if email is None:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise credentials_exception
    return user


def get_current_user_optional(
    db: Session = Depends(get_db), token: str | None = Depends(oauth2_scheme_optional)
) -> models.User | None:
    if not token:
        return None
    try:
        # Decode with additional security checks for optional auth
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
            audience="duespark-api",
            issuer="duespark",
            options={"require_exp": True, "require_iat": True}
        )
        email: Optional[str] = payload.get("sub")

        # Additional token validation
        if not email or not isinstance(email, str):
            return None

    except Exception:
        return None
    if not email:
        return None
    user = db.query(models.User).filter(models.User.email == email).first()
    return user


def get_current_admin_user(
    current_user: models.User = Depends(get_current_user),
) -> models.User:
    """Get current user and ensure they have admin role"""
    if current_user.role != models.UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required"
        )
    return current_user
