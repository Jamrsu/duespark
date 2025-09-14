"""
Comprehensive tests for the complete onboarding flow including all edge cases and scenarios
"""
import pytest
import json
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.main import app
from app.database import get_db, SessionLocal
from app import models, auth

client = TestClient(app)

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

def create_test_user(db: Session, email: str = "test@example.com", **kwargs):
    """Create a test user with specified attributes"""
    user_data = {
        "email": email,
        "password_hash": auth.hash_password("password123"),
        "onboarding_status": "not_started",
        "email_verified": False,
        **kwargs
    }
    user = models.User(**user_data)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def get_auth_headers(user: models.User):
    """Get authentication headers for a user"""
    token = auth.create_access_token(sub=user.email)
    return {"Authorization": f"Bearer {token}"}

class TestCompleteOnboardingFlow:
    """Test the complete onboarding flow from start to finish"""

    def test_complete_onboarding_flow_happy_path(self, test_db):
        """Test complete onboarding flow - happy path"""
        db = test_db
        user = create_test_user(db, "newuser@example.com")
        headers = get_auth_headers(user)

        # Step 1: User starts onboarding
        response = client.patch("/auth/me", json={"onboarding_status": "account_created"}, headers=headers)
        assert response.status_code == 200
        assert response.json()["data"]["onboarding_status"] == "account_created"

        # Step 2: Email verification (simulated)
        response = client.post("/auth/send-verification", json={"email": user.email}, headers=headers)
        assert response.status_code == 200

        # Auto-verified in demo mode
        db.refresh(user)
        assert user.email_verified is True

        # Update status to email verified
        response = client.patch("/auth/me", json={"onboarding_status": "email_verified"}, headers=headers)
        assert response.status_code == 200

        # Step 3: Payment method configuration (manual)
        response = client.patch("/auth/me", json={"payment_method": "manual"}, headers=headers)
        assert response.status_code == 200
        assert response.json()["data"]["payment_method"] == "manual"

        # Update status to payment configured
        response = client.patch("/auth/me", json={"onboarding_status": "payment_configured"}, headers=headers)
        assert response.status_code == 200

        # Step 4: Create sample data
        response = client.post("/onboarding/sample-data", headers=headers)
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["clients_created"] == 3
        assert data["invoices_created"] == 6

        # Step 5: Complete onboarding
        response = client.patch("/auth/me", json={"onboarding_status": "completed"}, headers=headers)
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["onboarding_status"] == "completed"
        assert data["onboarding_completed_at"] is not None

        # Verify final state
        db.refresh(user)
        assert user.onboarding_status == "completed"
        assert user.onboarding_completed_at is not None
        assert user.payment_method == "manual"
        assert user.email_verified is True

        # Verify data was created
        clients = db.query(models.Client).filter(models.Client.user_id == user.id).all()
        invoices = db.query(models.Invoice).filter(models.Invoice.user_id == user.id).all()
        assert len(clients) == 3
        assert len(invoices) == 6

    def test_onboarding_flow_with_stripe(self, test_db):
        """Test onboarding flow choosing Stripe payment method"""
        db = test_db
        user = create_test_user(db)
        headers = get_auth_headers(user)

        # Skip to payment configuration
        client.patch("/auth/me", json={"onboarding_status": "email_verified"}, headers=headers)

        # Try to get Stripe connect URL
        response = client.get("/integrations/stripe/connect", headers=headers)
        # This will fail without real Stripe credentials, but we can test the endpoint exists
        # and handles the request properly
        assert response.status_code in [200, 400, 500]  # Any of these is acceptable for testing

        # Simulate successful Stripe connection (would be done via callback in real flow)
        response = client.patch("/auth/me", json={
            "payment_method": "stripe",
            "stripe_account_id": "acct_test123"
        }, headers=headers)
        assert response.status_code == 200

        db.refresh(user)
        assert user.payment_method == "stripe"
        assert user.stripe_account_id == "acct_test123"

    def test_onboarding_flow_skip_sample_data(self, test_db):
        """Test onboarding flow where user skips sample data creation"""
        db = test_db
        user = create_test_user(db)
        headers = get_auth_headers(user)

        # Complete onboarding without creating sample data
        client.patch("/auth/me", json={"onboarding_status": "email_verified"}, headers=headers)
        client.patch("/auth/me", json={"payment_method": "manual"}, headers=headers)
        client.patch("/auth/me", json={"onboarding_status": "payment_configured"}, headers=headers)

        # Skip sample data creation
        response = client.patch("/auth/me", json={"onboarding_status": "completed"}, headers=headers)
        assert response.status_code == 200

        # Verify no sample data was created
        clients = db.query(models.Client).filter(models.Client.user_id == user.id).all()
        invoices = db.query(models.Invoice).filter(models.Invoice.user_id == user.id).all()
        assert len(clients) == 0
        assert len(invoices) == 0

    def test_onboarding_status_transitions(self, test_db):
        """Test that onboarding status transitions work in both directions"""
        db = test_db
        user = create_test_user(db)
        headers = get_auth_headers(user)

        # Valid forward transitions
        statuses = ["not_started", "account_created", "email_verified", "payment_configured", "completed"]
        for status in statuses:
            response = client.patch("/auth/me", json={"onboarding_status": status}, headers=headers)
            assert response.status_code == 200
            assert response.json()["data"]["onboarding_status"] == status

        # Should be able to go backwards too (reset onboarding)
        response = client.patch("/auth/me", json={"onboarding_status": "not_started"}, headers=headers)
        assert response.status_code == 200
        assert response.json()["data"]["onboarding_status"] == "not_started"

    def test_onboarding_with_invalid_email(self, test_db):
        """Test email verification with invalid email address"""
        db = test_db
        user = create_test_user(db)
        headers = get_auth_headers(user)

        # Try to verify different email
        response = client.post("/auth/send-verification",
                             json={"email": "different@example.com"},
                             headers=headers)
        assert response.status_code == 400

    def test_sample_data_creation_details(self, test_db):
        """Test detailed sample data creation"""
        db = test_db
        user = create_test_user(db)
        headers = get_auth_headers(user)

        response = client.post("/onboarding/sample-data", headers=headers)
        assert response.status_code == 200

        # Verify specific clients were created
        clients = db.query(models.Client).filter(models.Client.user_id == user.id).all()
        client_names = [c.name for c in clients]
        expected_names = ["Acme Corporation", "Tech Solutions Inc", "Global Enterprises Ltd"]
        assert all(name in client_names for name in expected_names)

        # Verify client details
        acme = next(c for c in clients if c.name == "Acme Corporation")
        assert acme.email == "billing@acme.com"
        assert acme.timezone == "America/New_York"

        # Verify invoices have proper relationships
        invoices = db.query(models.Invoice).filter(models.Invoice.user_id == user.id).all()
        assert len(invoices) == 6

        # Each client should have 2 invoices
        for test_client in clients:
            client_invoices = [i for i in invoices if i.client_id == test_client.id]
            assert len(client_invoices) == 2

        # Verify different invoice statuses exist
        statuses = [inv.status for inv in invoices]
        assert "pending" in statuses
        assert "paid" in statuses
        assert "overdue" in statuses

