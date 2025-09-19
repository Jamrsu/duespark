"""
Tests for AI heuristics module: tone presets and schedule optimization.
"""

from datetime import date, datetime, timedelta, timezone, time

import pytest
from sqlalchemy.orm import Session

from app.ai_heuristics import (
    SchedulePredictor,
    TonePredictor,
    analyze_payment_behavior,
    choose_tone,
    get_schedule_predictor,
    get_tone_predictor,
    next_send_times,
)
from app.models import Client, Invoice, InvoiceStatus, TemplateTone


@pytest.fixture
def test_db():
    """Provide a fresh database session for each test"""
    from app.database import Base, SessionLocal, engine

    # Clean all tables before each test
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def sample_client(test_db: Session):
    """Create a test client with specific timezone."""
    client = Client(
        name="Test Client",
        email="test@example.com",
        timezone="America/New_York",
        user_id=1,
    )
    test_db.add(client)
    test_db.flush()
    return client


@pytest.fixture
def sample_invoices(test_db: Session, sample_client):
    """Create test invoices with payment history."""
    invoices = []
    # Anchor to the upcoming Friday to keep behavior deterministic but within the analysis window
    today = datetime.now(timezone.utc).date()
    days_until_friday = (4 - today.weekday()) % 7
    anchor = datetime.combine(
        today + timedelta(days=days_until_friday),
        time(hour=19, minute=0),
        tzinfo=timezone.utc,
    )

    # (due_date, paid_at) pairs yield lateness: -2, -1, +4, +2, +1 (avg = 0.8)
    payment_patterns = [
        (anchor.date() + timedelta(days=2), anchor.replace(minute=30)),  # Early by 2 days
        (anchor.date() + timedelta(days=1), anchor.replace(hour=18, minute=0)),  # Early by 1 day
        (anchor.date() - timedelta(days=4), anchor.replace(hour=17, minute=0)),  # Late by 4 days
        (anchor.date() - timedelta(days=2), anchor.replace(hour=20, minute=15)),  # Late by 2 days
        (anchor.date() - timedelta(days=1), anchor.replace(hour=21, minute=45)),  # Late by 1 day
    ]

    for i, (due_date, paid_at) in enumerate(payment_patterns):
        invoice = Invoice(
            client_id=sample_client.id,
            user_id=1,
            amount_cents=10000,
            currency="USD",
            due_date=due_date,
            status=InvoiceStatus.paid,
            paid_at=paid_at,
            external_id=f"test-{i}",
        )
        test_db.add(invoice)
        invoices.append(invoice)

    # Add an unpaid invoice for testing next_send_times
    unpaid_invoice = Invoice(
        client_id=sample_client.id,
        user_id=1,
        amount_cents=15000,
        currency="USD",
        due_date=(datetime.now(timezone.utc) + timedelta(days=5)).date(),
        status=InvoiceStatus.pending,
        external_id="unpaid-test",
    )
    test_db.add(unpaid_invoice)
    invoices.append(unpaid_invoice)

    test_db.flush()
    return invoices


class TestToneSelection:
    """Test tone escalation logic."""

    def test_friendly_tone_early_stages(self, test_db: Session, sample_client):
        """Test friendly tone for early reminder stages."""
        # Not yet due
        tone = choose_tone(sample_client.id, -1, test_db)
        assert tone == TemplateTone.friendly

        # Just due
        tone = choose_tone(sample_client.id, 0, test_db)
        assert tone == TemplateTone.friendly

        # 2 days overdue
        tone = choose_tone(sample_client.id, 2, test_db)
        assert tone == TemplateTone.friendly

    def test_neutral_tone_moderate_overdue(self, test_db: Session, sample_client):
        """Test neutral tone for moderately overdue invoices."""
        # 3 days overdue
        tone = choose_tone(sample_client.id, 3, test_db)
        assert tone == TemplateTone.neutral

        # 5 days overdue
        tone = choose_tone(sample_client.id, 5, test_db)
        assert tone == TemplateTone.neutral

        # 9 days overdue
        tone = choose_tone(sample_client.id, 9, test_db)
        assert tone == TemplateTone.neutral

    def test_firm_tone_severely_overdue(self, test_db: Session, sample_client):
        """Test firm tone for severely overdue invoices."""
        # 10 days overdue
        tone = choose_tone(sample_client.id, 10, test_db)
        assert tone == TemplateTone.firm

        # 15 days overdue
        tone = choose_tone(sample_client.id, 15, test_db)
        assert tone == TemplateTone.firm

        # 30 days overdue
        tone = choose_tone(sample_client.id, 30, test_db)
        assert tone == TemplateTone.firm

    def test_tone_with_nonexistent_client(self, test_db: Session):
        """Test tone selection with invalid client ID."""
        tone = choose_tone(99999, 5, test_db)
        assert tone == TemplateTone.neutral  # 5 days overdue -> neutral


