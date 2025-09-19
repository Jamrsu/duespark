import json
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app import auth, models
from app.database import SessionLocal, get_db
from app.main import app

client = TestClient(app)


# Test fixtures and utilities
@pytest.fixture
def test_db():
    """Provide a fresh database session for each test"""
    from app.database import Base, engine

    # Clean all tables before each test
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_test_user(
    db: Session, email: str = "test@example.com", onboarding_status: str = "not_started"
):
    """Create a test user with specified onboarding status"""
    user = models.User(
        email=email,
        password_hash=auth.hash_password("Password123!"),
        onboarding_status=onboarding_status,
        email_verified=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_auth_headers(user: models.User):
    """Get authentication headers for a user"""
    token = auth.create_access_token(sub=user.email)
    return {"Authorization": f"Bearer {token}"}


def test_get_current_user_profile(test_db):
    """Test getting current user profile with onboarding status"""
    db = test_db
    user = create_test_user(db, onboarding_status="email_verified")
    headers = get_auth_headers(user)

    response = client.get("/auth/me", headers=headers)

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["email"] == user.email
    assert data["onboarding_status"] == "email_verified"
    assert data["email_verified"] is False
    assert data["stripe_account_id"] is None
    assert data["payment_method"] is None


def test_update_user_onboarding_status(test_db):
    """Test updating user onboarding status"""
    db = test_db
    user = create_test_user(db)
    headers = get_auth_headers(user)

    update_data = {"onboarding_status": "email_verified"}
    response = client.patch("/auth/me", json=update_data, headers=headers)

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["onboarding_status"] == "email_verified"

    # Verify in database
    db.refresh(user)
    assert user.onboarding_status == "email_verified"


def test_update_user_payment_method(test_db):
    """Test updating user payment method"""
    db = test_db
    user = create_test_user(db)
    headers = get_auth_headers(user)

    update_data = {"payment_method": "manual"}
    response = client.patch("/auth/me", json=update_data, headers=headers)

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["payment_method"] == "manual"

    # Verify in database
    db.refresh(user)
    assert user.payment_method == "manual"


def test_complete_onboarding_sets_timestamp(test_db):
    """Test that completing onboarding sets completion timestamp"""
    db = test_db
    user = create_test_user(db, onboarding_status="payment_configured")
    headers = get_auth_headers(user)

    update_data = {"onboarding_status": "completed"}
    response = client.patch("/auth/me", json=update_data, headers=headers)

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["onboarding_status"] == "completed"
    assert data["onboarding_completed_at"] is not None

    # Verify in database
    db.refresh(user)
    assert user.onboarding_completed_at is not None
    assert isinstance(user.onboarding_completed_at, datetime)


def test_update_user_only_allowed_fields(test_db):
    """Test that only allowed fields can be updated"""
    db = test_db
    user = create_test_user(db)
    headers = get_auth_headers(user)
    original_email = user.email

    # Try to update both allowed and disallowed fields
    update_data = {
        "onboarding_status": "completed",
        "email": "hacker@example.com",  # Not allowed
        "id": 999,  # Not allowed
        "role": "admin",  # Not allowed
    }
    response = client.patch("/auth/me", json=update_data, headers=headers)

    assert response.status_code == 200

    # Verify only allowed fields were updated
    db.refresh(user)
    assert user.onboarding_status == "completed"
    assert user.email == original_email  # Should not change


def test_send_verification_email(test_db):
    """Test sending verification email"""
    db = test_db
    user = create_test_user(db)
    headers = get_auth_headers(user)

    request_data = {"email": user.email}
    response = client.post(
        "/auth/send-verification", json=request_data, headers=headers
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert "message" in data
    assert "demo_auto_verified" in data

    # In demo mode, user should be auto-verified
    db.refresh(user)
    assert user.email_verified is True
    assert user.email_verification_token is not None


def test_send_verification_email_wrong_email(test_db):
    """Test sending verification email with wrong email address"""
    db = test_db
    user = create_test_user(db)
    headers = get_auth_headers(user)

    request_data = {"email": "wrong@example.com"}
    response = client.post(
        "/auth/send-verification", json=request_data, headers=headers
    )

    assert response.status_code == 400
    response_data = response.json()
    # The API uses the _envelope format, so error is nested
    error_message = response_data.get("error", {}).get("message", "")
    assert "Email does not match" in error_message


def test_create_sample_data(test_db):
    """Test creating sample data for onboarding"""
    db = test_db
    user = create_test_user(db)
    headers = get_auth_headers(user)

    response = client.post("/onboarding/sample-data", headers=headers)

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["clients_created"] == 3
    assert data["invoices_created"] == 6
    assert "message" in data

    # Verify clients were created
    clients = db.query(models.Client).filter(models.Client.user_id == user.id).all()
    assert len(clients) == 3

    # Check specific client details
    acme_client = next((c for c in clients if c.name == "Acme Corporation"), None)
    assert acme_client is not None
    assert acme_client.email == "billing@acme.com"
    assert acme_client.timezone == "America/New_York"

    # Verify invoices were created
    invoices = db.query(models.Invoice).filter(models.Invoice.user_id == user.id).all()
    assert len(invoices) == 6

    # Check various invoice statuses
    statuses = [invoice.status for invoice in invoices]
    assert "pending" in statuses
    assert "overdue" in statuses
    assert "paid" in statuses


def test_create_sample_data_duplicate_call(test_db):
    """Test calling sample data creation multiple times"""
    db = test_db
    user = create_test_user(db)
    headers = get_auth_headers(user)

    # First call
    response1 = client.post("/onboarding/sample-data", headers=headers)
    assert response1.status_code == 200

    # Second call should still work (creates more data)
    response2 = client.post("/onboarding/sample-data", headers=headers)
    assert response2.status_code == 200

    # Should have double the data now
    clients = db.query(models.Client).filter(models.Client.user_id == user.id).all()
    assert len(clients) == 6  # 3 * 2


def test_create_event_tracking(test_db):
    """Test creating events for tracking user actions"""
    db = test_db
    user = create_test_user(db)
    headers = get_auth_headers(user)

    event_data = {
        "entity_type": "user",
        "entity_id": user.id,
        "event_type": "onboarding_started",
        "payload": {"step": 1},
    }
    response = client.post("/events", json=event_data, headers=headers)

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["event_type"] == "onboarding_started"
    assert data["entity_id"] == user.id
    assert data["payload"]["step"] == 1

    # Verify in database
    event = (
        db.query(models.Event)
        .filter(
            models.Event.user_id == user.id,
            models.Event.event_type == "onboarding_started",
        )
        .first()
    )
    assert event is not None
    assert event.payload["step"] == 1


def test_list_events(test_db):
    """Test listing user events"""
    from datetime import datetime, timedelta, timezone

    db = test_db
    user = create_test_user(db)
    headers = get_auth_headers(user)

    # Create some events with explicit timestamps to ensure proper ordering
    base_time = datetime.now(timezone.utc)
    for i in range(3):
        event = models.Event(
            user_id=user.id,
            entity_type="user",
            entity_id=user.id,
            event_type=f"test_event_{i}",
            payload={"step": i},
            created_at=base_time + timedelta(seconds=i),  # Each event is 1 second later
        )
        db.add(event)
    db.commit()

    response = client.get("/events", headers=headers)

    assert response.status_code == 200
    data = response.json()["data"]
    assert len(data) == 3
    assert all(event["user_id"] == user.id for event in data)

    # Should be ordered by created_at desc (newest first)
    event_types = [event["event_type"] for event in data]
    expected_types = ["test_event_2", "test_event_1", "test_event_0"]
    assert event_types == expected_types


def test_list_events_pagination(test_db):
    """Test events pagination"""
    db = test_db
    user = create_test_user(db)
    headers = get_auth_headers(user)

    # Create many events
    for i in range(10):
        event = models.Event(
            user_id=user.id,
            entity_type="user",
            entity_id=user.id,
            event_type=f"test_event_{i}",
        )
        db.add(event)
    db.commit()

    # Test pagination
    response = client.get("/events?limit=5&offset=0", headers=headers)
    assert response.status_code == 200
    data = response.json()["data"]
    assert len(data) == 5

    # Test second page
    response = client.get("/events?limit=5&offset=5", headers=headers)
    assert response.status_code == 200
    data = response.json()["data"]
    assert len(data) == 5


def test_unauthorized_access_to_onboarding_endpoints(test_db):
    """Test that onboarding endpoints require authentication"""
    # Test without authentication headers
    response = client.get("/auth/me")
    assert response.status_code == 401

    response = client.patch("/auth/me", json={"onboarding_status": "completed"})
    assert response.status_code == 401

    response = client.post(
        "/auth/send-verification", json={"email": "test@example.com"}
    )
    assert response.status_code == 401

    response = client.post("/onboarding/sample-data")
    assert response.status_code == 401

    response = client.post(
        "/events", json={"entity_type": "user", "entity_id": 1, "event_type": "test"}
    )
    assert response.status_code == 401


def test_events_isolation_between_users(test_db):
    """Test that users can only see their own events"""
    db = test_db

    # Create two users
    user1 = create_test_user(db, "user1@example.com")
    user2 = create_test_user(db, "user2@example.com")

    # Create events for each user
    event1 = models.Event(
        user_id=user1.id,
        entity_type="user",
        entity_id=user1.id,
        event_type="user1_event",
    )
    event2 = models.Event(
        user_id=user2.id,
        entity_type="user",
        entity_id=user2.id,
        event_type="user2_event",
    )
    db.add_all([event1, event2])
    db.commit()

    # User 1 should only see their events
    headers1 = get_auth_headers(user1)
    response = client.get("/events", headers=headers1)
    assert response.status_code == 200
    data = response.json()["data"]
    assert len(data) == 1
    assert data[0]["event_type"] == "user1_event"

    # User 2 should only see their events
    headers2 = get_auth_headers(user2)
    response = client.get("/events", headers=headers2)
    assert response.status_code == 200
    data = response.json()["data"]
    assert len(data) == 1
    assert data[0]["event_type"] == "user2_event"


def test_sample_data_isolation_between_users(test_db):
    """Test that sample data is created only for the authenticated user"""
    db = test_db

    user1 = create_test_user(db, "user1@example.com")
    user2 = create_test_user(db, "user2@example.com")

    # Create sample data for user1
    headers1 = get_auth_headers(user1)
    response = client.post("/onboarding/sample-data", headers=headers1)
    assert response.status_code == 200

    # Verify user1 has data
    user1_clients = (
        db.query(models.Client).filter(models.Client.user_id == user1.id).all()
    )
    assert len(user1_clients) == 3

    # Verify user2 has no data
    user2_clients = (
        db.query(models.Client).filter(models.Client.user_id == user2.id).all()
    )
    assert len(user2_clients) == 0


def test_onboarding_status_enum_validation(test_db):
    """Test that onboarding status validation works with enum values"""
    db = test_db
    user = create_test_user(db)
    headers = get_auth_headers(user)

    # Valid status
    valid_statuses = [
        "not_started",
        "account_created",
        "email_verified",
        "payment_configured",
        "completed",
    ]
    for status in valid_statuses:
        update_data = {"onboarding_status": status}
        response = client.patch("/auth/me", json=update_data, headers=headers)
        assert response.status_code == 200

    # The API accepts any string for now, but the model validates it
    # This test ensures the endpoint works with all expected enum values
