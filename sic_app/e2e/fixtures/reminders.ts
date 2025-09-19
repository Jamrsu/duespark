/**
 * Test fixtures for reminder data
 */

export interface TestReminder {
  id?: number
  invoice_id?: number
  user_id?: number
  scheduled_date: string
  status: 'scheduled' | 'sent' | 'failed' | 'cancelled'
  channel: 'email' | 'sms' | 'whatsapp'
  template_name?: string
  custom_message?: string
  created_at?: string
  sent_at?: string
}

export interface TestEmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  variables: string[]
}

export const testReminders: Record<string, TestReminder> = {
  scheduled: {
    invoice_id: 1,
    scheduled_date: '2024-02-20T10:00:00Z',
    status: 'scheduled',
    channel: 'email',
    template_name: 'payment_reminder',
    custom_message: 'Please remember to pay your invoice.'
  },

  sent: {
    invoice_id: 2,
    scheduled_date: '2024-02-15T14:00:00Z',
    status: 'sent',
    channel: 'email',
    template_name: 'overdue_notice',
    sent_at: '2024-02-15T14:00:00Z'
  },

  failed: {
    invoice_id: 3,
    scheduled_date: '2024-02-18T09:00:00Z',
    status: 'failed',
    channel: 'email',
    template_name: 'payment_reminder'
  }
}

export const testEmailTemplates: Record<string, TestEmailTemplate> = {
  paymentReminder: {
    id: 'payment_reminder',
    name: 'Payment Reminder',
    subject: 'Payment Reminder for Invoice {{invoice_number}}',
    body: `Dear {{client_name}},

This is a friendly reminder that your invoice #{{invoice_number}} for $\{{amount}} is due on {{due_date}}.

Please make your payment at your earliest convenience.

Best regards,
{{user_name}}`,
    variables: ['client_name', 'invoice_number', 'amount', 'due_date', 'user_name']
  },

  overdueNotice: {
    id: 'overdue_notice',
    name: 'Overdue Notice',
    subject: 'OVERDUE: Invoice {{invoice_number}} - Immediate Action Required',
    body: `Dear {{client_name}},

Your invoice #{{invoice_number}} for $\{{amount}} was due on {{due_date}} and is now overdue.

Please settle this invoice immediately to avoid any disruption to our business relationship.

If payment has already been made, please disregard this notice.

Best regards,
{{user_name}}`,
    variables: ['client_name', 'invoice_number', 'amount', 'due_date', 'user_name']
  },

  thankYou: {
    id: 'thank_you',
    name: 'Thank You',
    subject: 'Thank you for your payment - Invoice {{invoice_number}}',
    body: `Dear {{client_name}},

Thank you for your payment of $\{{amount}} for invoice #{{invoice_number}}.

Your payment has been received and processed successfully.

We appreciate your business!

Best regards,
{{user_name}}`,
    variables: ['client_name', 'invoice_number', 'amount', 'user_name']
  }
}

// Mock webhook payloads for email events
export const mockEmailWebhooks = {
  delivered: {
    event: 'delivered',
    message_id: 'msg_test123',
    recipient: 'john@acmecorp.com',
    subject: 'Payment Reminder for Invoice INV-001',
    delivered_at: '2024-02-20T10:05:00Z'
  },

  opened: {
    event: 'opened',
    message_id: 'msg_test123',
    recipient: 'john@acmecorp.com',
    opened_at: '2024-02-20T10:30:00Z',
    client: {
      name: 'Apple Mail',
      os: 'macOS'
    }
  },

  clicked: {
    event: 'clicked',
    message_id: 'msg_test123',
    recipient: 'john@acmecorp.com',
    clicked_at: '2024-02-20T11:00:00Z',
    link: 'https://pay.stripe.com/invoice/test_hosted'
  },

  bounced: {
    event: 'bounced',
    message_id: 'msg_test456',
    recipient: 'invalid@invalid.com',
    bounced_at: '2024-02-20T10:05:00Z',
    bounce_type: 'hard',
    reason: 'User unknown'
  }
}

// Analytics data
export interface TestAnalytics {
  total_invoices: number
  total_revenue: number
  pending_invoices: number
  overdue_invoices: number
  paid_invoices: number
  reminders_sent: number
  email_open_rate: number
  payment_success_rate: number
  average_payment_time: number // in days
}

export const testAnalytics: TestAnalytics = {
  total_invoices: 4,
  total_revenue: 7750.00,
  pending_invoices: 1,
  overdue_invoices: 1,
  paid_invoices: 2,
  reminders_sent: 3,
  email_open_rate: 0.75,
  payment_success_rate: 0.65,
  average_payment_time: 12.5
}