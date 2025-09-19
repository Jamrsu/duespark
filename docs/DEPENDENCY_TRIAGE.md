# Dependency Update Triage Playbook

## Weekly Rotation
- **Cadence**: Every Tuesday at 15:00 UTC
- **Primary Owner**: Frontend Guild (rotates weekly)
- **Secondary Owner**: DevOps (for infrastructure/runtime upgrades)
- Track the on-call engineer for the week in the shared engineering calendar.

## Intake Checklist
1. Review all open Renovate PRs and `npm audit`/`pip-audit` notifications.
2. Verify CI status for each PR (unit, integration, and E2E pipelines).
3. Confirm changelog or release notes for high-impact packages (frameworks, auth, payments, infrastructure).
4. Label PRs with:
   - `dependencies:patch` for non-breaking upgrades
   - `dependencies:minor` for feature updates
   - `dependencies:major` for breaking changes requiring design review
5. Re-run targeted test suites when patches touch:
   - Payments/Stripe (`npm run test:payments`, `pytest tests/test_stripe_webhooks.py`)
   - Authentication/onboarding (`npm run test:onboarding`, `pytest tests/test_onboarding_api.py`)
   - Mobile UX (`npm run test:e2e -- --grep @mobile`)

## Escalation Rules
- **Major security advisories**: escalate to #security within 1 hour and create an incident ticket.
- **Breaking API shifts**: schedule a cross-team review before merging; capture notes in the Architecture Decision Log.
- **CI failures**: assign the PR to the on-call engineer with a comment summarising the failure and required follow-up.

## Merge Policy
- Auto-merge approved PRs tagged `dependencies:patch` when all checks pass.
- Require at least one code owner review for `dependencies:minor` and two for `dependencies:major`.
- Document manual testing in the PR description before merging major/breaking updates.

## Reporting
- Post a weekly summary in `#eng-updates` with:
  - Number of dependency PRs merged/blocked
  - Outstanding advisories and their owners
  - Upcoming major updates requiring planning
- Archive the summary in `docs/changelogs/DEPENDENCY_TRIAGE.md` for historical reference.

## Tooling
- Renovate schedule: weekdays 06:00–12:00 UTC.
- Enable Renovate grouping for low-risk devDependencies to reduce PR noise (`renovate.json`).
- Use GitHub saved search `is:pr label:dependencies sort:updated-desc` for quick triage.
