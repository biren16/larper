# Current work

Inspected 2026-10-03 in `/private/tmp/larper-radar-trust-fixes`, branch `codex/radar-trust-fixes`, base revision `67df9eb50496e87e033fe4f3d5ff20c46e30bccd`. This file records the active checkout; other divergent checkouts must be compared before integration.

Release one private working snapshots are the existing base. Release two implements Posts filters/pagination/return context, atomic reversible post management and per-record bulk outcomes, private revision differences/restoration/activity, retained publication identity, Needs review ageing and public/scheduler isolation. Migration: `202610030003_editorial_post_management.sql` (additive; migration002 unchanged). Contracts and rollout requirements are in [editorial working drafts](editorial-working-drafts.md).

Verification: lint/typecheck passed; unit suite 72 files / 332 tests passed; production Next build passed. Disposable PostgreSQL management runner covers the full fresh editorial and working-copy journey plus management/RLS/identity/ageing/scheduler; two-session version conflict/backfill runner passed. Test runners create/drop their own databases. Expected fresh-schema trigger NOTICE and Vitest jsdom performance advisory are non-failing diagnostics.

Pending: independent task review and controller-managed staging migration/application deployment; actual authenticated release-two browser acceptance, public/cache/account removal, ageing/scheduling and recovery proof. New staged browser journey is selected with `STUDIO_RELEASE=2` using `playwright.studio-staging.config.ts`; it has not run. Production is unchanged by this task. Controller's release-one external-upload gate remains pending separately.

Next action: review release-two commit, run the staging gates using isolated retained records, then integrate only reviewed task edits. Preserve unrelated staging-audit edits and historical plan records.

Review fix inspected 2026-10-03 after `6bdd763`: undeployed migration003 now detects all publishable private fields, with field-only SQL assertions for discovery type/mode/regions/freshness/evidence text and equal-content reset. Full-chain disposable database runner and focused management unit tests pass. A focused runtime check confirms the final ingestion function does not attach new matching signals to, rescore or expire Trash. Migration002 unchanged; reviewer recheck and controller staging gates remain next.
