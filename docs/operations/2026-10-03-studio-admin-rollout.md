# Studio administration rollout — 3 October 2026

## Implementation

Code commit `dfa6d44` on `codex/radar-trust-fixes` implements the three requested releases. Task reviews and the final integrated review corrections passed scoped independent review. Existing unrelated working changes were preserved.

- Private incomplete working drafts, autosave, recovery and version conflicts; explicit approved live/scheduled updates.
- Searchable Posts, reversible Trash/Restore/Duplicate, history/activity, individual bulk results and Needs review ageing.
- Named editorial controls, current public-layout preview, searchable media, decoded permission-aware image conversion and source operational feedback.

Final local gates: lint, type checks, 75 files / 357 unit tests, production build, fresh PostgreSQL management/concurrency and retention checks. Six earlier desktop/mobile typography fixtures passed. The non-failing jsdom performance and browser runner colour-environment advisories remain recorded. These checks do not guarantee absence of every possible bug.

## Actual hosted state

**Production:** application `7d7efb2` remains unchanged. No production migration or app release for this plan. Original posts and sources matched the read-only baseline.

**Staging:** application `67df9eb`; migrations `202610030002` and `202610030005` applied. Migrations003/004 and release-two/three apps remain withheld.005 is compatible with schema through002 alone and must precede release-one collector execution; later003/004 must retain005 and use include-all for their earlier migration versions.

Actual release-one checks passed new incomplete save/reload, conflict retention, refresh recovery, private live/scheduled edits, explicit scheduled update/cancel, live date/slug preservation and public detail update. Actual uploaded-cover, Reschedule and full browser navigation acceptance remain incomplete. Local mobile/navigation checks passed but are not deployed-browser proof.

The deployed005 collector retained a new isolated working-only draft, preserving its writing and first observation with no public snapshot. Original staging posts and sources remained identical after the migration and processing run. This is database deployment evidence, not complete UI or scheduled-cycle evidence.

## Remaining rollout gates

Chrome file access approval is pending, and browser controls stalled during the navigation check. Restore browser control and complete the actual staged upload, reschedule and navigation checks first. Do not weaken Vercel protection, export Chrome cookies or treat fixtures as deployed evidence.

Then verify release one fully and apply additive production migrations before its compatible app. Deploy and verify release two in staging before its production rollout, then release three with004. Exercise each required authenticated, public-removal/cache, ageing, scheduler, media and source flow using isolated records. Keep the compatible `7d7efb2` application reference for rollback; do not reset production or restore historical SQL blindly.

The three verified production releases are **not complete**. Local code is implemented and reviewed; hosted acceptance and rollout remain open.
