# Task 1 report — Studio release one

Inspected/completed source implementation 2026-10-03 in `/private/tmp/larper-radar-trust-fixes`, branch `codex/radar-trust-fixes`, starting revision `7d7efb25eb07c1895f36b5ecbd20cadbea974b7f`. No push or deployment performed. The checkout's AGENTS.md contained only the installed Next documentation rule; HANDOFF.md, docs/current-work.md and docs/README.md were absent. Read the task brief, global constraints only from the plan, installed Next use-server/server-actions guides and TDD skill.

## Implemented

- Added private incomplete working copies, initial revision/editor/timestamps, snapshot-preserving backfill and new private story creation.
- Working saves never modify live/scheduled snapshot content, publication date, lifecycle, observation dates, or scheduled time.
- Added candidate editorial version; private save/approval/lifecycle actions lock and check the expected version. Story changes by previous app/scheduler also advance the version. Stale versions return an explicit conflict and retain both copies.
- Wrapped publication approval rather than replacing independent-origin, credible-source, brief, evidence-row locks and media-rights guards. Live updates preserve slug/date; scheduled updates retain time; explicit reschedule/cancel are available.
- Added one-second inactivity autosave, explicit Save, Unsaved/Saving/Saved/Save failed/Conflict, structured validation information, retained uncontrolled input across action errors, uploaded-image selection without form reset, and browser recovery with account/environment/candidate scope.
- Recovery offers an explicit choice; successful saves clear it, explicit sign-out clears draft recovery, and leaving unsaved writing warns. New typing during a pending request remains unsaved and is queued for another save.
- Shared candidate/starter editor provides Write / Evidence & cover / Preview & publish anchors. Persistent Studio Overview/Posts/Sources/Media navigation exposes environment and public destination. Minimal Posts/Media landing pages have real destinations and New story creates a private working record.
- The old Save RPC remains for rollout/rollback with unpublished compatibility; its legacy underlying function is revoked from API roles. The wrapper rejects live/scheduled snapshots and mirrors safe unpublished edits into private working content. Existing starter paths populate working content through this wrapper. Existing reviewing story rows remain for backward compatibility.

## Changed files

Migration and database tests: `supabase/migrations/202610030002_editorial_working_snapshots.sql`, `supabase/tests/working-drafts-regression.sql.inc`, `supabase/tests/fresh-platform-stubs.sql.inc`, `scripts/test-fresh-schema.mjs`, `scripts/test-working-draft-concurrency.mjs`.

Backend: `src/backend/editorial/service.ts`, `service.test.ts`, `postgres-store.ts`, `studio-reader.ts`, `actions.ts`, `actions.test.ts`, `src/data/postgres/database.types.ts`.

Studio: `src/app/studio/actions.ts`, `actions.test.ts`, `layout.tsx`, `studio-navigation.module.css`, `posts/page.tsx`, `media/page.tsx`, `candidates/[id]/page.tsx`, `candidates/story-editor.tsx`, `story-editor.test.tsx`, `use-draft-protection.ts`, `draft-protection.test.tsx`.

Sign-out recovery cleanup: `src/components/shell/header-menu.tsx` (no visual/public typography change).

Staging harness: `playwright.studio-staging.config.ts`, `staging/admin-release-one.spec.ts`. Contracts: `docs/editorial-working-drafts.md`. This report.

## Contracts

The action form field is `editorialVersion`; missing, negative, fractional or unsafe values fail. SQL expects `p_expected_version`. A successful result's `revision` is the current editorial concurrency token, distinct from `story_revisions.revision` and the private working row's revision. Private save retains the legacy `{ storyId, revision }` store shape, but its `storyId` contains candidate identity because no story row may exist. No client routes to that value.

Private saves reset persisted independent-source confirmation to false. A published snapshot is approved only through the existing publication gate inside `approve_editorial_version`; updating scheduled content delegates the same gate. Versioned transitions call the previous atomic transition and then advance the token. Failed SQL approval rolls back the whole transaction. Private RLS has no anonymous/account policy or table grants; execute grants are only service_role and callers must first pass authenticated editorial authorization.

Action factory failures include `{ ok: false, error, conflict, fieldErrors, blockers }`; upload failures return `{ ok: false, error }` and are caught in the same retained editor. Approval success returns an optional destination. Autosave does not clear a recovery copy if newer typing occurred during the pending request. Conflicts block automatic retry until the latest version is reloaded; retained values can be recovered explicitly.

## Red/green and verification evidence

Observed initial red: `npm test -- src/backend/editorial/service.test.ts` failed two tests because saves rejected live/incomplete edits. After separating working validation/save, that service suite passed. Observed UI red: `npm test -- src/app/studio/candidates/draft-protection.test.tsx` failed because inactivity did not save and live Save was absent. Those tests passed after wiring protection and private-live controls.

The first full suite exposed six outdated assertions: action structured returns instead of redirects, returned revision/expected version, and previously hidden published Save. Updated those assertions to the approved contracts; no failures omitted. Additional recovery/upload/pending-request coverage was added after implementation, so it is regression coverage rather than claimed test-first evidence. SQL migration/regression checks were also executed after SQL implementation; no fabricated SQL red evidence.

Final commands/results:

