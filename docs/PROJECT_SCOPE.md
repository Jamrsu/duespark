Project Summary: DueSpark (MVP)

We are building a SaaS product for freelancers, solopreneurs, and small agencies that helps them get paid on time.

Problem

Freelancers & small businesses waste time chasing overdue invoices.

Existing tools (Chaser, Adfin) are too expensive/enterprise-focused.

Users want something simple, mobile-first, and affordable.

Solution

A DueSpark app that:

Imports invoices (from Stripe, PayPal, Xero, QuickBooks, or manual entry).

Sends polite automated reminders before/after due dates.

Adapts to client payment behavior (AI-based scheduling & tone).

Provides insights (average late days, overdue %, expected payments).

Improves cash flow without awkward conversations.

🎯 MVP Goals
Backend

Built with FastAPI + SQLite/Postgres + SQLAlchemy.

JWT Authentication (register, login).

CRUD for Clients, Invoices, Reminders.

Reminder scheduler (initially simple; later adaptive AI).

Analytics endpoint for dashboard (totals, overdue, expected payments).

Ready for Stripe integration (import invoices, payment links).

Frontend

React + TypeScript + Vite + Tailwind (mobile-first).

Views: Login/Register, Dashboard (KPIs), Clients, Invoices, Reminders.

Reminder Preview UI (choose invoice + tone → preview email).

Uses axios to call backend API with JWT auth.

DevOps

Local run via uvicorn (backend) + npm run dev (frontend).

.env for secrets (SECRET_KEY, DB URL, API base URL).

Plan for Docker & Docker Compose to unify backend + frontend + db.

AI Layer (future)

Heuristic ML for adaptive reminder timing (send based on past client behavior).

Tone adjustment: friendly → neutral → firm, depending on lateness.

Target Users

Freelancers, solopreneurs, creative agencies.

Price point: $9–$29/mo (freemium with 2 reminders free).

✅ Codex Instructions

When extending this project, always:

Follow FastAPI best practices (async endpoints, pydantic validation, JWT auth).

Use SQLAlchemy ORM models + Alembic migrations.

Ensure endpoints are secure & scoped to the current user.

Use React Query / Axios for frontend API calls.

Keep UI simple, mobile-friendly, and intuitive.

## Scalability & Future Expansion

To comfortably grow from thousands to tens of thousands of users, plan the following upgrades:

- Job Orchestration: migrate reminder sending/adaptive scheduling from in‑process to a distributed queue (Celery/RQ with Redis, or Celery on SQS). Run multiple workers with unique job keys to prevent duplicates; keep DLQ + exponential backoff.
- DB Performance: add PgBouncer; create composite indexes (e.g., reminders(status, send_at), invoices(user_id, status)); partition large tables (events, reminders) by month; use read replicas for analytics; consider materialized views for dashboard KPIs.
- Idempotency & Exactly‑Once: adopt Transactional Outbox + background dispatcher for all external sends (email/providers/webhooks). Enforce unique constraints on dedupe keys and store idempotency keys per invoice/reminder.
- Scheduling at Scale: switch to a queue‑based due engine (e.g., Redis ZSET or Celery beat) to pop due reminders accurately; shard workers by time bucket or tenant; guard nightly adaptive job with a leader‑election lock.
- Email Throughput: add provider abstraction with pooling, rate‑limit aware batching, and provider fallback (Postmark/SES). Record provider webhooks for delivery/bounce/complaint to adapt cadence.
- Multi‑Tenant Controls: add per‑tenant quotas and rate limits; isolate data via tenant_id and RLS (optional) or strict scoping in code; configurable sending windows per tenant.
- Observability: expand Prometheus metrics, add Grafana dashboards and alerting; instrument tracing with OpenTelemetry for API + jobs; define SLOs (success %, p95 latency, queue lag) and alarms.
- Reliability & DR: run multiple app/worker instances behind a load balancer; health/readiness probes; backups + PITR for Postgres; optional multi‑AZ. Consider multi‑region active/passive later.
- Data Lifecycle: retention policies for events/logs; archive old reminders/invoices; GDPR delete pipelines; PII minimization and encryption at rest.
- API & UX Performance: cursor‑based pagination, HTTP caching headers, conditional GETs; precompute dashboard aggregates; background sync for Stripe imports.
- Security & Secrets: managed secrets (e.g., AWS Secrets Manager); rotate keys; RBAC for admin endpoints; audit logs for sending/retries; WAF/rate limiting at the edge.
- Load/Failure Testing: run periodic load tests; chaos drills for provider outages (auto‑switch to fallback, queue growth within SLOs).