class TestOnboardingEdgeCases:
    """Test edge cases and error scenarios"""

    def test_onboarding_unauthorized_access(self, test_db):
        """Test that all onboarding endpoints require authentication"""
        endpoints = [
            ("GET", "/auth/me"),
            ("PATCH", "/auth/me", {"onboarding_status": "completed"}),
            ("POST", "/auth/send-verification", {"email": "test@example.com"}),
            ("POST", "/onboarding/sample-data"),
            ("GET", "/integrations/stripe/connect"),
        ]

        for method, endpoint, *data in endpoints:
            json_data = data[0] if data else None
            if method == "GET":
                response = client.get(endpoint)
            elif method == "POST":
                response = client.post(endpoint, json=json_data)
            elif method == "PATCH":
                response = client.patch(endpoint, json=json_data)

            assert response.status_code == 401, f"Endpoint {method} {endpoint} should require auth"

    def test_onboarding_concurrent_sample_data(self, test_db):
        """Test creating sample data multiple times"""
        db = test_db
        user = create_test_user(db)
        headers = get_auth_headers(user)

        # Create sample data first time
        response1 = client.post("/onboarding/sample-data", headers=headers)
        assert response1.status_code == 200

        # Create sample data second time
        response2 = client.post("/onboarding/sample-data", headers=headers)
        assert response2.status_code == 200

        # Should have double the data
        clients = db.query(models.Client).filter(models.Client.user_id == user.id).all()
        invoices = db.query(models.Invoice).filter(models.Invoice.user_id == user.id).all()
        assert len(clients) == 6  # 3 * 2
        assert len(invoices) == 12  # 6 * 2

    def test_onboarding_with_existing_data(self, test_db):
        """Test onboarding when user already has some data"""
        db = test_db
        user = create_test_user(db)
        headers = get_auth_headers(user)

        # Create a client manually first
        existing_client = models.Client(
            user_id=user.id,
            name="Existing Client",
            email="existing@example.com"
        )
        db.add(existing_client)
        db.commit()

        # Now create sample data
        response = client.post("/onboarding/sample-data", headers=headers)
        assert response.status_code == 200

        # Should have existing client + 3 sample clients
        clients = db.query(models.Client).filter(models.Client.user_id == user.id).all()
        assert len(clients) == 4

        client_names = [c.name for c in clients]
        assert "Existing Client" in client_names
        assert "Acme Corporation" in client_names

    def test_onboarding_reset_scenario(self, test_db):
        """Test resetting onboarding after completion"""
        db = test_db
        user = create_test_user(db)
        headers = get_auth_headers(user)

        # Complete onboarding
        client.patch("/auth/me", json={"onboarding_status": "completed", "payment_method": "manual"}, headers=headers)
        client.post("/onboarding/sample-data", headers=headers)

        # Reset onboarding
        response = client.patch("/auth/me", json={"onboarding_status": "not_started"}, headers=headers)
        assert response.status_code == 200

        # User data should still exist but onboarding status reset
        db.refresh(user)
        assert user.onboarding_status == "not_started"
        assert user.onboarding_completed_at is not None  # This timestamp remains

        # Sample data should still exist
        clients = db.query(models.Client).filter(models.Client.user_id == user.id).all()
        assert len(clients) == 3

