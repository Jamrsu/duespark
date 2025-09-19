#!/usr/bin/env python3
"""
Demo script showcasing AI-lite features for tone presets and schedule heuristics.

This script demonstrates the ML-lite functionality including:
1. Tone escalation based on overdue days
2. Payment behavior analysis from historical data
3. Optimal reminder scheduling based on client patterns
"""

import os
import sys
from datetime import datetime, date, timezone, timedelta
from app.database import SessionLocal, Base, engine
from app.models import User, Client, Invoice, InvoiceStatus, TemplateTone
from app.ai_heuristics import (
    choose_tone,
    analyze_payment_behavior,
    next_send_times,
    get_tone_predictor,
    get_schedule_predictor
)

def create_demo_data():
    """Create sample data to demonstrate AI features."""
    print("🔧 Creating demo data...")

    db = SessionLocal()
    try:
        # Clean existing data
        db.query(Invoice).delete()
        db.query(Client).delete()
        db.query(User).delete()

        # Create demo user
        user = User(
            email="demo@example.com",
            password_hash="demo_hash",
            email_verified=True,
            onboarding_status="completed"
        )
        db.add(user)
        db.flush()

        # Create demo clients with different payment patterns
        clients = []

        # Client 1: Early payer (East Coast)
        client1 = Client(
            name="Early Bird Inc",
            email="early@client.com",
            timezone="America/New_York",
            user_id=user.id
        )
        clients.append(client1)

        # Client 2: Late payer (West Coast)
        client2 = Client(
            name="Late Night Corp",
            email="late@client.com",
            timezone="America/Los_Angeles",
            user_id=user.id
        )
        clients.append(client2)

        # Client 3: Consistent Friday payer (London)
        client3 = Client(
            name="Friday Finance Ltd",
            email="friday@client.com",
            timezone="Europe/London",
            user_id=user.id
        )
        clients.append(client3)

        for client in clients:
            db.add(client)
        db.flush()

        # Create invoices with different payment patterns
        invoices = []

        # Use current year and adjust dates to be valid
        current_year = datetime.now().year
        base_month = max(1, datetime.now().month - 3)  # Start 3 months ago

        # Client 1: Consistently early payments (2-3 days early)
        for i in range(6):
            due_date = date(current_year, base_month, min(28, 5 + i*4))  # Every 4 days, max day 28
            paid_date = due_date - timedelta(days=2 + (i % 2))  # 2-3 days early
            paid_time = datetime.combine(paid_date, datetime.min.time().replace(hour=10)).replace(tzinfo=timezone.utc)

            invoice = Invoice(
                client_id=client1.id,
                user_id=user.id,
                amount_cents=50000,  # $500
                currency="USD",
                due_date=due_date,
                status=InvoiceStatus.paid,
                paid_at=paid_time,
                external_id=f"early-{i}"
            )
            invoices.append(invoice)

        # Client 2: Consistently late payments (3-7 days late)
        for i in range(5):
            due_date = date(current_year, base_month, min(28, 10 + i*3))  # Every 3 days, max day 28
            paid_date = due_date + timedelta(days=3 + (i % 5))  # 3-7 days late
            paid_time = datetime.combine(paid_date, datetime.min.time().replace(hour=17)).replace(tzinfo=timezone.utc)

            invoice = Invoice(
                client_id=client2.id,
                user_id=user.id,
                amount_cents=100000,  # $1000
                currency="USD",
                due_date=due_date,
                status=InvoiceStatus.paid,
                paid_at=paid_time,
                external_id=f"late-{i}"
            )
            invoices.append(invoice)

        # Client 3: Friday payer pattern (always pays on Friday)
        for i in range(4):
            due_date = date(current_year, base_month, min(28, 15 + i*2))  # Every 2 days, max day 28
            # Find next Friday after due date
            days_to_friday = (4 - due_date.weekday()) % 7
            if days_to_friday == 0 and due_date.weekday() == 4:  # If due date is Friday
                paid_date = due_date
            else:
                paid_date = due_date + timedelta(days=days_to_friday)
            paid_time = datetime.combine(paid_date, datetime.min.time().replace(hour=14)).replace(tzinfo=timezone.utc)

            invoice = Invoice(
                client_id=client3.id,
                user_id=user.id,
                amount_cents=75000,  # $750
                currency="USD",
                due_date=due_date,
                status=InvoiceStatus.paid,
                paid_at=paid_time,
                external_id=f"friday-{i}"
            )
            invoices.append(invoice)

        for invoice in invoices:
            db.add(invoice)

        # Add current unpaid invoices for scheduling demo
        future_invoices = []
        for i, client in enumerate(clients):
            future_due = date.today() + timedelta(days=7 + i*2)
            future_invoice = Invoice(
                client_id=client.id,
                user_id=user.id,
                amount_cents=80000,  # $800
                currency="USD",
                due_date=future_due,
                status=InvoiceStatus.pending,
                external_id=f"future-{client.id}"
            )
            future_invoices.append(future_invoice)
            db.add(future_invoice)

        db.commit()
        print("✅ Demo data created successfully!")
        return clients, future_invoices

    except Exception as e:
        db.rollback()
        print(f"❌ Error creating demo data: {e}")
        raise
    finally:
        db.close()

