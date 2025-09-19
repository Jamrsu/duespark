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

export type AnalyticsStatusTotals = {
  all: number
  draft: number
  pending: number
  paid: number
  overdue: number
  cancelled: number
}

export type AnalyticsTopLateClient = {
  client_id: number
  client_name: string
  client_email: string
  avg_days_late: number
  overdue_count: number
  total_overdue_amount_cents: number
}

export type AnalyticsSummary = {
  totals: AnalyticsStatusTotals
  expected_payments_next_30d: number
  avg_days_to_pay?: number | null
  top_late_clients: AnalyticsTopLateClient[]
}

export type AnalyticsTimeseriesPoint = {
  period: string  // ISO date string
  value: number
  count?: number
}

export type AnalyticsTimeseries = {
  metric: string
  interval: string
  points: AnalyticsTimeseriesPoint[]
  total_value: number
  total_count: number
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
