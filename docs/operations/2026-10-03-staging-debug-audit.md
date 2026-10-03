# Staging release debug audit — 3 October 2026

Scope: existing seven-lane branch and isolated staging; production integration follows a verified audit.

## Audit checklist

- [x] Login (code regressions and hosted provider availability): provider availability, errors retain destination, expired links, authorization.
- [x] Studio (code and hosted desktop; hosted mobile limitation below): starter instructions and controls, status notices, mobile editor, published-story navigation.
- [x] Editorial (full schema, concurrency, and hosted Music): draft/save/reload, brief subtopics, schedule, transitions, merge/split evidence integrity.
- [x] Discovery (fixture browsers and hosted public dataset): published lore, empty states, Style filters, covers, navigation, follows/saves.
- [x] Database: all migrations on a fresh schema and regression fixtures.
- [ ] Ingestion (reviewed real feeds still outstanding): deployed authorization, source usage gates, health, schedule prerequisites.
- [x] Release checks for this debug patch: lint, types, unit suite, build, desktop/mobile browser suite, deployed checks.

## Baseline

- Clean branch at f2728fe.
- Lint/types and 294 unit tests passed.
- Browser suite: 31 passed, 14 intentionally skipped, one 320px header assertion measured a streamed hidden button before it became visible. Investigate before treating this as a layout regression.
- Actual staging founder Studio loads; Music remains published in the database and appears on a fresh homepage load. An old browser tab retained the previous empty edition.
- No staging ingestion runs. Source usage review and schedule setup remain unverified; endpoint reachability is not permission.

## Confirmed code issues being repaired

1. Authentication error redirects discard `next`, losing Studio destination on retry.
2. Google button is offered even when the staging provider is disabled.
3. Style briefs ignore Sneakers/Streetwear selections.
4. Cover upload redirects with a notice that has no corresponding success message.
5. Starter intake uses native unstyled buttons, no lane labels, excessive spacing, and unclear workflow.
6. Default cover title can collide with the homepage caption overlay.
7. Merge/split mutate evidence through multiple requests and can alter published evidence without reopening review. Validate and make operations atomic.

## Repairs and local verification

Additional confirmed repairs:
- Watchlist now includes Style in the seven-lane priority order and counts only successfully collected live feeds.
- Empty engagement inputs no longer become measured zeroes.
- Node and Edge use the same source URL guard; embedded credentials and localhost subdomains are rejected.
- Cover captions no longer overlap fallback artwork or uploaded image credits on lead cards.
- Merge preserves sensitive flags, regional context, terms, and the earliest observation in both cluster and saved story.
- Merge/split and their audit events are atomic; published evidence and foreign split IDs are rejected; stale schedules are cancelled.
- Scheduler uses the same cluster-before-story lock order and skips a concurrently edited candidate.
- Scheduling an already public story cannot silently unpublish it.
- Malformed Studio candidate IDs become 404s; authentication retains the exact candidate destination.

Fresh checks on 3 October:
- Lint and TypeScript: passed.
- Unit suite: 311 tests across 69 files passed.
- Production build: passed.
- Desktop/mobile browser regressions: 32 passed, 14 explicitly skipped. These fixture checks do not establish authenticated hosted rollout evidence.
- All 12 existing SQL regression files: passed.
- Fresh schema: all 30 migrations and seed applied in a disposable transaction; seven prepare/save/publish/unpublish/retained-draft journeys passed, plus evidence membership, audit rollback, schedule cancellation, metadata, private RLS, and RPC grants.
- Concurrent editor/scheduler: two real database sessions passed; locked candidate skipped without a deadlock.
- Deno: deployed parser parity fixture and Edge type checks passed.

Fresh-schema tests stub hosted platform services, not application SQL. They do not verify hosted cron execution, feed permission, network access, or real founder source assessments.

Staging migration `202610030001` applied through the authenticated Supabase SQL editor to project `rllftxsfixgkcmjvpypu`, transactionally with its migration-history record. Dashboard result confirmed the recorded version. No production migration applied.

## Remaining rollout gates

- Remaining hosted journeys: the other six starter lanes and an approved image upload.
- Record actual permission/usage review before enabling the 21 automated presets. Never mark permission based on feed reachability.
- Exercise reviewed feeds through the deployed Edge runtime and resolve/report publisher restrictions.
- Scheduled-ingestion prerequisites and the real cycle are verified below; successful collection/source-failure handling still requires approved feeds.
- Complete hosted journeys for remaining starter lanes; local fixture journeys are not substitutes.
- Google remains disabled in staging; email delivery quota still applies. UI accurately reflects configured providers but does not create OAuth credentials or bypass delivery limits.

This audit is not a production merge approval or a claim that every possible bug is eliminated.

## Hosted checks

- Vercel preview build `8e047f1` reached Ready; branch alias loaded the new starter styling and all seven lane labels.
- Auth shows email only when Google is disabled. Provider settings remain isolated to staging.
- Music: founder editor unpublish succeeded; refreshed discovery showed no verified story. Reopening the editor retained all text and cover selection; Save Draft created revision 4. Restoring the existing publication succeeded and refreshed discovery showed Music again. The original published state was restored.
- Sneakers and Streetwear show the named controls and honest empty states on the actual hosted dataset.
- Edge ingest redeployed: GET 405; unauthenticated POST 401; authenticated manual POST 200. It skipped four active unreviewed sources, collected zero feeds, and reported zero processing errors. This verifies the usage gate, not feed collection.
- Scheduler diagnostics showed the real 03:00 UTC cycle failed. Both expected Vault entries were absent. Configured the staging destination and the already supplied staging ingestion key through the installed Vault interface; no credential value placed in SQL snippets, logs, or this report. Await an actual later scheduled cycle before claiming success.
- Browser viewport override did not change the actual Chrome viewport (DOM remained 1470px); hosted mobile Studio is not claimed as verified. Automated desktop/mobile public browser regressions passed.
- Added a direct View public story link in the published editor; schedule and evidence-edit controls are hidden until unpublication. Covered by a new component regression.

## Final observed scheduler result and release status

The real 06:00 UTC cycle on 3 October succeeded after the Vault repair. Cron `startedAt=2026-10-03T06:00:00.0974Z`, `finishedAt=2026-10-03T06:00:00.144681Z`; Edge ingestion run `trigger=supabase_cron`, `started_at=2026-10-03T06:00:01.433Z`, `status=succeeded`, `source_count=0`, `inserted_count=0`, `error_count=0`. This proves dispatch and execution under the original three-hour schedule; it does not prove approved-feed collection.

Final code deployment `5c5b9c3` reached Ready and displayed View public story, with scheduling and merge/split controls absent for the live story. Hosted anonymous REST access returned one published story, no private lifecycle; the anonymous evidence-edit RPC returned 401.

Production integration remains pending reviewed feed collection, remaining hosted lane journeys and approved image upload, and hosted mobile Studio verification. Google OAuth/production email delivery configuration remain external setup choices. Backup recovery stays with the separate task.
