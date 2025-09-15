"""
AI-lite features for tone presets and schedule heuristics.

This module provides pragmatic ML-lite functionality to:
1. Automatically escalate reminder tones based on overdue days
2. Analyze client payment behavior to optimize reminder scheduling
3. Provide modular interfaces for future ML model integration

The approach uses simple heuristics that can be easily replaced with
learned models as more data becomes available.
"""

from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple
from sqlalchemy.orm import Session
from app.models import Client, Invoice, TemplateTone
from zoneinfo import ZoneInfo
import logging

logger = logging.getLogger(__name__)

# Configuration constants - can be moved to environment variables
DEFAULT_TONE_THRESHOLDS = {
    "friendly": 0,      # 0-2 days overdue
    "neutral": 3,       # 3-9 days overdue
    "firm": 10          # 10+ days overdue
}

DEFAULT_REMINDER_OFFSET_DAYS = 1  # Send reminders 1 day before due date by default
ADAPTIVE_WINDOW_DAYS = 90        # Look at last 90 days for behavior analysis


def choose_tone(client_id: int, overdue_days: int, db: Session) -> TemplateTone:
    """
    Select appropriate reminder tone based on client and overdue status.

    Args:
        client_id: ID of the client
        overdue_days: Number of days past due date (negative if not yet due)
        db: Database session

    Returns:
        TemplateTone enum value (friendly, neutral, firm)

    Example:
        # Invoice due tomorrow
        tone = choose_tone(client_id=123, overdue_days=-1, db=db)  # -> TemplateTone.friendly

        # Invoice 5 days overdue
        tone = choose_tone(client_id=123, overdue_days=5, db=db)   # -> TemplateTone.neutral

        # Invoice 15 days overdue
        tone = choose_tone(client_id=123, overdue_days=15, db=db)  # -> TemplateTone.firm
    """
    try:
        # Get client for potential future customization
        client = db.query(Client).filter(Client.id == client_id).first()
        if not client:
            logger.warning(f"Client {client_id} not found, using default tone logic")

        # Apply escalation rules based on overdue days
        if overdue_days < DEFAULT_TONE_THRESHOLDS["neutral"]:
            return TemplateTone.friendly
        elif overdue_days < DEFAULT_TONE_THRESHOLDS["firm"]:
            return TemplateTone.neutral
        else:
            return TemplateTone.firm

    except Exception as e:
        logger.error(f"Error in choose_tone for client {client_id}: {e}")
        return TemplateTone.friendly  # Safe default


def analyze_payment_behavior(client_id: int, db: Session) -> Dict[str, any]:
    """
    Analyze client payment patterns from historical invoice data.

    Args:
        client_id: ID of the client to analyze
        db: Database session

    Returns:
        Dictionary containing:
        - avg_days_late: Average days late (negative = early payment)
        - modal_day_of_week: Most common payment day (0=Monday, 6=Sunday)
        - modal_hour: Most common payment hour (0-23)
        - payment_count: Number of paid invoices analyzed
        - preferred_weekday_name: Human-readable day name

    Example:
        behavior = analyze_payment_behavior(client_id=123, db=db)
        # Returns: {
        #     'avg_days_late': 2.5,
        #     'modal_day_of_week': 4,  # Friday
        #     'modal_hour': 14,        # 2 PM
        #     'payment_count': 8,
        #     'preferred_weekday_name': 'Friday'
        # }
    """
    try:
        # Get client and timezone
        client = db.query(Client).filter(Client.id == client_id).first()
        if not client:
            logger.warning(f"Client {client_id} not found")
            return _default_behavior()

        client_tz = _get_client_timezone(client)

        # Get paid invoices within adaptive window
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=ADAPTIVE_WINDOW_DAYS)

        paid_invoices = db.query(Invoice).filter(
            Invoice.client_id == client_id,
            Invoice.paid_at.isnot(None),
            Invoice.due_date.isnot(None),
            Invoice.paid_at >= cutoff_date
        ).all()

        if not paid_invoices:
            logger.info(f"No payment history found for client {client_id}")
            return _default_behavior()

        # Analyze payment timing patterns
        late_days = []
        payment_times = []

        for invoice in paid_invoices:
            # Calculate days late/early
            days_diff = (invoice.paid_at.date() - invoice.due_date).days
            late_days.append(days_diff)

            # Convert payment time to client timezone
            paid_at_local = _to_client_timezone(invoice.paid_at, client_tz)
            payment_times.append((paid_at_local.weekday(), paid_at_local.hour))

        # Compute statistics
        avg_late = sum(late_days) / len(late_days) if late_days else 0.0

        # Find modal payment day and hour
        modal_day, modal_hour = _find_modal_time(payment_times)
        weekday_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

        result = {
            'avg_days_late': round(avg_late, 2),
            'modal_day_of_week': modal_day,
            'modal_hour': modal_hour,
            'payment_count': len(paid_invoices),
            'preferred_weekday_name': weekday_names[modal_day]
        }

        logger.info(f"Payment behavior for client {client_id}: {result}")
        return result

    except Exception as e:
        logger.error(f"Error analyzing payment behavior for client {client_id}: {e}")
        return _default_behavior()


