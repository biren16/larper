# larper

larper is an India-first, globally aware culture radar for Gen Z: a public discovery product for finding what niche communities are currently obsessed with, seeing the evidence behind that movement, and understanding the lore without pretending one viral post is a trend.

## Product shape

- Public discovery remains free and works without an account.
- Optional Google or email-link accounts sync follows and saves.
- RSS/Atom, the official YouTube API, and founder-entered public links feed an evidence pipeline every three hours.
- Deterministic clustering and scoring rank momentum, independent-source diversity, freshness, novelty, India relevance, and India/global crossover.
- Founder-only Studio gates publication, preserves revisions, shows source health, and keeps sensitive subjects under review.
- Production never displays fictional fixture signals. Seed stories remain local-development and test data only.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Without Supabase variables, local development uses deterministic discovery fixtures and anonymous preferences. With Supabase configured, apply the migrations and `supabase/seed.sql`; the runtime then uses live database records. Open `http://localhost:3000`.

## Environment

Copy `.env.example` and fill only the services you are running. Production needs the canonical site URL, public Supabase URL/key, server-only service role key, and founder email allowlist. The Edge Function also needs the ingestion secret and YouTube key. GitHub backup secrets are separate. Never expose service, ingestion, database, or encryption credentials with a `NEXT_PUBLIC_` prefix.

## Quality checks

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Playwright needs Chromium once per machine:

```bash
npx playwright install chromium
```

## Project map

- `src/backend/ingestion`: adapters, normalization, retries, and idempotent pipeline contracts.
- `src/backend/intelligence`: clustering, scoring, publication gates, expiry, and diverse feed ordering.
- `src/backend/editorial`: authorization, publication services, Postgres mutations, and Studio reads.
- `src/backend/accounts`: narrow account data layer, synced follows/saves, and minimal analytics.
- `src/data/postgres`: Supabase-backed public repository and generated-style database types.
- `src/data/seed`: development/test-only fixtures.
- `supabase/migrations`: schema, RLS, editorial transaction, processing, and schedule.
- `supabase/functions/ingest`: the three-hour Edge ingestion entry point.
- `docs/operations/live-culture-runbook.md`: deployment, editorial, incident, backup, and beta procedures.
- `src/domain/discovery`: domain contracts, ranking, and page view-model services.
- `src/components`: editorial discovery UI, preference state, and site shell.
- `src/app`: Discovery, topic detail, and niche routes.
- `public/media`: local generated editorial artwork used by the seed dataset.
- `docs/architecture/discovery.md`: architecture and future ingestion seam.
