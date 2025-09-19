# Secrets Management Strategy (Draft v0.1)

## Goals
- Eliminate plaintext secrets from the repository and ad hoc `.env` sharing.
- Provide a repeatable workflow for generating, distributing, and rotating credentials (Stripe, Postmark, database, etc.).
- Integrate secrets delivery into CI/CD so deployments fail closed when credentials are missing or revoked.

## Current State (2025-09-17)
- Public repo sanitized (`.env` files removed; placeholders tracked in `.env.example`).
- Production/test Stripe keys still active and distributed manually via chat/1Password.
- CI pipelines (GitHub Actions, Render, Fly.io) rely on manually set environment variables; no central inventory of owners or rotation cadence.

## Candidate Solutions

| Option | Summary | Pros | Cons | Estimated Effort |
| --- | --- | --- | --- | --- |
| HashiCorp Vault Cloud | Managed Vault namespace with dynamic secrets engines. | Centralised policy management, leasing/auto-rotation, audit logs. | Monthly cost, operational overhead (unsealing, auth methods), steeper learning curve. | 3–4 engineering days + DevOps runbook |
| Mozilla SOPS + git-crypt | Encrypted secrets committed to repo, decrypted locally/CI using KMS or age keys. | Simple to adopt, versioned in Git, low cost. | Requires key distribution and discipline, no dynamic rotation, limited audit. | 2 engineering days + key distribution process |

**Selection Criteria:**
- Hosted managed service vs. lightweight Git-based encryption.
- Ability to enforce quarterly rotation (Stripe requirement).
- Integration with GitHub Actions, Render, Fly.io, and local developer workflows.

## Recommended Approach (Proposal)
1. Produce a brief decision memo comparing Vault Cloud vs. SOPS (due 2025-09-20, owner: DevOps).
2. Pilot the chosen solution with Stripe credentials:
   - Store new `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.
   - Update backend CI (`backend-ci.yml`) and Fly.io / Render deployments to fetch credentials from the new source.
   - Document bootstrap instructions for developers (see “Onboarding Guide” below).
3. After successful pilot, migrate remaining secrets (Postmark, database URLs, third-party API keys) and remove legacy secret stores.

## Stripe Key Rotation Checklist (Target: 2025-09-18)
1. Inventory existing keys in Stripe dashboard and downstream environments.
2. Generate new keys, commit them to the chosen secrets manager, and roll out to CI/CD + hosting providers.
3. Run smoke tests (`PYTHONPATH=. pytest tests/test_stripe_webhooks.py`) and manual checkout/portal flows.
4. Revoke old keys, confirm no stale references remain, and update the rotation log.
5. Document the rotation (date, keys rotated, owners) and add a reminder in Ops calendar for quarterly rotations.

## Tooling Roadmap
- **2025-09-20**: Finalise SOPS + KMS decision memo (`docs/SECRETS_DECISION.md`).
- **2025-09-24**: Prototype secrets pipeline (decrypt script, CI integration, Render/Fly sync).
- **2025-09-30**: Migrate Stripe/Postmark secrets to SOPS; deprecate manual env distribution.
- **2025-11-01**: Dry-run next rotation to validate automation and update runbooks.

> Note: `.sops.yaml` contains placeholder rule definitions; update the KMS/age entries once the encryption backend is selected.

### CLI Helpers
- `scripts/secrets/decrypt.sh` – wraps `sops -d` with validation and cleanup reminder.
- `scripts/secrets/encrypt.sh` – wraps `sops -e` to produce `*.enc.yaml` artefacts after editing plaintext files.

## Onboarding Guide (Draft)
1. Request access to the secrets manager (Vault namespace or SOPS key) via Ops ticket.
2. Authenticate and fetch secrets:
   - **Vault:** `vault login <method>` → `vault kv get secret/stripe`
   - **SOPS (decrypt):** `scripts/secrets/decrypt.sh secrets/stripe.enc.yaml`
   - **SOPS (encrypt):** `scripts/secrets/encrypt.sh secrets/stripe.yaml`
3. Populate local `.env` using template values from `sic_backend_mvp_jwt_sqlite/.env.example` and `sic_app/.env.example`.
4. Confirm environment via `PYTHONPATH=. pytest tests/test_subscription_service_unit.py` before starting development.

## Rotation Log Template
```
| Date       | Secret                 | Environment | Owner          | Notes |
|------------|------------------------|-------------|----------------|-------|
| 2025-09-18 | STRIPE_SECRET_KEY      | prod/test   | Payments Team  | Replaced leaked key; CI updated |
```

> TODO (Ops): move this log to a shared Ops knowledge base (Notion/Confluence) once the rotation tooling is finalised.
