"""
Pytest configuration and fixtures.
"""
import os
import sys
import pytest
from sqlalchemy.orm import Session
from app.database import Base, engine, SessionLocal  # Use the app's engine directly
from app import models  # Import to register models
from app.models import User

# Initialize database immediately when conftest is imported
def init_database():
    """Initialize database before running any tests."""
    database_url = os.getenv("DATABASE_URL", "sqlite:///./app.db")
    print(f"Initializing test database: {database_url}", file=sys.stderr)
    # Use the app's existing engine from app.database
    Base.metadata.drop_all(bind=engine)  # Drop all tables first
    Base.metadata.create_all(bind=engine)  # Create all tables
    print("Test database initialized!", file=sys.stderr)

# Run initialization immediately
init_database()

@pytest.fixture(scope="session", autouse=True)
def test_database():
    """Provide database engine to tests if needed."""
    yield engine
    # Cleanup after tests if needed

@pytest.fixture
def db_session():
    """Create a database session for testing."""
    session = SessionLocal()
    try:
        # Clean up existing data to avoid conflicts
        session.query(models.Subscription).delete()
        session.query(models.Referral).delete()
        session.query(models.SubscriptionCredit).delete()
        session.query(models.User).delete()
        session.commit()
        yield session
        # Clean up after test
        session.rollback()
    finally:
        session.close()

@pytest.fixture
def referrer_user(db_session: Session):
    """Create a test referrer user."""
    from app.models import UserRole
    user = User(
        email="referrer@test.com",
        password_hash="hashed_password",
        email_verified=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def referred_user(db_session: Session):
    """Create a test referred user."""
    user = User(
        email="referred@test.com",
        password_hash="hashed_password",
        email_verified=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def admin_user(db_session: Session):
    """Create a test admin user."""
    from app.models import UserRole
    user = User(
        email="admin@test.com",
        password_hash="hashed_password",
        email_verified=True,
        role=UserRole.admin
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def client():
    """Create a test client."""
    from fastapi.testclient import TestClient
    from app.main import app
    return TestClient(app)

@pytest.fixture
def auth_headers(referrer_user: User):
    """Create authentication headers for testing."""
    from app.auth import create_access_token
    access_token = create_access_token(sub=referrer_user.email)
    return {"Authorization": f"Bearer {access_token}"}