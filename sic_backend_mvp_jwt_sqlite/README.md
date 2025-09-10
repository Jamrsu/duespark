
# DueSpark – Backend MVP (JWT + DB)

FastAPI backend with JWT auth, SQLAlchemy ORM, Alembic migrations.

## Local Dev (venv)
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export SECRET_KEY="change-me"
export DATABASE_URL="sqlite:///./app.db"  # or a Postgres URL
alembic upgrade head
uvicorn app.main:app --reload
```

Open http://localhost:8000/docs

## Docker + Compose
```bash
docker compose up --build
```
- DB: Postgres on internal network
- App: http://localhost:8000
- Healthcheck: http://localhost:8000/healthz
- Tests: a `test` service runs `alembic upgrade head && pytest -q` automatically on `up` after the app is healthy. To re-run manually: `docker compose run --rm test`.

Run tests in container via compose:
```bash
docker compose run --rm test
```

## Alembic Migrations
- Configure DB via `DATABASE_URL` env var
- Upgrade to latest: `alembic upgrade head`
- Downgrade a step: `alembic downgrade -1`

### Loading Seed Data
Use psql to load the example dataset into the running Postgres:
```bash
psql postgresql://duespark:duespark@localhost:5432/duespark -f ../docs/seed.sql
```

### Notes on Constraints & Triggers
- Invoices: DB trigger enforces that for `status in (draft,pending)`, `due_date >= created_at::date`.
- Invoices: When `status='paid'`, `paid_at` auto-populates if missing; when status is not `paid`, `paid_at` is cleared.
- Currency: `char_length(currency)=3` enforced by DB check.
- `updated_at`: auto-updated by trigger on updates across core tables.

### Rollback Guidance
To step back one migration:
```bash
alembic downgrade -1
```
Be aware that enum downgrades convert values (e.g., users.role `owner|member` collapse to `user`). Review migration comments before downgrading in production.

## Acceptance Criteria Coverage
- App + DB via `docker compose up` on :8000
- `alembic upgrade head` configured
- Endpoints include auth, clients, invoices, reminders (CRUD)
- Pagination via `limit`/`offset` and consistent `{"data": ..., "meta": ...}` envelope
- Tests with `pytest -q` pass in container

## Getting a JWT Token (Quick Test)
JWTs authenticate requests. They expire after about 60 minutes by default.

Using curl:
```bash
# 1) Register a user
curl -s -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"me@example.com","password":"secret123"}' | jq .

