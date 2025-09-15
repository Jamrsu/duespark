import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.main import app
from app.models import User, Referral, SubscriptionCredit, UserRole
from app.referral_service import referral_service
from app.auth import hash_password
import json


@pytest.fixture
def referrer_user(db_session: Session):
    """Create a referrer user with a referral code"""
    user = User(
        email="referrer@example.com",
        password_hash=hash_password("password123"),
        referral_code="TEST1234"
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def referred_user(db_session: Session):
    """Create a referred user"""
    user = User(
        email="referred@example.com",
        password_hash=hash_password("password123")
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def admin_user(db_session: Session):
    """Create an admin user"""
    user = User(
        email="admin@example.com",
        password_hash=hash_password("password123"),
        role=UserRole.admin
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


class TestReferralService:
    """Test referral service logic"""

    def test_generate_referral_code(self):
        """Test referral code generation"""
        code = referral_service.generate_referral_code()
        assert len(code) == 8
        assert code.isupper()
        assert code.isalnum()

    def test_ensure_user_has_referral_code(self, db_session: Session, referred_user: User):
        """Test ensuring user has referral code"""
        # User initially has no referral code
        assert referred_user.referral_code is None

        # Generate code
        code = referral_service.ensure_user_has_referral_code(referred_user, db_session)

        assert code is not None
        assert len(code) == 8
        assert referred_user.referral_code == code

        # Calling again should return same code
        code2 = referral_service.ensure_user_has_referral_code(referred_user, db_session)
        assert code2 == code

    def test_validate_referral_code_success(self, db_session: Session, referrer_user: User, referred_user: User):
        """Test successful referral code validation"""
        is_valid, message, referrer = referral_service.validate_referral_code(
            "TEST1234", referred_user, db_session
        )

        assert is_valid is True
        assert message == ""
        assert referrer.id == referrer_user.id

    def test_validate_referral_code_not_found(self, db_session: Session, referred_user: User):
        """Test validation with non-existent code"""
        is_valid, message, referrer = referral_service.validate_referral_code(
            "INVALID1", referred_user, db_session
        )

        assert is_valid is False
        assert "not found" in message
        assert referrer is None

    def test_validate_referral_code_self_referral(self, db_session: Session, referrer_user: User):
        """Test self-referral prevention"""
        is_valid, message, referrer = referral_service.validate_referral_code(
            "TEST1234", referrer_user, db_session
        )

        assert is_valid is False
        assert "own referral code" in message
        assert referrer is None

    def test_validate_referral_code_already_used(self, db_session: Session, referrer_user: User, referred_user: User):
        """Test prevention of using referral code twice"""
        # Create existing referral
        existing_referral = Referral(
            referrer_user_id=referrer_user.id,
            referred_user_id=referred_user.id,
            referral_code_used="TEST1234",
            reward_granted=False
        )
        db_session.add(existing_referral)
        db_session.commit()

        # Try to validate again
        is_valid, message, referrer = referral_service.validate_referral_code(
            "TEST1234", referred_user, db_session
        )

        assert is_valid is False
        assert "already used" in message
        assert referrer is None

    def test_create_referral(self, db_session: Session, referrer_user: User, referred_user: User):
        """Test creating a referral record"""
        referral = referral_service.create_referral(
            referrer_user, referred_user, "TEST1234", db_session
        )

        assert referral.referrer_user_id == referrer_user.id
        assert referral.referred_user_id == referred_user.id
        assert referral.referral_code_used == "TEST1234"
        assert referral.reward_granted is False
        assert referral.reward_months == 1

    def test_grant_referral_reward(self, db_session: Session, referrer_user: User, referred_user: User):
        """Test granting referral reward"""
        # Create referral
        referral = referral_service.create_referral(
            referrer_user, referred_user, "TEST1234", db_session
        )

        # Grant reward
        success = referral_service.grant_referral_reward(referral, db_session)
        assert success is True
        assert referral.reward_granted is True
        assert referral.rewarded_at is not None

        # Check credit was created
        credit = db_session.query(SubscriptionCredit).filter(
            SubscriptionCredit.user_id == referrer_user.id,
            SubscriptionCredit.source == 'referral'
        ).first()
        assert credit is not None
        assert credit.credit_months == 1
        assert credit.remaining_months == 1

        # Can't grant twice
        success2 = referral_service.grant_referral_reward(referral, db_session)
        assert success2 is False

    def test_get_user_referral_stats(self, db_session: Session, referrer_user: User, referred_user: User):
        """Test getting user referral statistics"""
        # Create and reward a referral
        referral = referral_service.create_referral(
            referrer_user, referred_user, "TEST1234", db_session
        )
        referral_service.grant_referral_reward(referral, db_session)

        stats = referral_service.get_user_referral_stats(referrer_user.id, db_session)

        assert stats['total_referrals'] == 1
        assert stats['successful_referrals'] == 1
        assert stats['pending_referrals'] == 0
        assert stats['total_credits_earned'] == 1
        assert stats['remaining_credits'] == 1
        assert len(stats['referrals']) == 1

    def test_consume_credits(self, db_session: Session, referrer_user: User):
        """Test consuming subscription credits"""
        # Create some credits
        credit = SubscriptionCredit(
            user_id=referrer_user.id,
            credit_months=3,
            remaining_months=3,
            source='referral',
            source_id='1',
            description='Test credit'
        )
        db_session.add(credit)
        db_session.commit()

        # Consume 2 months
        success = referral_service.consume_credits(referrer_user.id, 2, db_session)
        assert success is True

        db_session.refresh(credit)
        assert credit.remaining_months == 1

        # Try to consume more than available
        success2 = referral_service.consume_credits(referrer_user.id, 5, db_session)
        assert success2 is False

    def test_admin_grant_credit(self, db_session: Session, referrer_user: User, admin_user: User):
        """Test admin granting credits"""
        credit = referral_service.admin_grant_credit(
            referrer_user.id, 6, "Admin test grant", admin_user.id, db_session
        )

        assert credit.user_id == referrer_user.id
        assert credit.credit_months == 6
        assert credit.remaining_months == 6
        assert credit.source == 'admin_grant'
        assert credit.source_id == str(admin_user.id)
        assert credit.description == "Admin test grant"


class TestReferralAPI:
    """Test referral API endpoints"""

    def test_get_my_referral_code(self, client: TestClient, auth_headers: dict, db_session: Session):
        """Test getting user's referral code"""
        response = client.get("/api/referrals/my-code", headers=auth_headers)
        assert response.status_code == 200

        data = response.json()
        assert "referral_code" in data["data"]
        assert "share_link" in data["data"]
        assert len(data["data"]["referral_code"]) == 8

    def test_validate_referral_code_endpoint(self, client: TestClient, referrer_user: User, referred_user: User, db_session: Session):
        """Test validating referral code via API"""
        from app.auth import create_access_token

        # Ensure referrer has a referral code
        referrer_user.referral_code = "TEST1234"
        db_session.commit()

        # Create auth headers for the referred user (not the referrer)
        access_token = create_access_token(sub=referred_user.email)
        auth_headers = {"Authorization": f"Bearer {access_token}"}

        response = client.post(
            "/api/referrals/validate",
            headers=auth_headers,
            json={"referral_code": "TEST1234"}
        )
        assert response.status_code == 200

        data = response.json()
        assert data["data"]["valid"] is True

    def test_get_referral_stats(self, client: TestClient, auth_headers: dict):
        """Test getting referral statistics"""
        response = client.get("/api/referrals/stats", headers=auth_headers)
        assert response.status_code == 200

        data = response.json()
        assert "referral_code" in data["data"]
        assert "total_referrals" in data["data"]
        assert "successful_referrals" in data["data"]

    def test_get_credits_breakdown(self, client: TestClient, auth_headers: dict):
        """Test getting credits breakdown"""
        response = client.get("/api/referrals/credits", headers=auth_headers)
        assert response.status_code == 200

        data = response.json()
        assert "total_remaining_months" in data["data"]
        assert "credits" in data["data"]

    def test_admin_grant_credit_endpoint(self, client: TestClient, admin_user: User, referrer_user: User, db_session: Session):
        """Test admin credit grant endpoint"""
        # Get admin token
        from app.auth import create_access_token
        admin_token = create_access_token(admin_user.email)
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        response = client.post(
            "/api/referrals/admin/grant-credit",
            headers=admin_headers,
            json={
                "user_id": referrer_user.id,
                "months": 3,
                "description": "API test grant"
            }
        )
        assert response.status_code == 200

        data = response.json()
        assert data["data"]["credit_months"] == 3
        assert data["data"]["description"] == "API test grant"

    def test_admin_grant_credit_unauthorized(self, client: TestClient, auth_headers: dict, referrer_user: User):
        """Test admin endpoint with non-admin user"""
        response = client.post(
            "/api/referrals/admin/grant-credit",
            headers=auth_headers,
            json={
                "user_id": referrer_user.id,
                "months": 3,
                "description": "Should fail"
            }
        )
        assert response.status_code == 403


class TestReferralRegistration:
    """Test referral integration in registration"""

    def test_register_with_referral_code(self, client: TestClient, referrer_user: User, db_session: Session):
        """Test registration with valid referral code"""
        response = client.post(
            "/auth/register",
            json={
                "email": "newuser@example.com",
                "password": "password123",
                "referral_code": "TEST1234"
            }
        )
        assert response.status_code == 200

        data = response.json()
        assert data["data"]["referral_applied"] is True
        assert data["data"]["referred_by"] == "referrer"

        # Check referral was created but NOT yet rewarded
        referral = db_session.query(Referral).filter(
            Referral.referral_code_used == "TEST1234"
        ).first()
        assert referral is not None
        assert referral.reward_granted is False  # Should be False initially

        # Check NO credit was granted yet (will be granted after 30 days of paid subscription)
        credit = db_session.query(SubscriptionCredit).filter(
            SubscriptionCredit.user_id == referrer_user.id,
            SubscriptionCredit.source == 'referral'
        ).first()
        assert credit is None  # No credit yet

    def test_register_with_invalid_referral_code(self, client: TestClient):
        """Test registration with invalid referral code"""
        response = client.post(
            "/auth/register",
            json={
                "email": "newuser2@example.com",
                "password": "password123",
                "referral_code": "INVALID1"
            }
        )
        # Should still succeed but without referral
        assert response.status_code == 200

        data = response.json()
        assert "referral_applied" not in data["data"]

    def test_register_without_referral_code(self, client: TestClient):
        """Test normal registration without referral code"""
        response = client.post(
            "/auth/register",
            json={
                "email": "normaluser@example.com",
                "password": "password123"
            }
        )
        assert response.status_code == 200

        data = response.json()
        assert "referral_applied" not in data["data"]


class TestAbusePreventionandEdgeCases:
    """Test abuse prevention and edge cases"""

    def test_prevent_duplicate_referral_usage(self, client: TestClient, referrer_user: User, referred_user: User, db_session: Session):
        """Test that user can't use referral code twice"""
        # Create existing referral
        existing_referral = Referral(
            referrer_user_id=referrer_user.id,
            referred_user_id=referred_user.id,
            referral_code_used="TEST1234",
            reward_granted=True
        )
        db_session.add(existing_referral)
        db_session.commit()

        # Try to validate again
        from app.auth import create_access_token
        token = create_access_token(referred_user.email)
        headers = {"Authorization": f"Bearer {token}"}

        response = client.post(
            "/api/referrals/validate",
            headers=headers,
            json={"referral_code": "TEST1234"}
        )
        assert response.status_code == 200

        data = response.json()
        assert data["data"]["valid"] is False
        assert "already used" in data["data"]["message"]

    def test_prevent_self_referral(self, client: TestClient, referrer_user: User):
        """Test that user can't refer themselves"""
        from app.auth import create_access_token
        token = create_access_token(referrer_user.email)
        headers = {"Authorization": f"Bearer {token}"}

        response = client.post(
            "/api/referrals/validate",
            headers=headers,
            json={"referral_code": "TEST1234"}
        )
        assert response.status_code == 200

        data = response.json()
        assert data["data"]["valid"] is False
        assert "own referral code" in data["data"]["message"]

    def test_email_masking_privacy(self, db_session: Session, referrer_user: User, referred_user: User):
        """Test that email addresses are properly masked in referral stats"""
        # Create referral
        referral = referral_service.create_referral(
            referrer_user, referred_user, "TEST1234", db_session
        )
        referral_service.grant_referral_reward(referral, db_session)

        stats = referral_service.get_user_referral_stats(referrer_user.id, db_session)

        # Email should be masked
        referral_info = stats['referrals'][0]
        assert referral_info['referred_user_email'] == "re***@example.com"

    def test_unique_referral_codes(self, db_session: Session):
        """Test that referral codes are unique"""
        # Create multiple users and ensure unique codes
        users = []
        codes = set()

        for i in range(10):
            user = User(
                email=f"user{i}@example.com",
                password_hash=hash_password("password123")
            )
            db_session.add(user)
            db_session.commit()
            db_session.refresh(user)

            code = referral_service.ensure_user_has_referral_code(user, db_session)
            assert code not in codes
            codes.add(code)
            users.append(user)


class TestPostPaidReferralLogic:
    """Test post-paid referral reward logic"""

    def test_referral_eligibility_free_user(self, db_session: Session, referred_user: User):
        """Test that free users are not eligible for referral rewards"""
        from app.models import Subscription, SubscriptionTier, SubscriptionStatus
        from datetime import datetime, timedelta

        # Create free subscription
        subscription = Subscription(
            user_id=referred_user.id,
            tier=SubscriptionTier.freemium,
            status=SubscriptionStatus.active
        )
        db_session.add(subscription)
        db_session.commit()

        # Should not be eligible
        eligible = referral_service.check_referral_eligibility(referred_user.id, db_session)
        assert eligible is False

    def test_referral_eligibility_paid_user_under_30_days(self, db_session: Session, referred_user: User):
        """Test that paid users under 30 days are not eligible"""
        from app.models import Subscription, SubscriptionTier, SubscriptionStatus
        from datetime import datetime, timedelta

        # Create paid subscription that started 15 days ago
        subscription = Subscription(
            user_id=referred_user.id,
            tier=SubscriptionTier.basic,
            status=SubscriptionStatus.active,
            current_period_start=datetime.utcnow() - timedelta(days=15)
        )
        db_session.add(subscription)
        db_session.commit()

        # Should not be eligible (less than 30 days)
        eligible = referral_service.check_referral_eligibility(referred_user.id, db_session)
        assert eligible is False

    def test_referral_eligibility_paid_user_over_30_days(self, db_session: Session, referred_user: User):
        """Test that paid users over 30 days are eligible"""
        from app.models import Subscription, SubscriptionTier, SubscriptionStatus
        from datetime import datetime, timedelta

        # Create paid subscription that started 35 days ago
        subscription = Subscription(
            user_id=referred_user.id,
            tier=SubscriptionTier.basic,
            status=SubscriptionStatus.active,
            current_period_start=datetime.utcnow() - timedelta(days=35)
        )
        db_session.add(subscription)
        db_session.commit()

        # Should be eligible
        eligible = referral_service.check_referral_eligibility(referred_user.id, db_session)
        assert eligible is True

    def test_revoke_referral_reward(self, db_session: Session, referrer_user: User, referred_user: User):
        """Test revoking a referral reward"""
        # Create and grant referral reward
        referral = referral_service.create_referral(referrer_user, referred_user, "TEST1234", db_session)
        referral_service.grant_referral_reward(referral, db_session)

        # Verify reward was granted
        assert referral.reward_granted is True
        credit = db_session.query(SubscriptionCredit).filter(
            SubscriptionCredit.user_id == referrer_user.id,
            SubscriptionCredit.source == 'referral'
        ).first()
        assert credit is not None
        assert credit.remaining_months == 1

        # Revoke the reward
        success = referral_service.revoke_referral_reward(
            referred_user.id, "Refund requested within 30 days", db_session
        )
        assert success is True

        # Verify revocation
        db_session.refresh(referral)
        assert referral.reward_granted is False
        assert referral.rewarded_at is None

        db_session.refresh(credit)
        assert credit.remaining_months == 0
        assert "REVOKED" in credit.description