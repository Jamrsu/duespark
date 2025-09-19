import enum
import os

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

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
    pending = "pending"  # Temporary - for backward compatibility with existing data
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
    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="userrole"),
        server_default=UserRole.owner.value,
        nullable=False,
    )

    # Enterprise multi-tenancy
    # TODO: Temporarily commented out until Phase 4 migration is complete
    # organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"), nullable=True, index=True)
    # department_id: Mapped[int] = mapped_column(ForeignKey("departments.id"), nullable=True, index=True)

    # Referral system
    referral_code: Mapped[str] = mapped_column(
        String(16), unique=True, index=True, nullable=True
    )

    # Onboarding fields
    email_verified: Mapped[bool] = mapped_column(server_default="false", nullable=False)
    email_verification_token: Mapped[str] = mapped_column(String(255), nullable=True)
    onboarding_status: Mapped[OnboardingStatus] = mapped_column(
        Enum(OnboardingStatus, name="onboardingstatus"),
        server_default=OnboardingStatus.not_started.value,
        nullable=False,
    )
    onboarding_completed_at: Mapped["DateTime"] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Payment configuration
    stripe_account_id: Mapped[str] = mapped_column(String(255), nullable=True)
    payment_method: Mapped[str] = mapped_column(
        String(50), nullable=True
    )  # 'stripe' or 'manual'

    created_at: Mapped["DateTime"] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped["DateTime"] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    clients = relationship(
        "Client", back_populates="owner", cascade="all, delete-orphan"
    )
    invoices = relationship(
        "Invoice", back_populates="owner", cascade="all, delete-orphan"
    )
    events = relationship("Event", back_populates="user", cascade="all, delete-orphan")
    subscription = relationship(
        "Subscription",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )

    # Referral relationships
    referrals_made = relationship(
        "Referral",
        foreign_keys="Referral.referrer_user_id",
        back_populates="referrer",
        cascade="all, delete-orphan",
    )
    referral_received = relationship(
        "Referral",
        foreign_keys="Referral.referred_user_id",
        back_populates="referred_user",
        uselist=False,
    )
    subscription_credits = relationship(
        "SubscriptionCredit", back_populates="user", cascade="all, delete-orphan"
    )

    # Enterprise relationships - defined after enterprise models are imported


class Client(Base):
    __tablename__ = "clients"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    contact_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contact_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    timezone: Mapped[str] = mapped_column(String(64), default="UTC")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    payment_behavior_score: Mapped[float | None] = mapped_column(
        Numeric(4, 2), nullable=True
    )
    created_at: Mapped["DateTime"] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped["DateTime"] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    owner = relationship("User", back_populates="clients")
    invoices = relationship(
        "Invoice", back_populates="client", cascade="all, delete-orphan"
    )


class Invoice(Base):
    __tablename__ = "invoices"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    client_id: Mapped[int] = mapped_column(
        ForeignKey("clients.id", ondelete="CASCADE"), index=True, nullable=False
    )
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    due_date: Mapped["Date"] = mapped_column(Date, nullable=False)
    status: Mapped[InvoiceStatus] = mapped_column(
        Enum(InvoiceStatus, name="invoicestatus"),
        default=InvoiceStatus.pending,
        index=True,
        nullable=False,
    )
    external_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    class InvoiceSource(str, enum.Enum):
        manual = "manual"
        stripe = "stripe"
        paypal = "paypal"
        xero = "xero"

    source: Mapped["InvoiceSource"] = mapped_column(
        Enum(InvoiceSource, name="invoicesource"), default=InvoiceSource.manual
    )
    payment_link_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    created_at: Mapped["DateTime"] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    paid_at: Mapped["DateTime | None"] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    updated_at: Mapped["DateTime"] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    owner = relationship("User", back_populates="invoices")
    client = relationship("Client", back_populates="invoices")
    reminders = relationship(
        "Reminder", back_populates="invoice", cascade="all, delete-orphan"
    )

    # Add properties for compatibility with AI services
    @property
    def amount(self) -> float:
        return self.amount_cents / 100.0

    @property
    def number(self) -> str:
        return f"INV-{self.id:06d}"


class Reminder(Base):
    __tablename__ = "reminders"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    invoice_id: Mapped[int] = mapped_column(
        ForeignKey("invoices.id", ondelete="CASCADE"), index=True, nullable=False
    )
    send_at: Mapped["DateTime"] = mapped_column(
        DateTime(timezone=True), index=True, nullable=False
    )
    template_id: Mapped[int | None] = mapped_column(
        ForeignKey("templates.id", ondelete="SET NULL"), index=True, nullable=True
    )
    channel: Mapped[Channel] = mapped_column(
        Enum(Channel, name="channel"), default=Channel.email, nullable=False
    )
    status: Mapped[ReminderStatus] = mapped_column(
        Enum(ReminderStatus, name="reminderstatus"),
        default=ReminderStatus.scheduled,
        nullable=False,
        index=True,
    )
    subject: Mapped[str | None] = mapped_column(String(255), nullable=True)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    meta: Mapped[dict | None] = mapped_column(JSONBType, nullable=True)
    sent_at: Mapped["DateTime | None"] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped["DateTime"] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped["DateTime"] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    invoice = relationship("Invoice", back_populates="reminders")


