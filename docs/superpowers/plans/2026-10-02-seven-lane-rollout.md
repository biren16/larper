# Seven-lane rollout execution record

Goal: implement the approved Music, Screen Culture, Style, Gaming & Tech, Internet Culture, Books, and F1 rollout. No other niches or backup work.

Architecture: extend the existing Studio, source registry, Supabase ingestion and editorial RPCs. Use 21 feed presets, four publisher/document references and reusable creator identities; no scraping or autopublishing.

## Tasks

- [x] Source catalog, idempotent registration, seven beats and reviewed activation.
- [x] Shared Node/Edge parsing and origin-aware manual evidence persistence.
- [x] Atomic private draft save/reload and seven researched starter drafts.
- [x] Sneakers/Streetwear filters within Style.
- [x] Local regressions, staging rollout runner and operation documentation.
- [x] Whole-branch review and fixes.
- [ ] Deployed staging verification (external configuration and founder session missing).

## Verification and decisions

- Baseline: clean isolated checkout `/private/tmp/larper-radar-trust-fixes`, branch `codex/radar-trust-fixes`, commit `a3d4b4d`; 58 test files / 239 tests passed.
- Existing staging environment and authenticated storage state are absent. Local code and research can be completed; deployed ingestion, scheduled ingestion and staging publication cannot be reported verified without them.
- Preserve source IDs, history, activation state and unrelated original-checkout changes.
- Publication requires two available origins, credible evidence and fresh founder confirmation; draft saves do not grant publication approval.

This file records implementation progress and verification results as tasks complete.

## Implementation evidence

- Catalog registration regression applied twice with 25 records, preserved original settings/history, seven-beat constraints and reviewed activation. New sources stay paused.
- Shared RSS/Atom normalization fixes multi-link selection, CDATA and invalid date handling. Node fixtures and actual Deno parity test pass; Deno checks the collector.
- Private save/reload, actor enforcement, same-publisher gates, manual domain/trust inheritance, creator reuse and observation preservation have unit/SQL regressions.
- Seven real research drafts include explicit contribution/original-reporting assessments; authenticated atomic import is idempotent even after founder slug edits. No publisher images or popularity metrics imported.
- Style route rendering tests cover both query filters, overlapping lore tags, invalid filters, empty results and one follow preference.
- Initial Node feed audit: 20/21 with a transient RogerEbert error; second complete audit: 21/21 parsed. Actual results saved in research; no deployed verification is inferred.
- Staging runner verifies actual cron job/run metadata and deployed source IDs, then exercises all seven real drafts through private/public/private flows and cache removal. Missing staging config/auth remain external prerequisites.

Ruling: use two distinct first-person developer accounts for the Gaming & Tech draft — original Polygon URLs returned 502 in research, while the chosen PlayStation/Xbox accounts independently describe different games — cost if wrong: founder should reject/rewrite that editorial connection before publication.
Ruling: preserve saved reviewing drafts during automatic evidence expiry — starter drafts must remain available for founder review — cost if wrong: old private drafts remain in the queue until a founder rejects or expires them.


## Final whole-branch review

Fresh reviewer: `/root/seven_lane_review`; four Important findings, no Critical or Minor findings. All four entered one fix pass; no second review was dispatched.

- Final: fixed release-time source counting — `origins-drafts-regression.sql` scheduled publisher consolidation failed before the new release function, then passed, including a positive independent-origin release; full SQL suite 11/11.
- Final: fixed generic publisher registration bypassing creator trust — `actions.test.ts` social URL through manual/RSS publisher forms failed before the action guard, then passed. Legacy generic social references are refused by both normalization and database capture. `manual.test.ts` failed before the guard and passed after it; full unit suite 282/282.
- Final: fixed publisher websites becoming separate creator origins — `origins-drafts-regression.sql` failed with a duplicate creator identity before the new registry function, then passed. Publisher websites reuse registered identities; unknown creator websites use the publisher origin namespace and retain watchlist trust. Existing website creator IDs/history are preserved during origin repair; full SQL suite 11/11.
- Final: fixed staging manual-intake omission — missing manual-capture input helper produced a failing test; all seven real pairs now validate registered origins and publication instants. The runner submits all fourteen through the real Studio composer, checks persisted identity/trust/canonical URL/publication date/first observation, and checks association with each reviewed draft. Full unit suite 282/282. The actual browser journey needs staging credentials and is not claimed passed.

Final: Ruling: deployed Auth/RLS, Edge, actual cron delivery, cache removal and the full Supabase migration chain remain unverified — missing staging configuration/auth prevents these checks, and local SQL fixtures do not prove deployment behavior — cost if wrong: deployment failures remain undiscovered until the staging gate runs.
Final: Ruling: starter factual wording and shared upstream reporting remain subject to founder assessment — researched receipts and contribution assessments are supplied, while imports/save never grant publication approval — cost if wrong: an unsupported claim needs rejection or rewriting before release.
Final: Ruling: preserve pre-existing recapture availability restoration and scheduler locking/cache behavior beyond the specified origin fix — these were not newly established regressions; actual founder recapture and deployed checks remain the acceptance path — cost if wrong: existing availability/concurrency/cache defects can still require fixes during staging.

## Final local evidence

- Lint and type check: exit 0.
- Unit: 66 files, 282 tests passed.
- SQL: all 11 regression files passed on disposable PostgreSQL, including new migrations and review fixes; this is contract coverage, not a full Supabase deployment.
- Deno: actual runtime parity test 1/1 passed; Edge collector type check exit 0.
- Build: exit 0; authenticated `/studio/starters` route included.
- Local desktop/mobile browser suite: 32 passed, 14 viewport-specific skips.
- `npm run test:staging`: exit 9, `.env.staging: not found`; no live staging mutation or publication performed.
- Node feed recheck: 21/21 reachable and parsed; reviewed permission and deployed collection remain separate gates.

## Staging bootstrap correction — 2026-10-02

The founder linked isolated staging `rllftxsfixgkcmjvpypu` and ran `supabase db push --include-seed`. Twelve historical migrations applied; `202609220003` then failed with a foreign key violation because Screen Culture only existed in the seed, which runs after migrations. Prior SQL fixtures did not exercise this fresh-project seed ordering.

Added `202609220001_bootstrap_screen_culture.sql` ahead of the dependent historical migration, preserving all existing migration files. It inserts only a missing Screen Culture niche and preserves existing content/status on upgrades. The already partially migrated staging database must resume with `--include-all --include-seed`; successful migration history entries remain intact.

Reproduced the exact foreign key failure on empty local tables before the fix. The new transactional SQL regression passes fresh installation and repeated installation with founder edits/inactive status. All 12 SQL regressions and 282 unit tests pass. All 28 migration files followed by seed also pass in an empty local database, with local substitutes for Supabase-managed auth/storage/cron schema dependencies and without the unavailable pg_cron/pg_net extension creation statements. This local check does not verify hosted extension behavior, actual scheduler delivery, or staging completion. Remote continuation remains founder-operated.
