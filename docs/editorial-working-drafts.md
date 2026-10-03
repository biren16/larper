# Editorial working drafts

Release-one source contract (2026-10-03, before staging deployment).

`stories` contains the retained approved public or scheduled snapshot. `editorial_working_drafts` is a private JSON working copy keyed by candidate. It permits unset classification, slug, and writing fields. Its own revision/editor/timestamps describe private edits. Existing stories are copied to working drafts without changing story content, lifecycle, observation times, publication dates or schedules. New stories create a candidate and working copy immediately, with no story row.

The private table has RLS and no anonymous/account grants. Studio reads and mutations pass through the authenticated editorial runtime, which verifies both the editor/founder role and configured email allowlist before creating its service client. No public reader uses this table.

`topic_clusters.editorial_version` is the optimistic concurrency token. Working saves and versioned lifecycle transitions lock the candidate and reject a stale token with `EDITORIAL_CONFLICT`. Changes to story snapshots (including the legacy app and due-story scheduler) advance the token. Publication and scheduling wrappers check the token while holding candidate/story locks, then delegate the existing origin, source, brief, and rights guards. Working saves never cancel a schedule or approve publication.

The editor submits `editorialVersion` with every save/approval/lifecycle request; missing or invalid versions fail validation. Successful private save/approval results expose `revision`, meaning the current **editorial version**, not a story-revision sequence. Private save retains the existing store result shape; its `storyId` is the candidate identity because an incomplete private story need not have a story row. Consumers must use the candidate route and must not assume this identifies a public story.

Action errors return `ok: false`, `error`, `conflict`, `fieldErrors` and `blockers` when handled by the action factory. A successful approval may also return `destination`. Media uploads return a media ID or an error; client code updates the selection and then saves the working copy without resetting writing. Session recovery is scoped by environment/account/candidate, offered after reload, cleared after a successful save and on the site's explicit sign-out control. The editor retains unsaved input on errors, uploads and conflicts, warns before leaving, and autosaves after one second of inactivity.

Update live post preserves the existing published slug and publication date. Update scheduled version preserves the approved release time. Reschedule and Cancel schedule are explicit operations. Approval still requires a fresh independent-origin confirmation; saves persist the confirmation as false.

## Rollout and rollback

Apply `202610030002_editorial_working_snapshots.sql` before the compatible app. The previous `save_editorial_draft(uuid,uuid,jsonb)` signature remains available for unpublished drafts and mirrors its content into the private working copy. It rejects any approved live or scheduled snapshot, preventing the previous Save button from canceling an approved schedule during rollback. The renamed underlying legacy function is not executable by API roles. Existing starter routes continue through this compatibility wrapper, then the shared working-copy editor; existing reviewing story rows remain retained for rollback compatibility.

Keep the migration applied when rolling the app back. Production and staging evidence is required separately from local PostgreSQL/fixture checks. Posts and Media provide working minimal entry pages; the richer management/library capabilities belong to subsequent releases.
