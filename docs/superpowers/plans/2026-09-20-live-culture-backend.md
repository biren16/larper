# LARPer Live Culture Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use test-first development and each task must finish with its named verification command.

**Goal:** Replace production seed-only discovery with a zero-cost, evidence-led live culture backend, editorial studio, and optional synced user accounts.

**Architecture:** Keep the Next.js 16 application as a modular monolith. Supabase provides Postgres, Auth, Storage, RLS, and Cron; pure TypeScript domain modules implement normalization, clustering, scoring, and publishing gates; server components read through `DiscoveryRepository` implementations.

**Tech Stack:** Next.js 16.3, React 19, TypeScript 6, Vitest, Playwright, Supabase Postgres/Auth/Edge Functions, RSS/Atom, YouTube Data API.

## Global Constraints

- No paid production API or hosted AI dependency.
- No login scraping, browser automation, or unsupported platform endpoints.
- Fictional seed signals never appear as live production data.
- Story publication requires founder approval and two independent sources.
- Auto-briefs require two allowlisted sources, heat >= 70, confidence >= 80, and no sensitive flags.
- Public feed personalization contributes no more than 10% and preserves niche diversity.

## Tasks

### Task 1: Live domain contracts and Supabase schema

Extend discovery entities, define database records and migrations, RLS policies, generated-style database types, environment validation, and repository contract tests.

Verification: `npm test -- src/domain src/data`

### Task 2: Ingestion adapters and immutable signal storage

Implement URL canonicalization, RSS/Atom parsing, YouTube response normalization, manual-link normalization, retry/idempotency primitives, and the authenticated scheduled ingestion function contract.

Verification: `npm test -- src/backend/ingestion`

### Task 3: Clustering, scoring, expiry, and feed diversity

Implement deterministic token/entity matching, cluster assignment, snapshot momentum, the approved heat formula, publication confidence, expiry rules, and diverse personalized ordering.

Verification: `npm test -- src/backend/intelligence src/domain/discovery`

### Task 4: Editorial publishing and founder studio

Implement editorial service gates, review/revision events, protected founder authorization, server actions, candidate/source health views, manual intake, and publishing controls.

Verification: `npm test -- src/backend/editorial src/app/studio`

### Task 5: Production repository, caching, and public provenance

Add `PostgresDiscoveryRepository`, runtime repository selection, Next.js tagged caching, graceful verified-edition fallback, and public story/source metadata while keeping seed data development-only.

Verification: `npm test -- src/data src/domain src/app`

### Task 6: Authentication, synced follows, saves, and analytics

Add Supabase SSR auth, Google/email entry points, auth callback, local-preference merge, own-row RLS-backed follow/save mutations, restrained personalization, and privacy-minimal interaction capture.

Verification: `npm test -- src/backend/accounts src/components/preferences src/app/auth`

### Task 7: Operations, scheduling, backup workflow, documentation, and full QA

Add Supabase Cron/Edge configuration, source seeds, weekly encrypted-export workflow template, environment documentation, operational runbook, and full lint/type/test/build verification.

Verification: `npm run lint && npm run typecheck && npm test && npm run build`

## Review Focus

- Repeated scheduled delivery of the same source item remains idempotent.
- Missing or malformed external metrics never inflate heat.
- Sensitive topics cannot auto-publish even at maximum score.
- Anonymous browsing works when Supabase is unconfigured locally, while production never falls back to fictional data.
- Users cannot read or mutate another user's follows, saves, profile, or editorial records.