class Payment(Base):
    """Payment records for tracking payments against invoices"""

    __tablename__ = "payments"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    invoice_id: Mapped[int] = mapped_column(
        ForeignKey("invoices.id", ondelete="CASCADE"), index=True, nullable=False
    )
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    payment_date: Mapped["DateTime"] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    payment_method: Mapped[str] = mapped_column(
        String(50), nullable=True
    )  # 'stripe', 'manual', etc.
    external_id: Mapped[str] = mapped_column(String(255), nullable=True)
    notes: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped["DateTime"] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Add a property to get amount in dollars
    @property
    def amount(self) -> float:
        return self.amount_cents / 100.0


class TemplateTone(str, enum.Enum):
    friendly = "friendly"
    neutral = "neutral"
    firm = "firm"


class SubscriptionTier(str, enum.Enum):
    freemium = "freemium"  # 5 clients, 20 invoices/month
    basic = "basic"  # Legacy alias retained for compatibility
    professional = "professional"  # $29/month - unlimited everything + AI
    agency = "agency"  # $99/month - multi-user + white-label + API


class SubscriptionStatus(str, enum.Enum):
    active = "active"
    past_due = "past_due"
    canceled = "canceled"
    incomplete = "incomplete"
    incomplete_expired = "incomplete_expired"
    trialing = "trialing"
    unpaid = "unpaid"
    paused = "paused"


class Template(Base):
    __tablename__ = "templates"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    tone: Mapped[TemplateTone] = mapped_column(
        Enum(TemplateTone, name="templatetone"), nullable=False
    )
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    body_markdown: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped["DateTime"] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped["DateTime"] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class Event(Base):
    __tablename__ = "events"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    entity_type: Mapped[str] = mapped_column(String(32), nullable=False)
    entity_id: Mapped[int] = mapped_column(Integer, nullable=False)
    event_type: Mapped[str] = mapped_column(String(32), nullable=False)
    payload: Mapped[dict | None] = mapped_column(JSONBType, nullable=True)
    created_at: Mapped["DateTime"] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped["DateTime"] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user = relationship("User", back_populates="events")


class StripeAccount(Base):
    __tablename__ = "stripe_accounts"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    stripe_account_id: Mapped[str] = mapped_column(
        String(64), unique=True, index=True, nullable=False
    )
    access_token: Mapped[str] = mapped_column(String(255), nullable=False)
    refresh_token: Mapped[str | None] = mapped_column(String(255), nullable=True)
    scope: Mapped[str | None] = mapped_column(String(64), nullable=True)
    livemode: Mapped[bool] = mapped_column(Integer, default=0)
    created_at: Mapped["DateTime"] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped["DateTime"] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class DeadLetter(Base):
    __tablename__ = "dead_letters"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    kind: Mapped[str] = mapped_column(String(64), index=True)  # e.g., webhook_stripe
    payload: Mapped[dict] = mapped_column(JSONBType, nullable=False)
    error: Mapped[str] = mapped_column(Text, nullable=False)
    retries: Mapped[int] = mapped_column(Integer, default=0)
    next_attempt_at: Mapped["DateTime | None"] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped["DateTime"] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped["DateTime"] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class Outbox(Base):
    __tablename__ = "outbox"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    topic: Mapped[str] = mapped_column(String(64), index=True)  # e.g., email.send
    payload: Mapped[dict] = mapped_column(JSONBType, nullable=False)
    status: Mapped[str] = mapped_column(String(16), index=True, default="pending")
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    next_attempt_at: Mapped["DateTime | None"] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    dispatched_at: Mapped["DateTime | None"] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped["DateTime"] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped["DateTime"] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


# Subscription billing models
class Subscription(Base):
    __tablename__ = "subscriptions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )

    # Stripe subscription details
    stripe_subscription_id: Mapped[str | None] = mapped_column(
        String(255), unique=True, index=True, nullable=True
    )
    stripe_customer_id: Mapped[str | None] = mapped_column(
        String(255), index=True, nullable=True
    )
    stripe_price_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Subscription details
    tier: Mapped[SubscriptionTier] = mapped_column(
        Enum(SubscriptionTier, name="subscriptiontier"),
        default=SubscriptionTier.freemium,
        nullable=False,
    )
    status: Mapped[SubscriptionStatus] = mapped_column(
        Enum(SubscriptionStatus, name="subscriptionstatus"),
        default=SubscriptionStatus.active,
        nullable=False,
    )

    # Billing periods
    current_period_start: Mapped["DateTime | None"] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    current_period_end: Mapped["DateTime | None"] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    trial_start: Mapped["DateTime | None"] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    trial_end: Mapped["DateTime | None"] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Pause functionality
    is_paused: Mapped[bool] = mapped_column(
        "paused", Integer, default=0, nullable=False
    )

    # Coupon/discount tracking
    coupon_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Payment tracking
    first_payment_at: Mapped["DateTime | None"] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Usage tracking for current billing period
    reminders_sent_count: Mapped[int] = mapped_column(
        "reminders_sent_this_period", Integer, default=0, nullable=False
    )

    created_at: Mapped["DateTime"] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped["DateTime"] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    canceled_at: Mapped["DateTime | None"] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    user = relationship("User", back_populates="subscription")

    @property
    def paused(self) -> bool:
        """Back-compat alias for tests expecting `subscription.paused`."""
        return bool(self.is_paused)

    @paused.setter
    def paused(self, value: bool) -> None:
        self.is_paused = bool(value)


