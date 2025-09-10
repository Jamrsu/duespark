Stripe Integration (DueSpark)

Prerequisites
- Set environment variables in the app service:
  - STRIPE_SECRET_KEY: your platform secret key (sk_test_...)
  - STRIPE_CLIENT_ID: your Connect client ID (ca_...)
- STRIPE_WEBHOOK_SECRET: signing secret from your webhook endpoint
- STRIPE_REDIRECT_URI: e.g. http://localhost:8000/integrations/stripe/callback
- STRIPE_API_VERSION: 2023-10-16 (pinned)
- PUBLIC_BASE_URL: http://localhost:8000 (for local testing)

OAuth Connect (Standard)
1) Start flow (authenticated): GET /integrations/stripe/connect → returns { data: { url } }
2) Redirect user to that URL. After authorization, Stripe redirects to STRIPE_REDIRECT_URI with ?code=&state=
3) Backend exchanges code at /integrations/stripe/callback and stores the connected account for the current user.

Webhooks
- Expose /webhooks/stripe via a public URL (use ngrok).
- Verify signatures using STRIPE_WEBHOOK_SECRET.
- Subscribed events (suggested): invoice.created, invoice.finalized, invoice.payment_succeeded, invoice.payment_failed.
- Invoices are imported/upserted by external_id (Stripe invoice id). Missing client emails will create a client on the fly.
- Signatures: We verify Stripe-Signature with STRIPE_WEBHOOK_SECRET. Use Stripe CLI to send signed test events:
```bash
stripe login
stripe listen --forward-to http://localhost:8000/webhooks/stripe
```

Ngrok setup
```bash
ngrok http 8000
# Copy the https URL and configure a Stripe webhook endpoint (e.g., https://<id>.ngrok.io/webhooks/stripe)
stripe listen --forward-to https://<id>.ngrok.io/webhooks/stripe
```

Payment Links
- For manual (non-Stripe) invoices, create a hosted payment link:
  POST /integrations/stripe/payment_link?invoice_id=123
- The backend creates a product/price in the connected account and returns a Payment Link URL; it is also saved on the invoice as payment_link_url.
- Idempotency: We set Stripe idempotency keys per invoice to avoid duplicate Stripe objects.
- Paid invoices will not generate links; Stripe-sourced invoices are disallowed for link creation.

Retries & Dead Letters
- Webhook/import errors are recorded in dead_letters with kind=webhook_stripe or stripe.import.
- A background worker retries with exponential backoff (1m, 5m, 15m, 1h) up to multiple attempts; manual retry is available via admin endpoints.

Postman Collection
- See docs/postman/Stripe_Integration.postman_collection.json for example requests:
  - Connect start, create payment link, webhook simulate (note: use Stripe CLI for signed events), import since, DLQ retry

Test Cards
- 4242 4242 4242 4242 (any future expiry, any CVC) — successful payment
- 4000 0000 0000 9995 — requires authentication
- 4000 0000 0000 0002 — card declined

Status Mapping
- Stripe → DueSpark
  - draft → draft
  - open/uncollectible → pending
  - paid → paid (paid_at set from status_transitions.paid_at)
  - void → cancelled

Common Errors & Fixes
- Redirect mismatch: ensure STRIPE_REDIRECT_URI in Stripe OAuth settings matches exactly.
- Stripe not configured: set STRIPE_CLIENT_ID and STRIPE_SECRET_KEY in backend env.
- Webhook invalid signature: use Stripe CLI listen or configure Dashboard endpoint with correct URL/secret.