class TestPaymentBehaviorAnalysis:
    """Test payment pattern analysis."""

    def test_basic_behavior_analysis(
        self, test_db: Session, sample_client, sample_invoices
    ):
        """Test basic payment behavior calculation."""
        behavior = analyze_payment_behavior(sample_client.id, test_db)

        assert isinstance(behavior, dict)
        assert "avg_days_late" in behavior
        assert "modal_day_of_week" in behavior
        assert "modal_hour" in behavior
        assert "payment_count" in behavior
        assert "preferred_weekday_name" in behavior

        # Should have analyzed 5 paid invoices
        assert behavior["payment_count"] == 5

        # Average lateness: (-2 + -1 + 4 + 2 + 1) / 5 = 0.8 days
        assert abs(behavior["avg_days_late"] - 0.8) < 0.1

        # Friday should be most common (3 out of 5 payments)
        assert behavior["modal_day_of_week"] == 4  # Friday
        assert behavior["preferred_weekday_name"] == "Friday"

    def test_behavior_analysis_no_history(self, test_db: Session):
        """Test behavior analysis with no payment history."""
        # Create client with no invoices
        client = Client(
            name="No History", email="none@test.com", timezone="UTC", user_id=1
        )
        test_db.add(client)
        test_db.flush()

        behavior = analyze_payment_behavior(client.id, test_db)

        # Should return defaults
        assert behavior["payment_count"] == 0
        assert behavior["avg_days_late"] == 0.0
        assert behavior["modal_day_of_week"] == 4  # Friday default
        assert behavior["modal_hour"] == 14  # 2 PM default

    def test_behavior_analysis_invalid_client(self, test_db: Session):
        """Test behavior analysis with invalid client."""
        behavior = analyze_payment_behavior(99999, test_db)

        # Should return defaults safely
        assert behavior["payment_count"] == 0
        assert behavior["avg_days_late"] == 0.0


class TestScheduleOptimization:
    """Test reminder scheduling optimization."""

    def test_next_send_times_generation(
        self, test_db: Session, sample_client, sample_invoices
    ):
        """Test generation of optimal reminder times."""
        # Get the unpaid invoice
        unpaid_invoice = [
            inv for inv in sample_invoices if inv.status == InvoiceStatus.pending
        ][0]

        send_times = next_send_times(unpaid_invoice.id, test_db, reminder_count=3)

        assert len(send_times) == 3

        # All times should be datetime objects with timezone info
        for send_time in send_times:
            assert isinstance(send_time, datetime)
            assert send_time.tzinfo is not None

        # Times should be in chronological order
        for i in range(len(send_times) - 1):
            assert send_times[i] <= send_times[i + 1]

    def test_send_times_client_timezone_handling(
        self, test_db: Session, sample_client, sample_invoices
    ):
        """Test that send times respect client timezone preferences."""
        unpaid_invoice = [
            inv for inv in sample_invoices if inv.status == InvoiceStatus.pending
        ][0]

        send_times = next_send_times(unpaid_invoice.id, test_db, reminder_count=2)

        # Convert back to client timezone to check hour
        from zoneinfo import ZoneInfo

        ny_tz = ZoneInfo("America/New_York")

        for send_time in send_times:
            local_time = send_time.astimezone(ny_tz)
            # Should be around the preferred hour (14-15 based on payment history)
            assert 14 <= local_time.hour <= 16

    def test_send_times_invalid_invoice(self, test_db: Session):
        """Test send times with invalid invoice."""
        send_times = next_send_times(99999, test_db)
        assert send_times == []


