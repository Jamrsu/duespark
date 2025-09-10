// Minimal API types synced with backend OpenAPI envelope

export type Meta = {
  limit?: number | null
  offset?: number | null
  total?: number | null
  [k: string]: any
}

export type Envelope<T> = { data: T; meta: Meta }

export type Token = { access_token: string; token_type: 'bearer' }

export type Client = {
  id: number
  name: string
  email: string
  timezone: string
  notes?: string | null
}

export type Invoice = {
  id: number
  client_id: number
  amount_cents: number
  currency: string
  due_date: string // ISO date
  status: 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled'
  external_id?: string | null
  source: string
  created_at: string // ISO datetime
}

export type Reminder = {
  id: number
  invoice_id: number
  send_at: string // ISO datetime
  channel: 'email' | 'sms' | 'whatsapp'
  status: 'scheduled' | 'sent' | 'failed' | 'cancelled'
  subject?: string | null
  body?: string | null
}

export type AnalyticsSummary = {
  totals: { all: number; pending: number; overdue: number; paid: number }
  expected_payments_next_30d: number
}

export type Template = {
  id: number
  user_id: number
  name: string
  tone: 'friendly' | 'neutral' | 'firm'
  subject: string
  body_markdown: string
  created_at: string
}
