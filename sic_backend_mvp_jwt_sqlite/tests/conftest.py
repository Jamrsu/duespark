"""
Pytest configuration and fixtures.
"""
import os
import sys
import pytest
from app.database import Base, engine  # Use the app's engine directly
from app import models  # Import to register models

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