def next_send_times(invoice_id: int, db: Session,
                   reminder_count: int = 3) -> List[datetime]:
    """
    Generate optimal reminder send times for an invoice based on client behavior.

    Args:
        invoice_id: ID of the invoice
        db: Database session
        reminder_count: Number of reminder times to generate

    Returns:
        List of datetime objects for sending reminders, in chronological order

    Example:
        times = next_send_times(invoice_id=456, db=db, reminder_count=3)
        # Returns: [
        #     datetime(2024, 1, 15, 14, 0),  # 3 days before due, at preferred hour
        #     datetime(2024, 1, 17, 14, 0),  # 1 day before due
        #     datetime(2024, 1, 20, 14, 0)   # 2 days after due
        # ]
    """
    try:
        # Get invoice and client
        invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not invoice:
            logger.error(f"Invoice {invoice_id} not found")
            return []

        client = db.query(Client).filter(Client.id == invoice.client_id).first()
        if not client:
            logger.error(f"Client for invoice {invoice_id} not found")
            return []

        # Analyze client payment behavior
        behavior = analyze_payment_behavior(client.id, db)
        client_tz = _get_client_timezone(client)

        # Calculate optimal reminder schedule
        send_times = []
        due_date = invoice.due_date
        preferred_hour = behavior['modal_hour']

        # Adjust for client's payment lateness pattern
        avg_late = behavior['avg_days_late']

        # Schedule reminders around due date, adjusted for client behavior
        reminder_offsets = _calculate_reminder_offsets(avg_late, reminder_count)

        for offset_days in reminder_offsets:
            reminder_date = due_date + timedelta(days=offset_days)

            # Set time to client's preferred hour in their timezone
            reminder_datetime = datetime.combine(
                reminder_date,
                datetime.min.time().replace(hour=preferred_hour)
            )

            # Convert to timezone-aware datetime in client timezone, then to UTC
            try:
                local_dt = client_tz.localize(reminder_datetime)
                utc_dt = local_dt.astimezone(timezone.utc)
            except Exception:
                # Fallback: create UTC datetime directly
                utc_dt = reminder_datetime.replace(tzinfo=timezone.utc)

            send_times.append(utc_dt)

        # Sort chronologically
        send_times.sort()

        logger.info(f"Generated {len(send_times)} reminder times for invoice {invoice_id}")
        return send_times

    except Exception as e:
        logger.error(f"Error generating send times for invoice {invoice_id}: {e}")
        return []


# Helper functions

def _default_behavior() -> Dict[str, any]:
    """Return default behavior when no payment history exists."""
    return {
        'avg_days_late': 0.0,
        'modal_day_of_week': 4,  # Friday
        'modal_hour': 14,        # 2 PM
        'payment_count': 0,
        'preferred_weekday_name': 'Friday'
    }


def _get_client_timezone(client: Client) -> ZoneInfo:
    """Get client timezone, defaulting to UTC if invalid."""
    try:
        return ZoneInfo(client.timezone or 'UTC')
    except Exception:
        logger.warning(f"Invalid timezone {client.timezone} for client {client.id}")
        return ZoneInfo('UTC')


def _to_client_timezone(dt: datetime, client_tz: ZoneInfo) -> datetime:
    """Convert datetime to client timezone."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(client_tz)


def _find_modal_time(payment_times: List[Tuple[int, int]]) -> Tuple[int, int]:
    """Find most common day of week and hour from payment times."""
    if not payment_times:
        return (4, 14)  # Default to Friday 2 PM

    # Count occurrences
    time_counts = {}
    for day, hour in payment_times:
        time_counts[(day, hour)] = time_counts.get((day, hour), 0) + 1

    # Find most common
    modal_time = max(time_counts.items(), key=lambda x: x[1])[0]
    return modal_time


def _calculate_reminder_offsets(avg_late: float, reminder_count: int) -> List[int]:
    """
    Calculate reminder day offsets based on client payment lateness.

    Args:
        avg_late: Average days late (negative = early payments)
        reminder_count: Number of reminders to schedule

    Returns:
        List of day offsets from due date (negative = before due)
    """
    # Base schedule: before due, at due, after due
    base_offsets = [-3, -1, 2]

    # Adjust based on client behavior
    if avg_late > 5:  # Chronically late clients
        # Send earlier and more frequently
        adjusted_offsets = [-7, -3, -1, 3, 7]
    elif avg_late < -2:  # Early payers
        # Fewer, later reminders
        adjusted_offsets = [-1, 1]
    else:
        # Standard schedule
        adjusted_offsets = base_offsets

    # Return requested number of reminders
    return adjusted_offsets[:reminder_count]


# Modular interface for future ML integration

class TonePredictor:
    """
    Modular interface for tone prediction.
    Can be swapped with ML models in the future.
    """

    def predict(self, client_id: int, overdue_days: int, db: Session) -> TemplateTone:
        """Predict appropriate tone. Currently uses heuristic rules."""
        return choose_tone(client_id, overdue_days, db)

    def train(self, training_data: List[Dict]) -> None:
        """Training interface for future ML models."""
        logger.info("Heuristic tone predictor does not require training")
        pass


class SchedulePredictor:
    """
    Modular interface for schedule prediction.
    Can be swapped with ML models in the future.
    """

    def predict(self, invoice_id: int, db: Session) -> List[datetime]:
        """Predict optimal reminder times."""
        return next_send_times(invoice_id, db)

    def analyze_client(self, client_id: int, db: Session) -> Dict[str, any]:
        """Analyze client payment behavior."""
        return analyze_payment_behavior(client_id, db)

    def train(self, training_data: List[Dict]) -> None:
        """Training interface for future ML models."""
        logger.info("Heuristic schedule predictor does not require training")
        pass


# Factory functions for easy model swapping

def get_tone_predictor() -> TonePredictor:
    """Get tone predictor instance. Can be configured to return ML models."""
    return TonePredictor()


def get_schedule_predictor() -> SchedulePredictor:
    """Get schedule predictor instance. Can be configured to return ML models."""
    return SchedulePredictor()