- `npm run lint`: exit 0, no warnings/errors.
- `npm run typecheck`: exit 0.
- `npm test`: exit 0, 70 test files / 320 tests passed.
- `npm run build`: exit 0, Next 16.3.5 with Cache Components, Studio dynamic/Suspense routes compiled successfully.
- `PGHOST=/private/tmp PGPORT=54439 PGUSER=birenkumar PGDATABASE=studio_release_one node scripts/test-fresh-schema.mjs`: exit 0. Runs full additive chain plus existing editorial journey and private working regression in rollback transaction. Proves incomplete save/no public row, snapshot byte equality, anon/account isolation, stale-save rejection, live URL/date preservation, schedule update/time preservation/cancel, legacy scheduled Save rejection, and approval failure atomicity.
- `PGHOST=/private/tmp PGPORT=54439 PGUSER=birenkumar node scripts/test-working-draft-concurrency.mjs`: exit 0; pre-migration stories unchanged after backfill, and two PostgreSQL sessions serialize with stale writer rejected and first writer's content retained. Script creates/drops its own database.
- `git diff --check`: exit 0.

An initial build found an event-target TypeScript cast issue; corrected it and subsequent production builds passed. Initial repeat fresh-schema run encountered globally retained bootstrap roles after the concurrency database was dropped. Automatic approval review rejected deleting these roles due to potential shared-role risk. Used the safer alternative: test bootstrap now creates absent roles idempotently and never deletes existing roles. Full-schema and concurrency checks then passed. These test roles remain in the controller's isolated PostgreSQL cluster.

## Limits, risks and next action

No authenticated deployed browser run was claimed. The staging harness uses the existing production exclusion guards (`readStagingConfig`), STAGING_SUPABASE_SERVICE_ROLE_KEY, and current founder editor IDs; it requires a real authenticated staging session. It retains isolated test records through a versioned reject action. Controller owns real staging CUA/Playwright, Edge/RLS/storage/scheduler evidence, deployment and public typography comparison.

Posts/Media deliberately remain minimal release-one entry pages; search/filter/trash management and richer media library/preview/upload transformation belong to releases two/three. Existing evidence merge/split services retain their pre-existing atomic/auth checks; their selection UX and expanded management are subsequent releases. Legacy reviewing story rows are not removed or silently published. A service-layer internal legacy call without a version remains available for previous internal contract compatibility; the new form-action entry points require a version.

Recovery uses sessionStorage: it survives refresh within that browser session, not a closed session or unavailable storage. The live date guarantee covers updating an existing live snapshot; the previous unpublish transition's separate lifecycle semantics are retained for the subsequent management release. Existing rights/format upload limitations remain until release three.

Next action: controller reviews this scoped commit, applies migration before the compatible app to isolated staging, exercises real authenticated save/conflict/live/schedule/upload/navigation flows, records evidence and only then decides rollout. Unrelated dirty `docs/operations/2026-10-03-staging-debug-audit.md` and the controller's untracked plan are preserved and excluded from the commit.

## Round-one review fixes (2026-10-03, base e4c32e1)

Read the complete independent review and corrected both Important findings. Cancel schedule now calls the private save RPC inside the same locked SQL transaction before cancelling; a successful cancellation therefore persists the complete current submitted draft, including writing entered after a failed save. The successful result explicitly supplies `workingPersisted: true`; cancellation uses the `schedule-cancelled` notice and scheduled-version updates have their own notice.

Brief approval now carries a separate complete `StoryDraft` working payload through action factory → service → PublicationCommand → store → optional SQL `p_working_draft`. The public BriefDraft projection remains reduced. SQL stores the explicitly submitted complete working copy, including newly typed fields not previously autosaved. A reduced internal caller without that payload merges the stored working copy as a compatibility fallback; this fallback is not the solution for current editor submissions. Persisted independent confirmation remains false. The newest migration was edited before any deployment, as authorized by the controller; execute grants/types now use the added eighth jsonb parameter.

The client clears recovery after a successful primary working save or explicit working-persistence result, and only if no newer typing occurred. A dirty successful action without persistence confirmation retains writing/recovery, remains Unsaved, and cannot navigate away. An action invoked on an already clean editor can complete its navigation without claiming to persist new writing. Reflowed the hook with explicit state transitions and comments, and expanded the SQL full-working-content branch. Studio navigation now labels Staging/Production/Development explicitly and displays the configured destination hostname.

Focused red evidence: `npm test -- src/app/studio/candidates/draft-protection.test.tsx src/backend/editorial/actions.test.ts` initially failed the missing full-working brief payload test. After correcting the cancellation test harness to invoke the real protection hook directly, `npm test -- src/app/studio/candidates/draft-protection.test.tsx` failed with Saved instead of Unsaved on non-persisting successful cancellation after a failed save. Both failures became green after the fixes. Added dirty cancellation checks before autosave and after prior save failure, plus database current-unsaved cancellation/brief retention and reduced-internal-brief saved-text retention assertions.

Final round-one commands/results:

- `npm test -- src/app/studio/candidates/draft-protection.test.tsx src/backend/editorial/actions.test.ts`: exit 0; 2 files / 14 tests passed.
- `npm run typecheck`: exit 0.
- `npm run lint`: exit 0; no warnings/errors.
- `npm test`: exit 0; 70 files / 324 tests passed.
- `npm run build`: exit 0; Next production build compiled with the Studio routes.
- `PGHOST=/private/tmp PGPORT=54439 PGUSER=birenkumar PGDATABASE=studio_release_one node scripts/test-fresh-schema.mjs`: exit 0; complete migration/retained journey plus full working regressions passed and rolled back. The initial new brief fixture was rejected by the unchanged brief eligibility gate; made its heat/confidence/allowlisted-source prerequisites explicitly eligible inside the rollback-only test, then it passed. This is local fixture evidence, not deployed approval or RLS evidence.
- `git diff --check`: exit 0.

No deployment, push or subagent used. Unrelated audit and plan remain excluded. Next action: controller re-reviews these changed persistence paths before real staging acceptance.
