from datetime import date, datetime, timedelta
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128, strip_whitespace=True)
    referral_code: Optional[str] = Field(default=None, max_length=50, strip_whitespace=True)

    @field_validator('password')
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        return v


class UserOut(BaseModel):
    id: int
    email: EmailStr
    model_config = ConfigDict(from_attributes=True)


class ClientCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255, strip_whitespace=True)
    email: EmailStr
    contact_name: Optional[str] = Field(default=None, max_length=255, strip_whitespace=True)
    contact_phone: Optional[str] = Field(default=None, max_length=20, strip_whitespace=True)
    timezone: str = Field(default="UTC", max_length=64)
    notes: Optional[str] = Field(default=None, max_length=1000)

    @field_validator('timezone')
    @classmethod
    def validate_timezone(cls, v: str) -> str:
        try:
            from zoneinfo import ZoneInfo
            ZoneInfo(v)
            return v
        except Exception:
            return "UTC"  # Fallback to UTC for invalid timezones


class ClientUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255, strip_whitespace=True)
    email: Optional[EmailStr] = None
    contact_name: Optional[str] = Field(default=None, max_length=255, strip_whitespace=True)
    contact_phone: Optional[str] = Field(default=None, max_length=20, strip_whitespace=True)
    timezone: Optional[str] = Field(default=None, max_length=64)
    notes: Optional[str] = Field(default=None, max_length=1000)

    @field_validator('timezone')
    @classmethod
    def validate_timezone(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        try:
            from zoneinfo import ZoneInfo
            ZoneInfo(v)
            return v
        except Exception:
            return "UTC"  # Fallback to UTC for invalid timezones


class ClientOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    timezone: str
    notes: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class InvoiceCreate(BaseModel):
    client_id: int = Field(gt=0)
    amount_cents: int = Field(gt=0, le=999999999)  # Max $9,999,999.99
    currency: str = Field(default="USD", strip_whitespace=True)
    due_date: date
    status: Literal["draft", "pending", "paid", "overdue", "cancelled"] = "pending"
    external_id: Optional[str] = Field(default=None, max_length=255, strip_whitespace=True)
    source: str = Field(default="manual", max_length=32)

    @field_validator('currency')
    @classmethod
    def validate_currency(cls, v: str) -> str:
        # Strip and uppercase, ensure exactly 3 characters
        v_clean = v.strip().upper() if v else "USD"
        if len(v_clean) != 3:
            return "USD"  # Default to USD for invalid length

        # Only allow common currency codes
        allowed_currencies = {"USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CHF"}
        if v_clean not in allowed_currencies:
            return "USD"  # Default to USD for invalid currencies
        return v_clean

    @field_validator('due_date')
    @classmethod
    def validate_due_date(cls, v: date) -> date:
        from datetime import date as date_type
        today = date_type.today()
        if v < today:
            raise ValueError('Due date cannot be in the past')
        # Reasonable limit - max 5 years in the future
        max_future = today.replace(year=today.year + 5)
        if v > max_future:
            raise ValueError('Due date cannot be more than 5 years in the future')
        return v


class InvoiceUpdate(BaseModel):
    client_id: Optional[int] = None
    amount_cents: Optional[int] = Field(default=None, gt=0)
    currency: Optional[str] = None
    due_date: Optional[date] = None
    status: Optional[Literal["draft", "pending", "paid", "overdue", "cancelled"]] = None
    external_id: Optional[str] = None
    source: Optional[str] = None

    @field_validator("currency")
    @classmethod
    def normalize_currency_opt(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v2 = (v or "").strip().upper()
        if len(v2) != 3:
            raise ValueError("currency must be a 3-letter code")
        return v2


class InvoiceOut(BaseModel):
    id: int
    client_id: int
    amount_cents: int
    currency: str
    due_date: date
    status: str
    external_id: Optional[str] = None
    source: str
    payment_link_url: Optional[str] = None
    paid_at: Optional[datetime] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ReminderCreate(BaseModel):
    invoice_id: int = Field(gt=0)
    send_at: datetime
    channel: Literal["email", "sms", "whatsapp"] = "email"
    subject: Optional[str] = Field(default=None, max_length=255, strip_whitespace=True)
    body: Optional[str] = Field(default=None, max_length=5000, strip_whitespace=True)

    @field_validator('send_at')
    @classmethod
    def validate_send_at(cls, v: datetime) -> datetime:
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        if v < now - timedelta(minutes=5):
            raise ValueError('Reminder send time must be within the last 5 minutes or the future')
        # Limit to reasonable future (1 year)
        max_future = now.replace(year=now.year + 1)
        if v > max_future:
            raise ValueError('Reminder send time cannot be more than 1 year in the future')
        return v


class ReminderUpdate(BaseModel):
    send_at: Optional[datetime] = None
    channel: Optional[Literal["email", "sms", "whatsapp"]] = None
    status: Optional[Literal["scheduled", "sent", "failed", "cancelled"]] = None
    subject: Optional[str] = None
    body: Optional[str] = None


class ReminderOut(BaseModel):
    id: int
    invoice_id: int
    send_at: datetime
    channel: str
    status: str
    subject: Optional[str] = None
    body: Optional[str] = None
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


# Templates
class TemplateCreate(BaseModel):
    name: str
    tone: Literal["friendly", "neutral", "firm"]
    subject: str
    body_markdown: str


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    tone: Optional[Literal["friendly", "neutral", "firm"]] = None
    subject: Optional[str] = None
    body_markdown: Optional[str] = None


class TemplateOut(BaseModel):
    id: int
    user_id: int
    name: str
    tone: str
    subject: str
    body_markdown: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# Events
class EventOut(BaseModel):
    id: int
    user_id: int
    entity_type: str
    entity_id: int
    event_type: str
    payload: dict
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ReminderPreviewRequest(BaseModel):
    # Legacy path (uses invoice to derive variables)
    invoice_id: Optional[int] = None
    template_id: Optional[int] = None
    tone: Optional[Literal["friendly", "neutral", "firm"]] = None
    # New path (AC): explicit template name and variables
    template: Optional[str] = None
    variables: Optional[dict] = None


class ReminderPreviewOut(BaseModel):
    subject: str
    html: str
    text: str


class ReminderSendNowRequest(BaseModel):
    reminder_id: int
    force: bool = False


class ReminderSendNowOut(BaseModel):
    id: int
    status: str
    meta: dict | None = None


class DeadLetterOut(BaseModel):
    id: int
    kind: str
    payload: dict
    error: str
    retries: int
    next_attempt_at: Optional[datetime] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# Outbox
class OutboxOut(BaseModel):
    id: int
    topic: str
    payload: dict
    status: str
    attempts: int
    next_attempt_at: Optional[datetime] = None
    dispatched_at: Optional[datetime] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# Analytics
class AnalyticsStatusTotals(BaseModel):
    all: int
    draft: int
    pending: int
    paid: int
    overdue: int
    cancelled: int


class AnalyticsTopLateClient(BaseModel):
    client_id: int
    client_name: str
    client_email: str
    avg_days_late: float
    overdue_count: int
    total_overdue_amount_cents: int


class CurrencyRevenueBreakdown(BaseModel):
    currency: str
    earned_revenue: int
    outstanding_revenue: int
    total_revenue: int


class AnalyticsSummaryOut(BaseModel):
    totals: AnalyticsStatusTotals
    earned_revenue: int  # Total revenue from paid invoices (in cents)
    expected_payments_next_30d: int
    avg_days_to_pay: Optional[float] = None
    top_late_clients: list[AnalyticsTopLateClient]
    currency_breakdown: Optional[list[CurrencyRevenueBreakdown]] = None


class AnalyticsTimeseriesPoint(BaseModel):
    period: str  # ISO date string for the period start
    value: float
    count: Optional[int] = None  # Number of items in this period


class AnalyticsTimeseriesOut(BaseModel):
    metric: str
    interval: str
    points: list[AnalyticsTimeseriesPoint]
    total_value: float
    total_count: int


# Events
class EventCreate(BaseModel):
    entity_type: str
    entity_id: int
    event_type: str
    payload: Optional[dict] = None


class EventOut(BaseModel):
    id: int
    user_id: int
    entity_type: str
    entity_id: int
    event_type: str
    payload: Optional[dict] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)