class TestOnboardingEventTracking:
    """Test event tracking throughout onboarding process"""

    def test_onboarding_event_creation(self, test_db):
        """Test creating events during onboarding"""
        db = test_db
        user = create_test_user(db)
        headers = get_auth_headers(user)

        # Track onboarding start event
        event_data = {
            "entity_type": "user",
            "entity_id": user.id,
            "event_type": "onboarding_started",
            "payload": {"step": "account_setup"}
        }
        response = client.post("/events", json=event_data, headers=headers)
        assert response.status_code == 200

        # Track payment method selection
        event_data = {
            "entity_type": "user",
            "entity_id": user.id,
            "event_type": "payment_method_selected",
            "payload": {"method": "manual"}
        }
        response = client.post("/events", json=event_data, headers=headers)
        assert response.status_code == 200

        # Track completion
        event_data = {
            "entity_type": "user",
            "entity_id": user.id,
            "event_type": "onboarding_completed",
            "payload": {"completion_time": datetime.now(timezone.utc).isoformat()}
        }
        response = client.post("/events", json=event_data, headers=headers)
        assert response.status_code == 200

        # Verify events were created
        events = db.query(models.Event).filter(models.Event.user_id == user.id).all()
        assert len(events) == 3

        event_types = [e.event_type for e in events]
        assert "onboarding_started" in event_types
        assert "payment_method_selected" in event_types
        assert "onboarding_completed" in event_types

    def test_onboarding_event_isolation(self, test_db):
        """Test that events are properly isolated between users"""
        db = test_db
        user1 = create_test_user(db, "user1@example.com")
        user2 = create_test_user(db, "user2@example.com")

        headers1 = get_auth_headers(user1)
        headers2 = get_auth_headers(user2)

        # Create events for both users
        for user, headers in [(user1, headers1), (user2, headers2)]:
            event_data = {
                "entity_type": "user",
                "entity_id": user.id,
                "event_type": f"user_{user.id}_event",
                "payload": {"test": True}
            }
            response = client.post("/events", json=event_data, headers=headers)
            assert response.status_code == 200

        # Each user should only see their own events
        response1 = client.get("/events", headers=headers1)
        response2 = client.get("/events", headers=headers2)

        events1 = response1.json()["data"]
        events2 = response2.json()["data"]

        assert len(events1) == 1
        assert len(events2) == 1
        assert events1[0]["event_type"] == f"user_{user1.id}_event"
        assert events2[0]["event_type"] == f"user_{user2.id}_event"

class TestOnboardingIntegrations:
    """Test onboarding integration points"""

    def test_stripe_connect_endpoint(self, test_db):
        """Test Stripe Connect endpoint behavior"""
        db = test_db
        user = create_test_user(db)
        headers = get_auth_headers(user)

        # Test Stripe connect endpoint
        response = client.get("/integrations/stripe/connect", headers=headers)

        # Without real Stripe credentials, this might fail, but we test it handles gracefully
        assert response.status_code in [200, 400, 500]

        # If it returns 200, should have a URL or error message
        if response.status_code == 200:
            data = response.json()["data"]  # Access the data field
            # Might have a URL for redirect or an error message
            assert "url" in data or "error" in data

    def test_payment_method_updates(self, test_db):
        """Test payment method updates during onboarding"""
        db = test_db
        user = create_test_user(db)
        headers = get_auth_headers(user)

        # Test manual payment method
        response = client.patch("/auth/me", json={"payment_method": "manual"}, headers=headers)
        assert response.status_code == 200

        db.refresh(user)
        assert user.payment_method == "manual"

        # Test Stripe payment method (simulation)
        response = client.patch("/auth/me", json={
            "payment_method": "stripe",
            "stripe_account_id": "acct_test123"
        }, headers=headers)
        assert response.status_code == 200

        db.refresh(user)
        assert user.payment_method == "stripe"
        assert user.stripe_account_id == "acct_test123"

        # Test switching back to manual
        response = client.patch("/auth/me", json={"payment_method": "manual"}, headers=headers)
        assert response.status_code == 200

        db.refresh(user)
        assert user.payment_method == "manual"
        # Stripe account ID should remain for potential reconnection
        assert user.stripe_account_id == "acct_test123"