# 2) Login to obtain token
TOKEN=$(curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=me@example.com&password=secret123" | jq -r .data.access_token)
echo $TOKEN

# 3) Call an authenticated endpoint
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:8000/clients?limit=5&offset=0" | jq .
```

Using Swagger UI:
- Visit http://localhost:8000/docs
- Execute `/auth/login` to get a token, then click "Authorize" and paste `Bearer <TOKEN>`.
- Try other endpoints (e.g., `/clients`).

Note on bcrypt warning: if you see a log like "(trapped) error reading bcrypt version", the app still works. In this repo, the dependency is pinned (`bcrypt==3.2.2`) to avoid that warning.

## Features (Updated)
- JWT authentication: `/auth/register`, `/auth/login` (responses enveloped)
- Clients CRUD: `/clients` (GET paginated, POST), `/clients/{id}` (GET, PUT, DELETE)
- Invoices CRUD: `/invoices` (GET paginated, POST), `/invoices/{id}` (GET, PUT, DELETE)
- Reminders CRUD: `/reminders` (GET paginated, POST), `/reminders/{id}` (GET, PUT, DELETE)
- Analytics: `/analytics/summary` returns `{ data: { totals, expected_payments_next_30d }, meta: {} }`
- Consistent response envelope across endpoints: `{ data, meta }`
- Pagination on list endpoints with `limit` and `offset`; `meta` includes `total`
- Alembic-managed schema (no `Base.metadata.create_all` at app start)
- Health endpoint: `/healthz` returns `{ "status": "ok" }`
- Docker Compose with app healthcheck and Postgres service

## Email (Postmark) Setup
- Provider: Postmark with a pluggable provider interface (swap to SES later).
- Env vars:
  - `EMAIL_PROVIDER=postmark`
  - `POSTMARK_SERVER_TOKEN=<server-token>`
  - `POSTMARK_MESSAGE_STREAM=outbound` (optional)
  - `MAIL_FROM=no-reply@yourdomain.com` and `MAIL_FROM_NAME=DueSpark` (or `EMAIL_FROM="DueSpark <no-reply@yourdomain.com>"`)
  - `MAIL_REPLY_TO=ops@yourdomain.com` (optional)
  - `APP_PUBLIC_URL=https://app.yourdomain.com` (optional)
- Endpoints:
  - Preview: `POST /reminders/preview` — renders subject + HTML + Text from Markdown templates (Jinja2 variables).
    Example:
    ```json
    {
      "template": "reminder",
      "tone": "friendly",
      "variables": {
        "client_name": "Acme AP",
        "invoice_number": "INV-1024",
        "amount_formatted": "£1,250.00",
        "due_date_iso": "2025-09-15",
        "pay_link": "https://pay.example/abc123",
        "from_name": "Your Studio"
      }
    }
    ```
  - Send now: `POST /reminders/send-now` — trigger immediate send for a reminder (testing).
- Template variables:
  - `{client_name}`, `{invoice_number}`, `{amount}` plus `{invoice_id}`, `{due_date}`, `{currency}`, `{tone}`.
- Tone presets available out of the box: `friendly`, `neutral`, `firm` (used when a matching template is not specified).
- Link tracking: enabled (`TrackOpens` true, `TrackLinks` HtmlAndText). Provider `message_id` and tracking flags are stored under `reminders.meta`.

### Obtain Postmark Server Token
1. Create a Postmark account and a new Server (e.g., "DueSpark Dev").
2. In the Server → API Tokens, copy the Server Token and set `POSTMARK_SERVER_TOKEN`.
3. (Optional) Create a Message Stream (e.g., `outbound`) and set `POSTMARK_MESSAGE_STREAM`.

### Add/Verify Sending Domain
1. Go to Sender Signatures & Domains → Domains → Add Domain.
2. Add your sending domain (or a dedicated subdomain like `mail.yourdomain.com`).
3. Add the DKIM CNAME/TXT records Postmark provides; wait for verification.
4. (Optional) Add custom Return-Path domain if desired; update DNS as instructed.

### DKIM/SPF (Deliverability)
1. In Postmark, add your sending domain and follow DNS setup.
2. Create DKIM record(s): Postmark provides a TXT (and CNAME for Return-Path). Add the records at your DNS host until verified.
3. SPF: Postmark does not require SPF for sending when using the Return-Path domain. If you maintain an SPF record and want alignment, include Postmark per their guidance (e.g., `include:spf.mtasv.net`) without breaking existing `-all` policy.
4. DMARC: Add a DMARC TXT (e.g., `_dmarc.yourdomain.com`) to enforce alignment and reporting.
5. Wait for DNS to propagate, then verify the domain in Postmark.

Notes:
- Use a dedicated subdomain for sending (e.g., `mail.yourdomain.com`) to protect root domain reputation.
- Warm up gradually and keep bounce/complaint rates low.

## Email (SES) Setup
- Set `EMAIL_PROVIDER=ses`
- Env vars:
  - `AWS_REGION=us-east-1` (or your SES region)
  - `EMAIL_FROM="DueSpark <no-reply@yourdomain.com>"` (must be a verified identity in SES)
  - Optional: `SES_CONFIGURATION_SET=duespark` (to integrate with Event Destinations for metrics)
- Credentials: Provide AWS credentials via environment (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`), AWS profile, or instance role.
- Deliverability:
  1) Verify your domain/identity in SES and enable DKIM (CNAME records).
  2) (Optional) Configure a custom MAIL FROM domain for SPF alignment.
  3) Add DMARC TXT record for your domain.
  4) New accounts may require a request to move out of SES sandbox.
- Tracking: SES does not rewrite links by default. For link tracking, use a redirect service or Amazon Pinpoint. Opens can be approximated with configuration sets + open tracking pixel if desired. The API still records `track_links` and `track_opens` flags in `reminders.meta` for consistency.

## Healthcheck Endpoint
- Purpose: allows Compose/infra to know when the API is ready, supports readiness probes, and quick status checks during development.
- In Compose, the app service uses `curl` against `/healthz` to signal healthy state before other actions depend on it.
### Sandbox/Test Mode
- Use a separate Postmark Server and Message Stream for testing.
- Send to test inboxes (e.g., Mailinator) before real recipients.
- For purely local testing, rely on the `/reminders/preview` response to validate HTML/Text output without sending.

### Rate Limits and Sending Windows
- Space out reminder batches to avoid spikes and throttle (polite windows: weekday business hours in recipient timezone).
- Monitor bounce and complaint rates; adjust cadence and tone if they rise.

### Local Preview and Non-Delivery Testing
- Preview locally via `POST /reminders/preview` with full variables (see examples below).
- Use the "Send now" endpoint with test inbox addresses to validate end-to-end without emailing real clients.

## Email Templates
- Location: templates/email/reminder.md
- Format: Markdown with simple YAML frontmatter at the top. Frontmatter supports:
  - `subject`: Jinja2-enabled subject template
  - `tone`: default tone for this template (`friendly|neutral|firm`)
- Body: Markdown with Jinja2 variables. Render pipeline is Jinja2 → Markdown → sanitized HTML (bleach) → wrapped in a minimal responsive layout + plaintext extracted by stripping tags.

Example (templates/email/reminder.md):
```
---
subject: >-
  {{ 'Quick nudge about invoice ' if tone == 'friendly' else ('Action required: invoice ' if tone == 'firm' else 'Reminder: invoice ') }}{{ invoice_number }}
tone: friendly
---

Hi {{ client_name }},

{% if tone == 'friendly' %}
Hope you're well! This is a friendly reminder about invoice {{ invoice_number }} for **{{ amount_formatted }}** due {{ due_date_iso }}.
If you've already paid, thank you! Otherwise, you can use this link: {{ pay_link }}

Best,
{{ from_name }}
{% elif tone == 'firm' %}
Invoice {{ invoice_number }} for **{{ amount_formatted }}** is overdue as of {{ due_date_iso }}. Please arrange payment: {{ pay_link }}.

Regards,
{{ from_name }}
{% else %}
This is a reminder for invoice {{ invoice_number }} totaling **{{ amount_formatted }}** due on {{ due_date_iso }}.
Pay: {{ pay_link }}

Regards,
{{ from_name }}
{% endif %}
```

Variables available (recommended):
- `client_name`, `invoice_number`, `amount_formatted`, `due_date_iso`, `pay_link`, `from_name`, `tone`

Back-compat variables (legacy templates):
- `amount`, `currency`, `due_date` (these are also provided for older templates)

How it’s used:
- Preview from repo template:
  - `POST /reminders/preview` body:
    ```json
    {
      "template": "reminder",
      "tone": "friendly",
      "variables": {
        "client_name": "Acme AP",
        "invoice_number": "INV-1024",
        "amount_formatted": "£1,250.00",
        "due_date_iso": "2025-09-15",
        "pay_link": "https://pay.example/abc123",
        "from_name": "Your Studio"
      }
    }
    ```
  - Response: `{ "data": { "subject", "html", "text" }, "meta": {} }`

Notes:
- HTML is sanitized and wrapped with inline styles; avoid inline scripts. Links preserve href, target, rel.
- Tone presets (`friendly|neutral|firm`) determine wording when a user-level template isn’t specified or when tone is passed with the repo template.

### Reminder Preview (Auth Behavior)
- Explicit variables path: does not require auth. Use when calling with `template` name and a full `variables` object.
  - Endpoint: `POST /reminders/preview`
  - Body example:
    ```json
    {
      "template": "reminder",
      "tone": "friendly",
      "variables": {
        "client_name": "Acme AP",
        "invoice_number": "INV-1024",
        "amount_formatted": "£1,250.00",
        "due_date_iso": "2025-09-15",
        "pay_link": "https://pay.example/abc123",
        "from_name": "Your Studio"
      }
    }
    ```
  - Response envelope: `{ "data": { "subject", "html", "text" }, "meta": {} }`

- Legacy invoice path: requires JWT and derives variables from the stored invoice and optional template.
  - Endpoint: `POST /reminders/preview`
  - Body example:
    ```json
    { "invoice_id": 123, "template_id": 1, "tone": "neutral" }
    ```
  - Authorization: `Authorization: Bearer <TOKEN>`

- Implementation details:
  - Missing variables are inferred from the active subject/body templates (no rigid list).
  - `tone` is injected for template expressions (e.g., conditional subject).
  - If a repo template’s frontmatter subject cannot be parsed, the API falls back to a tone preset subject.
  - Lightweight logs: `preview_missing_vars` and `preview_render_error` in application logs to aid debugging.
