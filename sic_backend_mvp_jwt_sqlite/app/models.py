
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Text, Numeric, Date, func, JSON
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.database import Base
import enum
import os

# Use JSONB for PostgreSQL, JSON for SQLite
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")
if DATABASE_URL.startswith("postgresql"):
    from sqlalchemy.dialects.postgresql import JSONB as JSONBType
else:
    JSONBType = JSON

class InvoiceStatus(str, enum.Enum):
    draft = "draft"
    pending = "pending"
    paid = "paid"
    overdue = "overdue"
    cancelled = "cancelled"

class ReminderStatus(str, enum.Enum):
    scheduled = "scheduled"
    sent = "sent"
    failed = "failed"
    cancelled = "cancelled"

class Channel(str, enum.Enum):
    email = "email"
    sms = "sms"
    whatsapp = "whatsapp"

class UserRole(str, enum.Enum):
    owner = "owner"
    member = "member"
    admin = "admin"

class OnboardingStatus(str, enum.Enum):
    not_started = "not_started"
    account_created = "account_created"
    email_verified = "email_verified"
    payment_configured = "payment_configured"
    completed = "completed"

class EventType(str, enum.Enum):
    onboarding_started = "onboarding_started"
    account_created = "account_created"
    email_verification_sent = "email_verification_sent"
    email_verified = "email_verified"
    stripe_connected = "stripe_connected"
    manual_payment_selected = "manual_payment_selected"
    sample_data_imported = "sample_data_imported"
    first_invoice_imported = "first_invoice_imported"
    onboarding_completed = "onboarding_completed"
    onboarding_skipped = "onboarding_skipped"

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole, name="userrole"), server_default=UserRole.owner.value, nullable=False)

    # Onboarding fields
    email_verified: Mapped[bool] = mapped_column(server_default='false', nullable=False)
    email_verification_token: Mapped[str] = mapped_column(String(255), nullable=True)
    onboarding_status: Mapped[OnboardingStatus] = mapped_column(
        Enum(OnboardingStatus, name="onboardingstatus"),
        server_default=OnboardingStatus.not_started.value,
        nullable=False
    )
    onboarding_completed_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), nullable=True)

    # Payment configuration
    stripe_account_id: Mapped[str] = mapped_column(String(255), nullable=True)
    payment_method: Mapped[str] = mapped_column(String(50), nullable=True)  # 'stripe' or 'manual'

    created_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    clients = relationship("Client", back_populates="owner", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="owner", cascade="all, delete-orphan")
    events = relationship("Event", back_populates="user", cascade="all, delete-orphan")

class Client(Base):
    __tablename__ = "clients"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    timezone: Mapped[str] = mapped_column(String(64), default="UTC")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    payment_behavior_score: Mapped[float | None] = mapped_column(Numeric(4,2), nullable=True)
    created_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    owner = relationship("User", back_populates="clients")
    invoices = relationship("Invoice", back_populates="client", cascade="all, delete-orphan")

class Invoice(Base):
    __tablename__ = "invoices"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id", ondelete="CASCADE"), index=True, nullable=False)
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    due_date: Mapped["Date"] = mapped_column(Date, nullable=False)
    status: Mapped[InvoiceStatus] = mapped_column(Enum(InvoiceStatus, name="invoicestatus"), default=InvoiceStatus.pending, index=True, nullable=False)
    external_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    class InvoiceSource(str, enum.Enum):
        manual = "manual"
        stripe = "stripe"
        paypal = "paypal"
        xero = "xero"
    source: Mapped["InvoiceSource"] = mapped_column(Enum(InvoiceSource, name="invoicesource"), default=InvoiceSource.manual)
    payment_link_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    created_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), server_default=func.now())
    paid_at: Mapped["DateTime | None"] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    owner = relationship("User", back_populates="invoices")
    client = relationship("Client", back_populates="invoices")
    reminders = relationship("Reminder", back_populates="invoice", cascade="all, delete-orphan")

class Reminder(Base):
    __tablename__ = "reminders"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    invoice_id: Mapped[int] = mapped_column(ForeignKey("invoices.id", ondelete="CASCADE"), index=True, nullable=False)
    send_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), index=True, nullable=False)
    template_id: Mapped[int | None] = mapped_column(ForeignKey("templates.id", ondelete="SET NULL"), index=True, nullable=True)
    channel: Mapped[Channel] = mapped_column(Enum(Channel, name="channel"), default=Channel.email, nullable=False)
    status: Mapped[ReminderStatus] = mapped_column(Enum(ReminderStatus, name="reminderstatus"), default=ReminderStatus.scheduled, nullable=False, index=True)
    subject: Mapped[str | None] = mapped_column(String(255), nullable=True)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    meta: Mapped[dict | None] = mapped_column(JSONBType, nullable=True)
    sent_at: Mapped["DateTime | None"] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    invoice = relationship("Invoice", back_populates="reminders")

class TemplateTone(str, enum.Enum):
    friendly = "friendly"
    neutral = "neutral"
    firm = "firm"

class Template(Base):
    __tablename__ = "templates"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    tone: Mapped[TemplateTone] = mapped_column(Enum(TemplateTone, name="templatetone"), nullable=False)
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    body_markdown: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class Event(Base):
    __tablename__ = "events"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    entity_type: Mapped[str] = mapped_column(String(32), nullable=False)
    entity_id: Mapped[int] = mapped_column(Integer, nullable=False)
    event_type: Mapped[str] = mapped_column(String(32), nullable=False)
    payload: Mapped[dict | None] = mapped_column(JSONBType, nullable=True)
    created_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="events")

class StripeAccount(Base):
    __tablename__ = "stripe_accounts"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    stripe_account_id: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    access_token: Mapped[str] = mapped_column(String(255), nullable=False)
    refresh_token: Mapped[str | None] = mapped_column(String(255), nullable=True)
    scope: Mapped[str | None] = mapped_column(String(64), nullable=True)
    livemode: Mapped[bool] = mapped_column(Integer, default=0)
    created_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class DeadLetter(Base):
    __tablename__ = "dead_letters"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    kind: Mapped[str] = mapped_column(String(64), index=True)  # e.g., webhook_stripe
    payload: Mapped[dict] = mapped_column(JSONBType, nullable=False)
    error: Mapped[str] = mapped_column(Text, nullable=False)
    retries: Mapped[int] = mapped_column(Integer, default=0)
    next_attempt_at: Mapped["DateTime | None"] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Outbox(Base):
    __tablename__ = "outbox"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    topic: Mapped[str] = mapped_column(String(64), index=True)  # e.g., email.send
    payload: Mapped[dict] = mapped_column(JSONBType, nullable=False)
    status: Mapped[str] = mapped_column(String(16), index=True, default="pending")
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    next_attempt_at: Mapped["DateTime | None"] = mapped_column(DateTime(timezone=True), nullable=True)
    dispatched_at: Mapped["DateTime | None"] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
