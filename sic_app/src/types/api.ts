export interface Envelope<T> {
  success: boolean
  data: T
  meta: {
    total?: number
    limit?: number
    offset?: number
    [key: string]: any
  }
}

export interface ErrorResponse {
  success: false
  error: {
    code: number
    message: string
    type: string
  }
  data: null
}

// Auth types
export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  referral_code?: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
}

export interface User {
  id: number
  email: string
  email_verified: boolean
  onboarding_status: string
  payment_method?: string | null
  stripe_account_id?: string | null
  created_at: string
  updated_at: string
}

// Client types
export interface Client {
  id: number
  name: string
  email: string
  contact_name?: string
  contact_phone?: string
  timezone?: string
  created_at: string
  updated_at: string
}

export interface CreateClientRequest {
  name: string
  email: string
  contact_name?: string
  contact_phone?: string
  timezone?: string
}

// Invoice types
export type InvoiceStatus = 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled'

export interface Invoice {
  id: number
  client_id: number
  amount_cents: number
  currency: string
  due_date: string
  status: InvoiceStatus
  payment_link_url?: string | null
  paid_at?: string | null
  created_at: string
  updated_at: string
  // Populated relations
  client?: Client
}

export interface CreateInvoiceRequest {
  client_id: number
  amount_cents: number
  currency: string
  due_date: string
  status?: InvoiceStatus
}

export interface UpdateInvoiceRequest {
  status?: InvoiceStatus
  paid_at?: string | null
}

// Reminder types
export type ReminderStatus = 'pending' | 'sent' | 'failed'
export type ReminderChannel = 'email' | 'sms' | 'whatsapp'

export interface Reminder {
  id: number
  invoice_id: number
  send_at: string
  status: ReminderStatus
  channel: ReminderChannel
  subject?: string | null
  body?: string | null
  created_at: string
  updated_at: string
  // Populated relations
  invoice?: Invoice
}

export interface CreateReminderRequest {
  invoice_id: number
  send_at: string
  channel?: ReminderChannel
  subject?: string
  body?: string
}

// Analytics types
export interface AnalyticsSummary {
  totals: {
    all: number
    draft: number
    pending: number
    paid: number
    overdue: number
    cancelled: number
  }
  expected_payments_next_30d: number
  avg_days_to_pay: number | null
  top_late_clients: AnalyticsTopLateClient[]
}

export interface AnalyticsTopLateClient {
  client_id: number
  client_name: string
  client_email: string
  avg_days_late: number
  overdue_count: number
  total_overdue_amount_cents: number
}

export interface AnalyticsTimeseries {
  metric: string
  interval: string
  total_value: number
  total_count: number
  points: AnalyticsTimeseriesPoint[]
}

export interface AnalyticsTimeseriesPoint {
  period: string
  value: number
  count: number
}

// Template types
export interface Template {
  id: number
  name: string
  tone: 'friendly' | 'neutral' | 'firm'
  subject: string
  body_markdown: string
  created_at: string
  updated_at: string
}

export interface CreateTemplateRequest {
  name: string
  tone: 'friendly' | 'neutral' | 'firm'
  subject: string
  body_markdown: string
}

// Email preview types
export interface EmailPreview {
  subject: string
  body: string
}

export interface EmailPreviewRequest {
  invoice_id: number
  template_id?: number
  tone?: string
}