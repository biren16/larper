# Launch Stabilization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make one real source-to-publication path reliable enough for a private beta, with honest source health and usable covers.

**Architecture:** Keep founder review as the publication gate. Put ingestion and publication invariants in the database where concurrent writes can be checked atomically. Add a small deterministic visual fallback and a rights-aware path for approved media, then verify the full path against disposable Postgres and browser tests.

**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase Postgres and Edge Functions, Vitest, Playwright.

**Specs:** `docs/superpowers/specs/2026-09-21-founder-led-culture-radar-design.md`, `docs/superpowers/specs/2026-09-22-editorial-image-system-design.md`.

## Global Constraints

- Preserve the backup chat's Git state and workflow.
- Keep founder approval and the two-source rule for publication.
- Use approved public sources and explicit rights metadata for external images.
- Use a disposable database for migration and editorial integration tests.

## Review Focus

- A manual signal must reach a candidate without a foreign-key error.
- A recovered source must stop showing an unresolved failure; a missed poll must not show Live.
- Evidence disappearing during publication must prevent a published story and an orphaned audit event.
- A broken or absent image must still produce a usable cover and social preview.
- Real-data browser paths and CI must exercise the product, not only seed fixtures.

### Task 1: Integrate manual intake and database processing repairs

**Files:** `src/backend/editorial/service.ts`, `src/backend/editorial/service.test.ts`, a new corrective Supabase migration and SQL regression.

- [ ] Write a failing manual-intake test proving no review event references a raw signal as a cluster.
- [ ] Run the test and observe the foreign-key-related failure.
- [ ] Apply the service fix and a new migration that qualifies the `similarity` function and activates manual intake.
- [ ] Run unit and disposable Postgres tests; commit.

### Task 2: Make source health truthful

**Files:** `supabase/functions/ingest/index.ts`, `src/backend/editorial/studio-reader.ts`, `src/app/studio/sources/source-manager.tsx`, focused tests.

- [ ] Write failing tests for recovery, stale poll, and aborted run.
- [ ] Close resolved failures on successful poll and finalize ingestion runs on early failures.
- [ ] Distinguish stale from live in Studio using each source's `poll_minutes`.
- [ ] Run tests; commit.

### Task 3: Make publication and freshness safe

**Files:** new Supabase migration, editorial store/service tests, public discovery tests.

- [ ] Write failing SQL tests for lost evidence and review-event atomicity.
- [ ] Move final evidence validation and review-event insertion into the publication transaction.
- [ ] Define and implement the expiry/review behavior for current published stories.
- [ ] Run SQL and app tests; commit.

### Task 4: Add an image MVP

**Files:** media types and migration, `Artwork`, Studio cover selection, dynamic OG route, focused tests.

- [ ] Write failing cover and permission tests.
- [ ] Implement deterministic branded fallback, approved media metadata and safe rendering.
- [ ] Verify mobile card, story hero, and social preview; commit.

### Task 5: Prove the launch path

**Files:** disposable database integration harness, Playwright tests, `.github/workflows` quality workflow, runbook.

- [ ] Exercise manual and automated input, clustering, publication, public evidence, unpublish, and cache refresh.
- [ ] Repair current Playwright failures and hydration/navigation errors.
- [ ] Run lint, typecheck, unit, SQL, browser, and build checks; commit and update the draft PR.

## Release gate

All tests pass in CI; one staging run completes the full real-data path; the cover fallback works; source failures recover; the separate backup restore test passes before public launch.
