
from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator
from datetime import datetime, date
from typing import Optional, Literal

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)

class UserOut(BaseModel):
    id: int
    email: EmailStr
    model_config = ConfigDict(from_attributes=True)

class ClientCreate(BaseModel):
    name: str
    email: EmailStr
    timezone: str = "UTC"
    notes: Optional[str] = None

class ClientUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    timezone: Optional[str] = None
    notes: Optional[str] = None

class ClientOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    timezone: str
    notes: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class InvoiceCreate(BaseModel):
    client_id: int
    amount_cents: int = Field(gt=0)
    currency: str = "USD"
    due_date: date
    status: Literal["draft","pending","paid","overdue","cancelled"] = "pending"
    external_id: Optional[str] = None
    source: str = "manual"

    @field_validator('currency')
    @classmethod
    def normalize_currency(cls, v: str) -> str:
        v = (v or '').strip().upper() or 'USD'
        if len(v) != 3:
            raise ValueError('currency must be a 3-letter code')
        return v

class InvoiceUpdate(BaseModel):
    client_id: Optional[int] = None
    amount_cents: Optional[int] = Field(default=None, gt=0)
    currency: Optional[str] = None
    due_date: Optional[date] = None
    status: Optional[Literal["draft","pending","paid","overdue","cancelled"]] = None
    external_id: Optional[str] = None
    source: Optional[str] = None

    @field_validator('currency')
    @classmethod
    def normalize_currency_opt(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v2 = (v or '').strip().upper()
        if len(v2) != 3:
            raise ValueError('currency must be a 3-letter code')
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
    invoice_id: int
    send_at: datetime
    channel: Literal["email","sms","whatsapp"] = "email"
    subject: Optional[str] = None
    body: Optional[str] = None

class ReminderUpdate(BaseModel):
    send_at: Optional[datetime] = None
    channel: Optional[Literal["email","sms","whatsapp"]] = None
    status: Optional[Literal["scheduled","sent","failed","cancelled"]] = None
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
    tone: Literal["friendly","neutral","firm"]
    subject: str
    body_markdown: str

class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    tone: Optional[Literal["friendly","neutral","firm"]] = None
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
    tone: Optional[Literal["friendly","neutral","firm"]] = None
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
