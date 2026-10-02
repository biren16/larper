# Seven-lane rollout

## Scope and review gates

Exactly these lanes: Music → Screen Culture → Style → Gaming & Tech → Internet Culture → Books → F1. The catalog has 21 RSS presets and four manual references: Crunchyroll News, THR India, Homegrown and FIA documents. Reusable original creator profiles are manual watchlist records. No social or article-body scraping is added.

Apply migrations in filename order. New source registration is paused and idempotent. Matching source IDs, settings, last collection dates and evidence history remain intact; aliases repair canonical feed locations. Studio lists all seven beats in priority order, plus pre-existing unassigned registry records for inspection. The `tech-gaming` watchlist beat intentionally maps to the existing `gaming-tech` niche ID.

Before activating a feed, use **Review source usage** in `/studio/sources` to record a public terms/permission URL, permission basis and permitted method/restrictions. The server attributes the review to the authenticated founder/editor and records its time. Both the database and Edge collector enforce this gate. Legacy active sources without a review remain registered but are skipped and shown as needing review.

Manual capture requires a registered publisher or reusable creator profile. The server validates the link's domain and inherits the registered trust tier. Creator profiles remain watchlist, including when a client submits another trust tier. For opaque Instagram/YouTube post IDs the founder confirms ownership; profile aliases that cannot be resolved without platform access need founder assessment. Social profile URLs cannot be registered through the generic publisher form. A creator website on a registered publisher domain reuses that publisher; unknown creator websites stay watchlist and share the publisher origin namespace. Publisher/profile identity drives corroboration, scoring, story publication and scheduling, including the release-time check. Distinct URLs or feeds owned by one origin do not create two sources. Shared upstream interviews or syndicated copy still need founder assessment.

## Private drafts and covers

Use **Save draft** in a candidate editor. It saves full content atomically as `reviewing`, adds a revision and audit event, and reloads the same fields. It never grants publication approval and cannot save over a public story. Saving an unpublished scheduled story cancels that schedule; the editor displays that consequence.

`/studio/starters` contains one researched draft per lane, two real source receipts, dates, attribution and an independence assessment. Open both receipts before preparing the draft. Imports preserve founder edits using stable starter keys even when slugs change. Automatic signal expiry retains saved founder drafts. No fabricated heat, metrics or popularity are supplied.

The seven drafts are stored in the repository and import through the authenticated editorial service and an atomic database operation. They have not been inserted into a deployed database without staging credentials. Public publishing retains the normal founder review gate. Existing LARPer covers or uploaded assets with recorded rights are used; publisher images are never automatically imported.

Style has explicit Sneakers and Streetwear tag controls. A story may carry both. `/niches/style?subtopic=sneakers` and `?subtopic=streetwear` filter current stories and deep lore after loading the shared cached Style dataset. There is one Style follow preference. Unknown filters select All Style; an empty shelf says so.

## Local checks

- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
- Run all `supabase/tests/*.sql` in a disposable database with `psql -v ON_ERROR_STOP=1 -f …`.
- `npx deno test supabase/functions/ingest/feed-parity.test.ts` and `npx deno check supabase/functions/ingest/index.ts`. The shared Node/Deno fixtures cover RSS, Atom, CDATA, multi-link selection and date normalization. CI has a Deno gate.
- `npm run test:e2e -- --workers=1` for the existing local desktop/mobile suite. Rendered Style route tests cover both shelves, overlapping tags, unknown filters, empty results and shared follow identity.
- `node tools/check-culture-feeds.mjs` is a read-only Node availability audit. Its results are **not** deployed verification or permission evidence.

## Real staging verification

Use the environment and founder session setup in `staging-release-test.md`. In `.env.staging`, set `STAGING_ROLLOUT=seven-lanes` and point `STAGING_INPUT_FILE` to a local copy of `staging/culture-input.example.json`. Keep real keys and auth state out of Git and chat. Missing configuration fails the command.

1. Deploy the app, every migration, and the Edge function to a separate staging project. Seed the existing niche catalog once. Check the actual production exclusion URLs.
2. Register the presets through Studio twice. Open current publisher terms/permission records, record usage reviews, then activate the permitted feeds. Restricted feeds must stay paused and be recorded as blockers. The test cannot honestly pass all 21 if a publisher cannot be collected under the reviewed method.
3. Enable the existing `0 */3 * * *` job with staging-only Vault secrets. Allow a real cycle to run **after** every approved preset is due. The new read-only schedule diagnostic returns job metadata and actual job-run timestamps; it does not return secrets or command text. Edge run details identify every attempted source. A manually invoked request is recorded as `manual`, not as scheduled delivery.
4. Reopen the fourteen starter receipts in `/studio/starters`. Assess distinct original reporting, including shared upstream material explicitly disclosed in the drafts. Set the corresponding local input flags only after that review.
5. Run `npm run test:staging`. It verifies deployed Studio/database identity and anonymous Studio denial, repeated source registration, actual scheduler delivery, all 21 feed records and unresolved failures, and one real private/public/private journey for every lane.
6. The seven journeys exercise registered manual intake → review → save/reload → founder-confirmed publish → public page/LARPer cover/OG → unpublish → warmed niche/style/story cache removal. Each journey submits both receipts through the real Studio composer, verifies persisted attribution and first-observation preservation, then checks the receipts belong to the reviewed draft. Both Style subtopics are tested against the overlapping-tag story. Failure cleanup attempts to remove any publication the runner made. All seven drafts are retained privately.

The runner writes `staging-results/**/seven-lane-evidence.json` and public screenshots. It records actual source failures and schedule data; fixtures cannot satisfy the deployed gates. A transient failure, absent scheduled cycle, source restriction, missing auth or mismatched deployment fails verification. Do not call a partial run passed. Reviewed feeds remain active on isolated staging for subsequent health checks; pause them through Studio when that verification environment is retired.

## Current external prerequisites

No `.env.staging` or founder Playwright auth state was supplied in this checkout. Live Edge polling, scheduled delivery and seven publish/unpublish journeys remain unverified. Backup recovery and other niche rollouts remain outside this work.


## Verified local results

Final local checks passed: lint, TypeScript, 282 unit tests across 66 files, all 11 PostgreSQL regression fixtures, actual Node/Deno parser parity and Edge type check, the production build, and 32 desktop/mobile browser tests (14 viewport-specific skips). The fresh branch review found four Important issues; all four have regression coverage and were fixed. See the execution record for decisions and limitations. `npm run test:staging` exits 9 because `.env.staging` is missing; no live rollout is claimed.
