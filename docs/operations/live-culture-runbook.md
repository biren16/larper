# LARPer live-culture operations runbook

## What runs in production

Supabase Cron calls the `ingest` Edge Function every three hours. The function authenticates with `INGESTION_SECRET`, polls only active source definitions, stores canonical raw signals and time-series snapshots idempotently, then invokes deterministic clustering and scoring in Postgres. Vercel serves the cached public Next.js application; it does not run scheduled ingestion.

The public feed always reads the latest published database edition. A failed ingestion run therefore leaves the last verified stories available with their original `lastCheckedAt` timestamps. It never substitutes development fixtures in production.

## First deployment

1. Create a Supabase project and apply migrations in filename order.
2. Run `supabase/seed.sql`. This creates the eight launch beats, useful aliases, one active manual intake source, and inactive RSS/YouTube templates.
3. Replace template configuration with founder-approved public RSS/Atom URLs and official YouTube channel IDs. Leave a source inactive until its terms, URL, locale, region, and trust tier have been reviewed.
4. Deploy `supabase/functions/ingest` with `INGESTION_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `YOUTUBE_API_KEY` configured as Edge Function secrets.
5. Add Vault secrets named `project_url` and `ingestion_secret`, then apply the scheduling migration. The ingestion secret in Vault and the Edge Function must match.
6. Configure Supabase Auth Site URL and redirect allowlist for `/auth/callback`. Enable Google only after its consent screen and production domain are correct.
7. Set the Vercel variables documented in `.env.example`. Add founder/editor roles directly in `profiles`, and keep `FOUNDER_EMAIL_ALLOWLIST` equally narrow. Studio access requires both checks.

## Source approval

Use public, permitted endpoints only. Approved launch adapters are RSS/Atom, official YouTube API search/channel data, and founder-entered public URLs. Instagram, TikTok, and Reddit links are corroborating manual evidence unless durable supported API access is available. Never add login scraping, browser automation, copied private posts, or unsupported endpoints.

For every source, record its owner and public URL, adapter and polling interval, locale and region, trust tier, allowlist status, review date, and usage constraints.

## Daily editorial routine

1. Check `/studio` pipeline status and unresolved source failures.
2. Open the highest-heat candidates, verify every factual source, and merge obvious duplicates.
3. Publish 3–5 reviewed stories across at least four qualified beats. Sensitive topics always remain human-reviewed.
4. Use briefs only when two independent allowlisted sources, heat of at least 70, confidence of at least 80, and zero sensitive flags are present.
5. If evidence disappears or becomes private, unpublish or return the story to review. The public cache is invalidated immediately.

Auto-publishing remains operationally disabled at launch. The backend enforces eligibility, but founders should enable unattended briefs only after beta review decisions show acceptable precision.

## Incident handling

- **One source fails:** leave the verified edition online, inspect `source_failures`, confirm rate limits and feed validity, then retry. Do not broaden scraping access.
- **A full run fails:** verify Edge secrets, Supabase status, and the latest `ingestion_runs` record. Trigger the function manually with the same bearer secret after the cause is fixed.
- **A source is deleted/private:** mark the raw signal unavailable. Review any published story relying on it and unpublish if the remaining evidence no longer meets the gate.
- **Bad story published:** unpublish in Studio, record the reason, and verify the feed and topic cache have refreshed.
- **Account concern:** inspect Auth logs and RLS policies. Never use a service credential in the browser.

Launch health targets are at least 95% successful scheduled runs and review-queue arrival within six hours. Alerting can be added once a no-cost channel is chosen; until then, Studio is the operational source of truth.

## Backup and restore

The GitHub workflow exports the database weekly, encrypts it before upload, removes plaintext, and retains the private artifact for 14 days. On the first day of each month (and manual runs), it restores the export into an isolated Postgres container and verifies the schema is queryable.

Store `SUPABASE_DB_URL` and `BACKUP_ENCRYPTION_KEY` as GitHub Actions secrets. Keep the encryption key outside Supabase and Vercel. A backup is not considered healthy until a restore test succeeds. Supabase Free does not provide automatic project backups; upgrade before the product's recovery and uptime requirements exceed this workflow.

## Beta scorecard

Run a six-week private beta, interview at least five people in each chosen core segment, and record review decisions for threshold tuning. The product hypothesis passes when at least 30% return in week four and at least half of returning sessions open or save an unfamiliar niche.
