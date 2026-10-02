# Staging release test

`npm run test:staging` runs either the seven-lane rollout (see [seven-lane-rollout.md](seven-lane-rollout.md)) or, with `STAGING_ROLLOUT` unset, one serial browser journey against an existing staging deployment. It uses the deployed Studio, Supabase Edge Function, database, Storage, and anonymous public routes. The normal `test:e2e` suite continues to use local fixtures. Missing staging inputs fail the command; they do not skip the release test or produce a passing release result.

## Prepare the staging environment

Use a separate Supabase project and Vercel deployment. A Vercel preview connected to the live Supabase project is not isolated staging. Apply every repository migration in filename order and run `supabase/seed.sql` once. For the single-story runner, keep the automatic ingestion cron inactive while running this test so its run can be identified unambiguously. Keep template sources paused. Do not copy live user data into staging.

Deploy the `ingest` Edge Function to the staging project with its own `INGESTION_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and any required adapter credentials. Set the staging Vercel deployment's `NEXT_PUBLIC_SUPABASE_URL`, publishable key, service role key, founder email allowlist, and `NEXT_PUBLIC_SITE_URL` to the staging values. Redeploy after changing public environment variables; they are embedded at build time. Set the Supabase Auth Site URL and callback allowlist to the exact staging origin and `/auth/callback`. Give the test account a founder/editor profile role and include its email in the deployment's founder allowlist.

Copy `.env.staging.example` to `.env.staging` and enter only staging credentials. Check that both production exclusion URLs are correct. Set `STAGING_ALLOW_MUTATIONS=true` after confirming the two environments are separate. Before any mutation, the runner compares the source IDs displayed by Studio with the specified database's RSS/YouTube registry; an empty or different registry fails preflight. It also checks that a source created through Studio appears in that database before triggering ingestion. There is no fallback to `.env.local` or ordinary production credential variables.

## Capture the authenticated session

Create `.auth/`, then open the staging app with Playwright:

```sh
mkdir -p .auth
npx playwright codegen --save-storage=.auth/staging.json 'https://YOUR-STAGING-APP/auth?next=/studio'
```

Complete the normal Google or email sign-in flow, confirm Studio opens, and close the Playwright window to save the state. Use the staging founder account. The automated run verifies the saved session can access Studio and an anonymous browser cannot. It does not independently prove Google consent or email delivery; the manual capture provides that part of the journey. Recapture an expired session before another run.

`.env.staging`, `.auth/`, and `staging-results/` are ignored by Git. Browser state contains account credentials. Keep it local and do not upload it as a CI artifact. Traces and video are disabled for this authenticated journey; only the anonymous published page, its OG image, and an evidence record are attached.

## Choose real evidence

Copy `staging/input.example.json` to `.auth/staging-input.json`. Choose a permitted live RSS/Atom feed with a current report and an independent original public web report covering the same event. Review both origins yourself. Select the niche that matches the RSS beat (`tech-gaming` maps to niche `gaming-tech`). Use an accurate manual title close enough to the RSS report for the existing deterministic clustering to recognize it; do not fabricate a matching report. Fill the story fields with reviewed factual text and set `independentSourcesConfirmed=true` only after reviewing the pair. Record the manual report's actual publication timestamp with a timezone offset.

The runner does not fake adapter responses, seed a publishable candidate, insert evidence links, automatically merge unrelated reports, or invoke publication RPCs directly. If the reports do not cluster together, the run fails at that stage and preserves their IDs for investigation. This is a real release test, so a feed outage or auth configuration issue is a failure.

## Run and inspect the evidence

With Node 22+, dependencies installed, and Playwright Chromium installed:

```sh
npm run test:staging
```

The run creates a uniquely named paused RSS source through Studio, confirms it is in the correct database, activates it, and invokes the deployed ingestion function. It records the completed ingestion run ID and verifies the source appears Live without unresolved failures. It then captures the manual report through Studio and requires that its candidate includes available evidence from the newly ingested source.

It uploads a code-created blue WebP swatch through the rights-aware upload form, verifies the persisted rights and anonymously downloaded bytes, and selects it in the story editor. LARPer dedicates this generated test swatch to the public domain under CC0-1.0; it is a test asset rather than editorial illustration. The original source URL points to the fixture code in this repository. Cropping permission is deliberately unchecked so the run also checks restricted rendering.

The test warms the anonymous feed and unpublished story route before publishing, then publishes through Studio's normal source-review gate. It checks the publication audit, selected cover, image decoding, credit, evidence link, feed presence, and a decodable 1200 × 630 OG PNG. It unpublishes through Studio, checks the review audit and database lifecycle, and requires the warmed anonymous story route and feed to remove it. No retries hide a failure.

Each run writes `release-evidence.json` within `staging-results/`, plus `playwright.json` and anonymous image attachments. The evidence record contains the local run name, ingestion run ID, source/candidate/story/media IDs, story URL, completed stages, timestamps, result, and cleanup errors. A passing result requires the full journey and cleanup. No live staging run has been completed merely by adding or collecting this test.

## Cleanup and reruns

On success the story stays unpublished and the test source is paused. On failure the runner attempts to unpublish any test story that reached publication and pause its RSS source. Cleanup errors fail the run and identify what to inspect manually. Interrupted processes cannot guarantee cleanup: locate the `Staging RSS staging-smoke-…` source and test story in Studio using the evidence record or the run name.

Source, signal, candidate, media, story, and audit records are retained for inspection. No automatic deletion or rollback removes evidence of the test. A rerun may reuse an unpublished story only when its slug begins `staging-smoke-`; the runner refuses to republish another existing story. Run against a small dedicated staging dataset so the test publication can appear in the public feed. Refresh the evidence pair when a feed report is no longer current or the manual signal's candidate no longer accepts new evidence.

The single-story runner verifies one real adapter and publication path. It does not verify cron delivery, YouTube credentials, overdue-source recovery, every account feature, or backup restoration. Record those separately before claiming broader release readiness. The backup restore remains a separate launch gate.

The single-story input now includes a recorded feed usage review and the registered manual publisher’s source UUID. Generic manual-source capture has been replaced by domain-validated registered selection. Enter real permissions and an existing registered publisher in the local input file.
