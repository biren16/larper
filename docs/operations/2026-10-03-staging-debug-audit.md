# Staging release debug audit — 3 October 2026

Scope: existing seven-lane branch and isolated staging; production integration follows a verified audit.

## Audit checklist

- [ ] Login: provider availability, errors retain destination, expired links, authorization.
- [ ] Studio: starter instructions and controls, status notices, mobile editor, published-story navigation.
- [ ] Editorial: draft/save/reload, brief subtopics, schedule, transitions, merge/split evidence integrity.
- [ ] Discovery: published lore, empty states, Style filters, covers, navigation, follows/saves.
- [ ] Database: all migrations on a fresh schema and regression fixtures.
- [ ] Ingestion: deployed authorization, source usage gates, health, schedule prerequisites.
- [ ] Release: lint, types, unit suite, build, desktop/mobile browser suite, deployed checks.

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
- Unit suite: 310 tests across 69 files passed.
- Production build: passed.
- Desktop/mobile browser regressions: 32 passed, 14 explicitly skipped. These fixture checks do not establish authenticated hosted rollout evidence.
- All 12 existing SQL regression files: passed.
- Fresh schema: all 30 migrations and seed applied in a disposable transaction; seven prepare/save/publish/unpublish/retained-draft journeys passed, plus evidence membership, audit rollback, schedule cancellation, metadata, private RLS, and RPC grants.
- Concurrent editor/scheduler: two real database sessions passed; locked candidate skipped without a deadlock.
- Deno: deployed parser parity fixture and Edge type checks passed.

Fresh-schema tests stub hosted platform services, not application SQL. They do not verify hosted cron execution, feed permission, network access, or real founder source assessments.

Staging migration `202610030001` applied through the authenticated Supabase SQL editor to project `rllftxsfixgkcmjvpypu`, transactionally with its migration-history record. Dashboard result confirmed the recorded version. No production migration applied.

## Remaining rollout gates

- Validate the new hosted app build and publication/cache lifecycle.
- Record actual permission/usage review before enabling the 21 automated presets. Never mark permission based on feed reachability.
- Exercise reviewed feeds through the deployed Edge runtime and resolve/report publisher restrictions.
- Configure staging scheduled-ingestion prerequisites and observe a real scheduled cycle plus health reporting.
- Complete hosted journeys for remaining starter lanes; local fixture journeys are not substitutes.
- Google remains disabled in staging; email delivery quota still applies. UI accurately reflects configured providers but does not create OAuth credentials or bypass delivery limits.

This audit is not a production merge approval or a claim that every possible bug is eliminated.
