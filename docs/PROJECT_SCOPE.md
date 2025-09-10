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
