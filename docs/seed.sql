-- Adjust IDs as needed. This is illustrative and not executed automatically.

-- Users
INSERT INTO users (email, password_hash, role)
VALUES
  ('owner1@example.com', '$2b$12$abcdefghijklmnopqrstuv.CUa1b2c3d4e5f6g7h8i9j0k1l2m', 'owner'),
  ('admin@example.com', '$2b$12$abcdefghijklmnopqrstuv.CUa1b2c3d4e5f6g7h8i9j0k1l2m', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Templates
INSERT INTO templates (user_id, name, tone, subject, body_markdown)
VALUES
  (1, 'Friendly Nudge', 'friendly', 'Quick nudge about invoice {{invoice_id}}', 'Hi {{client_name}},\nJust a friendly reminder about invoice {{invoice_id}} due on {{due_date}}. Thanks!'),
  (1, 'Neutral Reminder', 'neutral', 'Reminder: invoice {{invoice_id}}', 'Hello {{client_name}},\nThis is a reminder that invoice {{invoice_id}} is due on {{due_date}}.'),
  (1, 'Firm Follow-up', 'firm', 'Overdue: invoice {{invoice_id}}', 'Hello {{client_name}},\nInvoice {{invoice_id}} is now overdue. Please arrange payment as soon as possible.');

-- Clients
INSERT INTO clients (user_id, name, email, timezone, notes, payment_behavior_score)
VALUES
  (1, 'Acme Co', 'billing@acme.test', 'UTC', 'Priority client', 0.85),
  (1, 'Globex LLC', 'accounts@globex.test', 'Europe/London', NULL, NULL),
  (2, 'Initech', 'ap@initech.test', 'America/New_York', 'Seasonal billing', 0.65);

-- Invoices
INSERT INTO invoices (user_id, client_id, amount_cents, currency, due_date, status, source)
VALUES
  (1, 1, 25000, 'USD', CURRENT_DATE + INTERVAL '7 days', 'pending', 'manual'),
  (1, 2, 9900, 'USD', CURRENT_DATE + INTERVAL '3 days', 'draft', 'stripe'),
  (2, 3, 15000, 'USD', CURRENT_DATE + INTERVAL '1 days', 'paid', 'paypal'),
  (2, 3, 5000, 'USD', CURRENT_DATE + INTERVAL '14 days', 'overdue', 'xero');

-- Reminders
INSERT INTO reminders (invoice_id, template_id, send_at, channel, status, subject, body, meta)
VALUES
  (1, 1, NOW() + INTERVAL '1 day', 'email', 'scheduled', 'Upcoming invoice', 'Hi Acme, quick nudge about your upcoming invoice.', '{"attempt":1}'),
  (1, 2, NOW() + INTERVAL '5 days', 'email', 'scheduled', 'Reminder', 'Invoice still pending.', '{"attempt":2}'),
  (3, NULL, NOW() + INTERVAL '2 days', 'sms', 'scheduled', 'Payment received', 'Thanks for your payment', NULL),
  (2, 3, NOW() + INTERVAL '3 days', 'whatsapp', 'scheduled', 'Follow up', 'Following up on your invoice', '{"attempt":1}'),
  (4, NULL, NOW() + INTERVAL '4 days', 'email', 'scheduled', 'Gentle nudge', 'A friendly nudge about your invoice', '{"attempt":1}');

-- Events
INSERT INTO events (user_id, entity_type, entity_id, event_type, payload)
VALUES
  (1, 'invoice', 1, 'created', '{"amount_cents":25000}'),
  (1, 'reminder', 1, 'scheduled', '{"send_at":"+1d"}'),
  (2, 'invoice', 3, 'paid', '{"paid_at":"now"}');