class UsageLimits(Base):
    __tablename__ = "usage_limits"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tier: Mapped[SubscriptionTier] = mapped_column(
        Enum(SubscriptionTier, name="subscriptiontier"), unique=True, nullable=False
    )

    # Plan limits
    reminders_per_month: Mapped[int] = mapped_column(Integer, nullable=False)
    max_clients: Mapped[int | None] = mapped_column(
        "clients_limit", Integer, nullable=True
    )  # None = unlimited
    max_invoices_per_month: Mapped[int | None] = mapped_column(
        "invoices_limit", Integer, nullable=True
    )  # None = unlimited

    templates_limit: Mapped[int | None] = mapped_column(Integer, nullable=True)
    analytics_retention_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    api_requests_per_hour: Mapped[int] = mapped_column(
        Integer, nullable=False, default=100
    )

    # Feature flags
    bulk_operations: Mapped[bool] = mapped_column(Integer, default=0, nullable=False)
    premium_templates: Mapped[bool] = mapped_column(Integer, default=0, nullable=False)
    white_label: Mapped[bool] = mapped_column(Integer, default=0, nullable=False)
    custom_branding: Mapped[bool] = mapped_column(Integer, default=0, nullable=False)
    priority_support: Mapped[bool] = mapped_column(Integer, default=0, nullable=False)

    created_at: Mapped["DateTime"] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped["DateTime"] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class BillingEvent(Base):
    __tablename__ = "billing_events"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    subscription_id: Mapped[int | None] = mapped_column(
        ForeignKey("subscriptions.id", ondelete="SET NULL"), index=True, nullable=True
    )

    # Event details
    event_type: Mapped[str] = mapped_column(
        String(64), nullable=False
    )  # e.g., subscription.created, invoice.paid, etc.
    stripe_event_id: Mapped[str | None] = mapped_column(
        String(255), unique=True, index=True, nullable=True
    )

    # Event data
    data: Mapped[dict | None] = mapped_column(JSONBType, nullable=True)
    processed: Mapped[bool] = mapped_column(Integer, default=0, nullable=False)
    processed_at: Mapped["DateTime | None"] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    created_at: Mapped["DateTime"] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped["DateTime"] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


# Referral system models
class Referral(Base):
    __tablename__ = "referrals"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    referrer_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    referred_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    referral_code_used: Mapped[str] = mapped_column(
        String(16), index=True, nullable=False
    )
    reward_granted: Mapped[bool] = mapped_column(server_default="false", nullable=False)
    reward_months: Mapped[int] = mapped_column(server_default="1", nullable=False)
    created_at: Mapped["DateTime"] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    rewarded_at: Mapped["DateTime | None"] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    referrer = relationship(
        "User", foreign_keys=[referrer_user_id], back_populates="referrals_made"
    )
    referred_user = relationship(
        "User", foreign_keys=[referred_user_id], back_populates="referral_received"
    )


class SubscriptionCredit(Base):
    __tablename__ = "subscription_credits"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )

    # Legacy month-based fields (kept for backward compatibility)
    credit_months: Mapped[int] = mapped_column(Integer, nullable=False)
    remaining_months: Mapped[int] = mapped_column(Integer, nullable=False)

    # New dollar-based fields
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="USD")
    remaining_amount_cents: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )

    source: Mapped[str] = mapped_column(
        String(32), index=True, nullable=False
    )  # 'referral', 'admin_grant', 'promo'
    source_id: Mapped[str | None] = mapped_column(
        String(64), nullable=True
    )  # referral_id, admin_user_id, promo_code
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    expires_at: Mapped["DateTime | None"] = mapped_column(
        DateTime(timezone=True), index=True, nullable=True
    )
    created_at: Mapped["DateTime"] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped["DateTime"] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    user = relationship("User", back_populates="subscription_credits")


# Import Phase 4 Enterprise Models
# TODO: Temporarily commented out until database migration is complete
# from app.enterprise_models import (
#     Organization, Team, Department, TeamMember, Project, AuditLog,
#     SSO_Configuration, ComplianceProfile, DataExport
# )

# Add enterprise relationships to User model after imports
# User.organization = relationship("Organization", back_populates="users")
# User.department = relationship("Department", back_populates="users")
# User.team_memberships = relationship("TeamMember", back_populates="user")
# User.audit_logs = relationship("AuditLog", back_populates="user")
