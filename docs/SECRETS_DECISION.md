# Secrets Management Decision Memo (Draft 2025-09-17)

## Background
- Exposed Stripe keys were previously committed to the repo; `.env` files have now been removed and masked in templates.
- CI/CD pipelines (GitHub Actions, Render, Fly.io) ingest secrets via environment variables set manually by owners.
- Improvement plan requires a sustainable secrets playbook with quarterly rotation support and developer onboarding.

## Key Requirements
1. **Central Inventory & Access Control** – ability to track who can read/update Stripe, Postmark, DB credentials.
2. **Rotation Workflow** – rotate Stripe keys quarterly with minimal downtime; ideally automated or scripted.
3. **CI/CD Integration** – GitHub Actions needs non-interactive access to secrets; Render/Fly.io require simple secret sync.
4. **Developer Experience** – engineers should be able to fetch dev/test secrets without sharing raw values in chat.
5. **Operational Overhead** – solution should be maintainable by a small DevOps crew (<2 people) without 24/7 on-call.

## Options Considered

### 1. HashiCorp Vault Cloud
- **Pros**: Dynamic secret leasing, policy-driven access, audit logging, cloud-managed SLA.
- **Cons**: Monthly cost (~$350+/mo), requires setting up auth backends (GitHub/OIDC), more complex onboarding, secrets templating for Render/Fly.io still manual unless using Terraform.
- **Fit**: Strong choice for larger teams with compliance needs; may be overkill right now.

### 2. Mozilla SOPS + AWS KMS (or age) with git-crypt
- **Pros**: Lightweight, versioned with code, easy to review via PRs, integrates with GitHub Actions using OIDC + AWS KMS grants, no additional SaaS cost.
- **Cons**: No dynamic rotation; still need manual key creation in Stripe/Postmark. Access revocation is tied to KMS key policies; must manage age key distribution for contractors.
- **Fit**: Good balance for small team; allows staged rollout and quick adoption.

### 3. 1Password Secrets Automation
- **Pros**: Nice UI, integrates with existing 1Password usage, CLI for CI.
- **Cons**: Additional licensing cost, limited scripting vs. Vault/SOPS, vendor lock-in.
- **Fit**: Viable but less flexible than SOPS + KMS.

## Recommendation
- Adopt **SOPS + AWS KMS** for the next 6-12 months.
  - Use an AWS account dedicated to secret encryption; configure GitHub Actions OIDC provider to grant decrypt permission at runtime.
  - Store encrypted files under `secrets/` (e.g., `stripe.enc.yaml`, `postmark.enc.yaml`).
  - Use a lightweight wrapper script (`scripts/secrets/decrypt.sh`) for developers; update onboarding docs to cover AWS profile or age key retrieval.
  - Automate syncing to Render and Fly.io using their CLIs after decrypting within a deploy workflow.
- Revisit Vault Cloud once compliance requirements grow (multiple teams, audit obligations) or when we adopt dynamic database credentials.

## Implementation Plan
1. **AWS Setup (DevOps, 1 day)**
   - Create KMS key + policy; configure GitHub Actions OIDC role with decrypt permission.
   - Grant Payments/Platform group IAM users decrypt access for local use.
2. **Repository Bootstrap (DevOps, 0.5 day)**
   - Introduce `secrets/stripe.enc.yaml` containing new keys post-rotation.
   - Add `scripts/secrets/decrypt.sh` and update `.gitignore` to prevent plaintext output.
3. **CI Integration (DevOps, 1 day)**
   - Update `backend-ci.yml` to run `sops -d` before tests/builds.
   - Extend deployment workflows to push decrypted secrets to Render/Fly.io.
4. **Documentation & Training (DevOps + Payments, 0.5 day)**
   - Finalise `docs/SECRETS.md` onboarding guide.
   - Host a 30 min walkthrough with engineering.
5. **Follow-up**
   - Review the process after the November rotation; if manual steps remain painful, reconsider Vault.

## Open Questions
- Can Render/Fly.io consume secrets directly from AWS without storing them locally? (Investigate using their Terraform providers.)
- Should we use age instead of AWS KMS to simplify local onboarding (no AWS credentials needed)?
- Do we need audit logs for compliance this quarter? If yes, consider enabling AWS CloudTrail for KMS usage.

## Next Actions
- [ ] Review and approve recommendation with DevOps + Payments by 2025-09-18.
- [ ] Execute Stripe rotation using SOPS-managed secrets (see `docs/SECRETS.md`).
- [ ] Schedule November rotation dry-run to validate automation.