def demo_tone_selection():
    """Demonstrate tone escalation logic."""
    print("\n🎭 TONE SELECTION DEMO")
    print("=" * 50)

    db = SessionLocal()
    try:
        client = db.query(Client).first()
        if not client:
            print("❌ No clients found!")
            return

        print(f"Client: {client.name}")
        print("\nTone escalation based on overdue days:")

        # Test different overdue scenarios
        scenarios = [
            (-2, "Invoice due in 2 days"),
            (0, "Invoice due today"),
            (2, "Invoice 2 days overdue"),
            (5, "Invoice 5 days overdue"),
            (15, "Invoice 15 days overdue"),
            (30, "Invoice 30 days overdue")
        ]

        for days_overdue, description in scenarios:
            tone = choose_tone(client.id, days_overdue, db)
            print(f"  📅 {description:<25} → {tone.value.upper()}")

    finally:
        db.close()

def demo_payment_behavior_analysis():
    """Demonstrate payment behavior analysis."""
    print("\n📊 PAYMENT BEHAVIOR ANALYSIS")
    print("=" * 50)

    db = SessionLocal()
    try:
        clients = db.query(Client).all()

        for client in clients:
            print(f"\n🏢 {client.name} ({client.timezone}):")
            behavior = analyze_payment_behavior(client.id, db)

            if behavior['payment_count'] == 0:
                print("  📝 No payment history available")
                continue

            print(f"  📈 Payment Count: {behavior['payment_count']}")
            print(f"  ⏰ Average Days Late: {behavior['avg_days_late']}")
            print(f"  📅 Preferred Day: {behavior['preferred_weekday_name']}")
            print(f"  🕐 Preferred Hour: {behavior['modal_hour']}:00")

            # Interpret the behavior
            avg_late = behavior['avg_days_late']
            if avg_late < -1:
                print("  🟢 Consistent early payer")
            elif avg_late > 5:
                print("  🔴 Consistently late payer")
            else:
                print("  🟡 Generally on-time payer")

    finally:
        db.close()

def demo_schedule_optimization():
    """Demonstrate optimal reminder scheduling."""
    print("\n📅 REMINDER SCHEDULE OPTIMIZATION")
    print("=" * 50)

    db = SessionLocal()
    try:
        # Get unpaid invoices
        unpaid_invoices = db.query(Invoice).filter(
            Invoice.status == InvoiceStatus.pending
        ).all()

        for invoice in unpaid_invoices:
            client = db.query(Client).filter(Client.id == invoice.client_id).first()
            print(f"\n📄 Invoice for {client.name}")
            print(f"   💰 Amount: ${invoice.amount_cents/100:.2f}")
            print(f"   📅 Due Date: {invoice.due_date}")

            # Generate optimal reminder times
            reminder_times = next_send_times(invoice.id, db, reminder_count=3)

            if not reminder_times:
                print("   ❌ Could not generate reminder schedule")
                continue

            print("   🔔 Optimal Reminder Schedule:")
            for i, send_time in enumerate(reminder_times, 1):
                # Convert to client timezone for display
                try:
                    from zoneinfo import ZoneInfo
                    client_tz = ZoneInfo(client.timezone)
                    local_time = send_time.astimezone(client_tz)

                    days_from_due = (send_time.date() - invoice.due_date).days
                    timing = "before due" if days_from_due < 0 else "after due" if days_from_due > 0 else "on due date"

                    print(f"     {i}. {local_time.strftime('%Y-%m-%d %H:%M %Z')} ({abs(days_from_due)} days {timing})")
                except Exception:
                    print(f"     {i}. {send_time.strftime('%Y-%m-%d %H:%M UTC')}")

    finally:
        db.close()

def demo_modular_interface():
    """Demonstrate modular predictor interfaces."""
    print("\n🔧 MODULAR INTERFACE DEMO")
    print("=" * 50)

    # Show how to use factory functions
    tone_predictor = get_tone_predictor()
    schedule_predictor = get_schedule_predictor()

    print("🏭 Factory Functions:")
    print(f"  Tone Predictor: {type(tone_predictor).__name__}")
    print(f"  Schedule Predictor: {type(schedule_predictor).__name__}")

    # Show modular prediction
    db = SessionLocal()
    try:
        client = db.query(Client).first()
        if client:
            print(f"\n🔮 Predictions for {client.name}:")

            # Tone prediction
            tone = tone_predictor.predict(client.id, 7, db)
            print(f"  🎭 Tone for 7 days overdue: {tone.value}")

            # Behavior analysis
            behavior = schedule_predictor.analyze_client(client.id, db)
            print(f"  📊 Payment pattern: {behavior['preferred_weekday_name']}s at {behavior['modal_hour']}:00")

    finally:
        db.close()

def main():
    """Run the complete AI features demo."""
    print("🤖 AI-LITE FEATURES DEMO")
    print("🧠 Tone Presets & Schedule Heuristics")
    print("=" * 60)

    try:
        # Setup database
        Base.metadata.create_all(bind=engine)

        # Create demo data
        clients, future_invoices = create_demo_data()

        # Run demos
        demo_tone_selection()
        demo_payment_behavior_analysis()
        demo_schedule_optimization()
        demo_modular_interface()

        print("\n" + "=" * 60)
        print("✅ Demo completed successfully!")
        print("\n📋 KEY FEATURES DEMONSTRATED:")
        print("  🎭 Automatic tone escalation (friendly → neutral → firm)")
        print("  📊 Payment behavior analysis from historical data")
        print("  🕐 Client timezone-aware scheduling")
        print("  📅 Optimal reminder timing based on payment patterns")
        print("  🔧 Modular interface for future ML model integration")
        print("\n🔗 Export Functions Available:")
        print("  • choose_tone(client_id, overdue_days, db)")
        print("  • analyze_payment_behavior(client_id, db)")
        print("  • next_send_times(invoice_id, db)")

    except Exception as e:
        print(f"❌ Demo failed: {e}")
        return 1

    return 0

if __name__ == "__main__":
    sys.exit(main())