class TestModularInterface:
    """Test modular predictor interfaces."""

    def test_tone_predictor_interface(self, test_db: Session, sample_client):
        """Test TonePredictor interface."""
        predictor = get_tone_predictor()
        assert isinstance(predictor, TonePredictor)

        # Test prediction
        tone = predictor.predict(sample_client.id, 5, test_db)
        assert isinstance(tone, TemplateTone)
        assert tone == TemplateTone.neutral

        # Test training interface (should not raise error)
        predictor.train([])

    def test_schedule_predictor_interface(
        self, test_db: Session, sample_client, sample_invoices
    ):
        """Test SchedulePredictor interface."""
        predictor = get_schedule_predictor()
        assert isinstance(predictor, SchedulePredictor)

        # Test client analysis
        behavior = predictor.analyze_client(sample_client.id, test_db)
        assert isinstance(behavior, dict)
        assert behavior["payment_count"] > 0

        # Test schedule prediction
        unpaid_invoice = [
            inv for inv in sample_invoices if inv.status == InvoiceStatus.pending
        ][0]
        schedule = predictor.predict(unpaid_invoice.id, test_db)
        assert isinstance(schedule, list)
        assert len(schedule) > 0

        # Test training interface
        predictor.train([])

    def test_factory_functions(self):
        """Test factory functions return correct types."""
        tone_predictor = get_tone_predictor()
        schedule_predictor = get_schedule_predictor()

        assert isinstance(tone_predictor, TonePredictor)
        assert isinstance(schedule_predictor, SchedulePredictor)


class TestEdgeCases:
    """Test edge cases and error handling."""

    def test_timezone_handling_edge_cases(self, test_db: Session):
        """Test handling of various timezone edge cases."""
        # Client with invalid timezone
        client = Client(
            name="Bad TZ Client",
            email="badtz@test.com",
            timezone="Invalid/Timezone",
            user_id=1,
        )
        test_db.add(client)
        test_db.flush()

        # Should handle gracefully
        behavior = analyze_payment_behavior(client.id, test_db)
        assert behavior is not None

    def test_large_payment_delays(self, test_db: Session, sample_client):
        """Test handling of extremely late payments."""
        # Create invoice with very late payment
        base_date = datetime.now(timezone.utc) - timedelta(days=30)
        invoice = Invoice(
            client_id=sample_client.id,
            user_id=1,
            amount_cents=5000,
            currency="USD",
            due_date=(base_date - timedelta(days=60)).date(),
            status=InvoiceStatus.paid,
            paid_at=base_date,  # ~60 days late
        )
        test_db.add(invoice)
        test_db.flush()

        behavior = analyze_payment_behavior(sample_client.id, test_db)

        # Should still work and produce reasonable results
        assert behavior["payment_count"] > 0
        assert isinstance(behavior["avg_days_late"], float)

    def test_early_payments_handling(self, test_db: Session):
        """Test handling of consistently early payments."""
        client = Client(
            name="Early Payer", email="early@test.com", timezone="UTC", user_id=1
        )
        test_db.add(client)
        test_db.flush()

        # Create invoices with early payments
        base_date = datetime.now(timezone.utc) - timedelta(days=30)
        for i in range(3):
            due_date = (base_date + timedelta(days=i * 10)).date()
            paid_date = due_date - timedelta(days=5)  # Always 5 days early

            invoice = Invoice(
                client_id=client.id,
                user_id=1,
                amount_cents=10000,
                currency="USD",
                due_date=due_date,
                status=InvoiceStatus.paid,
                paid_at=datetime.combine(paid_date, datetime.min.time()).replace(
                    tzinfo=timezone.utc
                ),
            )
            test_db.add(invoice)

        test_db.flush()

        behavior = analyze_payment_behavior(client.id, test_db)

        # Should show negative average (early payments)
        assert behavior["avg_days_late"] < 0
        assert behavior["payment_count"] == 3


class TestIntegration:
    """Integration tests combining multiple features."""

    def test_full_workflow(self, test_db: Session, sample_client, sample_invoices):
        """Test complete workflow from behavior analysis to scheduling."""
        # Analyze behavior
        behavior = analyze_payment_behavior(sample_client.id, test_db)
        assert behavior["payment_count"] > 0

        # Generate schedule
        unpaid_invoice = [
            inv for inv in sample_invoices if inv.status == InvoiceStatus.pending
        ][0]
        schedule = next_send_times(unpaid_invoice.id, test_db)
        assert len(schedule) > 0

        # Test tone selection at different stages
        for days_overdue in [-1, 0, 5, 15]:
            tone = choose_tone(sample_client.id, days_overdue, test_db)
            assert isinstance(tone, TemplateTone)

        # Verify tone escalation
        assert choose_tone(sample_client.id, -1, test_db) == TemplateTone.friendly
        assert choose_tone(sample_client.id, 5, test_db) == TemplateTone.neutral
        assert choose_tone(sample_client.id, 15, test_db) == TemplateTone.firm
