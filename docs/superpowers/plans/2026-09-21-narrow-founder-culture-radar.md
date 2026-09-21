# Narrow Founder Culture Radar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Turn the existing LARPer backend and Studio into a focused founder-operated culture-digest workflow for five beats.

**Architecture:** Preserve the existing raw_signals → topic_clusters → cluster_signals → stories pipeline. Add only metadata and founder controls required for the five-beat beta: automated RSS/YouTube sources for F1, books, music, and tech/gaming; manual founder pulse for memes/style; internal editorial stages; and a required conversation-ready line in published stories.

**Tech Stack:** Next.js 16, TypeScript, Vitest, Supabase Postgres, Supabase Edge Functions, CSS Modules.

**Spec:** docs/superpowers/specs/2026-09-21-founder-led-culture-radar-design.md

## Global Constraints

- No platform scraping, browser automation, or unapproved Reddit/API access.
- No auto-publishing, paid data provider, or production AI dependency.
- Public feed reads only published, verified stories.
- One manual source cannot satisfy the two-independent-source publishing gate.
- Google Trends stays disabled until official access exists.
- The only initial source adapters are RSS, YouTube, and founder manual intake.

## Review Focus

- Reject an unsafe URL before it is stored.
- Reject a platform selection that conflicts with the pasted URL.
- Do not count two manual links as independent publication evidence.
- Do not fetch or fail a disabled trend source.
- Do not allow a story publish without a non-empty conversation-ready line.

### Task 1: Add narrow culture-radar data fields

**Files:**
- Create: supabase/migrations/202609210004_narrow_culture_radar.sql
- Modify: src/data/postgres/database.types.ts
- Test: src/data/postgres/schema.test.ts

**Interfaces:**
- source_definitions.watchlist_beat is f1 | books | music | tech-gaming | internet-culture | null.
- source_definitions adapter_type permits trend but scheduled ingestion excludes it.
- raw_signals.suggested_niche_id is nullable.
- topic_clusters.editorial_stage is watching | rising | confirmed.
- stories.conversation_line is non-null with an empty default for migration compatibility.

- [ ] **Step 1: Write the failing database-type test**

~~~ts
expect(DatabaseTables.raw_signals).toContain("suggested_niche_id");
expect(DatabaseTables.topic_clusters).toContain("editorial_stage");
expect(DatabaseTables.stories).toContain("conversation_line");
~~~

- [ ] **Step 2: Run it and confirm RED**

Run: npm test -- src/data/postgres/schema.test.ts

Expected: FAIL because the fields do not exist.

- [ ] **Step 3: Implement the additive migration and update generated types**

Add columns and checks. Update process_unclustered_signals so a new signal creates a cluster in watching, prefers suggested_niche_id when present, and keeps existing clustering and lifecycle behavior.

- [ ] **Step 4: Run GREEN**

Run: npm test -- src/data/postgres/schema.test.ts && npm run typecheck

Expected: PASS.

- [ ] **Step 5: Commit**

~~~bash
git add supabase/migrations/202609210004_narrow_culture_radar.sql src/data/postgres/database.types.ts src/data/postgres/schema.test.ts
git commit -m "Add narrow culture radar data fields"
~~~

### Task 2: Build safe, quick founder pulse intake

**Files:**
- Modify: src/backend/ingestion/manual.ts
- Modify: src/backend/ingestion/types.ts
- Modify: src/backend/editorial/actions.ts
- Modify: src/backend/editorial/postgres-store.ts
- Modify: src/app/studio/actions.ts
- Test: src/backend/ingestion/manual.test.ts
- Test: src/backend/editorial/actions.test.ts
- Test: src/app/studio/actions.test.ts

**Interfaces:**
- ManualSignalInput accepts platform, suggestedNicheId, observationNote, and visibleMetrics.
- Valid platforms are instagram, tiktok, reddit, x, youtube, and web.
- addManualSignalAction calls process_unclustered_signals after a successful raw-signal write.

- [ ] **Step 1: Write failing behavior tests**

~~~ts
expect(normalizeManualSignal({
  platform: "instagram", url: "https://www.instagram.com/reel/a/",
  title: "F1 edit format", sourceName: "Founder", suggestedNicheId: "f1",
  visibleMetrics: { likes: "1200" }, observationNote: "Crossing Indian fan pages",
  publishedAt: "2026-09-21T09:00:00Z", region: "india",
}, "manual", "2026-09-21T10:00:00Z")).toMatchObject({
  sourceType: "instagram", metrics: { likes: 1200 }, suggestedNicheId: "f1",
});

expect(() => normalizeManualSignal({
  platform: "tiktok", url: "https://www.instagram.com/reel/a/", title: "Wrong platform",
  sourceName: "Founder", publishedAt: "2026-09-21T09:00:00Z", region: "india",
}, "manual", "2026-09-21T10:00:00Z")).toThrow("does not match");
~~~

- [ ] **Step 2: Run them and confirm RED**

Run: npm test -- src/backend/ingestion/manual.test.ts src/backend/editorial/actions.test.ts src/app/studio/actions.test.ts

Expected: FAIL because platform, metrics, note, niche, and queue refresh do not exist.

- [ ] **Step 3: Implement the smallest safe path**

Verify named platform hosts, retain only non-negative finite visible metrics, store observationNote as body, store suggestedNicheId, and immediately call the existing clustering RPC after a successful write. Keep independence keyed by sourceDefinitionId.

- [ ] **Step 4: Run GREEN plus full unit suite**

Run: npm test -- src/backend/ingestion/manual.test.ts src/backend/editorial/actions.test.ts src/app/studio/actions.test.ts && npm test

Expected: PASS.

- [ ] **Step 5: Commit**

~~~bash
git add src/backend/ingestion/manual.ts src/backend/ingestion/types.ts src/backend/editorial/actions.ts src/backend/editorial/postgres-store.ts src/app/studio/actions.ts src/backend/ingestion/manual.test.ts src/backend/editorial/actions.test.ts src/app/studio/actions.test.ts
git commit -m "Add founder culture pulse intake"
~~~

### Task 3: Add editorial stages and the conversation-ready story field

**Files:**
- Modify: src/backend/editorial/types.ts
- Modify: src/backend/editorial/service.ts
- Modify: src/backend/editorial/actions.ts
- Modify: src/backend/editorial/postgres-store.ts
- Modify: src/app/studio/candidates/story-editor.tsx
- Test: src/backend/editorial/service.test.ts
- Test: src/app/studio/candidates/story-editor.test.tsx

**Interfaces:**
- StoryDraft has conversationLine: string.
- publishStory rejects an empty conversationLine.
- Studio shows watching, rising, and confirmed as human-readable editorial stages; publish is only possible from confirmed with existing evidence gates.

- [ ] **Step 1: Write failing tests**

~~~ts
await expect(service.publishStory(actor, "cluster-1", {
  ...draft, conversationLine: "",
})).rejects.toThrow("conversationLine is required");
~~~

~~~tsx
expect(screen.getByLabelText("Say this in the group chat")).toBeInTheDocument();
~~~

- [ ] **Step 2: Run and confirm RED**

Run: npm test -- src/backend/editorial/service.test.ts src/app/studio/candidates/story-editor.test.tsx

Expected: FAIL because the story draft and editor have no conversation line.

- [ ] **Step 3: Implement the required story field**

Add conversationLine to all story draft creation, validation, persistence RPC payload, and candidate editor. Add founder-only stage actions that update editorial_stage without altering lifecycle. Keep heat/confidence internal to ordering, not public copy.

- [ ] **Step 4: Run GREEN**

Run: npm test -- src/backend/editorial/service.test.ts src/app/studio/candidates/story-editor.test.tsx && npm test && npm run typecheck

Expected: PASS.

- [ ] **Step 5: Commit**

~~~bash
git add src/backend/editorial/types.ts src/backend/editorial/service.ts src/backend/editorial/actions.ts src/backend/editorial/postgres-store.ts src/app/studio/candidates/story-editor.tsx src/backend/editorial/service.test.ts src/app/studio/candidates/story-editor.test.tsx
git commit -m "Add editorial stages and conversation line"
~~~

### Task 4: Focus Studio sources and verify no-risk ingestion

**Files:**
- Modify: src/backend/editorial/studio-reader.ts
- Modify: src/app/studio/studio-dashboard.tsx
- Modify: src/app/studio/studio.module.css
- Modify: src/app/studio/actions.ts
- Modify: supabase/functions/ingest/index.ts
- Modify: supabase/seed.sql
- Test: src/app/studio/studio-dashboard.test.tsx
- Create: supabase/functions/ingest/index.test.ts
- Modify: docs/operations/live-culture-runbook.md

**Interfaces:**
- Studio groups RSS/YouTube sources under F1, Books, Music, and Tech + gaming.
- Meme/style founder intake is labelled Internet culture.
- Disabled trend sources display Waiting for official API access and are skipped by scheduling.
- No Reddit, Telegram, Product Hunt, Spotify, Genius, or GitHub Trending adapter is added in this release.

- [ ] **Step 1: Write failing UI and scheduling tests**

~~~ts
expect(eligibleScheduledSources([
  source({ adapter_type: "youtube", active: true }),
  source({ adapter_type: "trend", active: true }),
], now)).toHaveLength(1);
~~~

~~~tsx
expect(screen.getByText("Internet culture")).toBeInTheDocument();
expect(screen.getByText("Waiting for official API access")).toBeInTheDocument();
~~~

- [ ] **Step 2: Run and confirm RED**

Run: npm test -- supabase/functions/ingest/index.test.ts src/app/studio/studio-dashboard.test.tsx

Expected: FAIL because source grouping and safe trend skipping do not exist.

- [ ] **Step 3: Implement the narrow source layer**

Extract pure scheduled-source selection from the Edge Function: only active due RSS and YouTube sources are fetched. Add beat validation to source creation and Studio grouping. Seed only paused templates for the four automated beats and one disabled Google Trends validation row. Update the runbook with founder capture, review, source approval, and “no Telegram until phone capture proves insufficient.”

- [ ] **Step 4: Release verification**

Run: npm test && npm run lint && npm run typecheck && npm run build

Expected: PASS, with no secret, .env file, or private URL in git diff.

- [ ] **Step 5: Commit**

~~~bash
git add src/backend/editorial/studio-reader.ts src/app/studio/studio-dashboard.tsx src/app/studio/studio.module.css src/app/studio/actions.ts supabase/functions/ingest/index.ts supabase/functions/ingest/index.test.ts supabase/seed.sql src/app/studio/studio-dashboard.test.tsx docs/operations/live-culture-runbook.md
git commit -m "Focus founder culture radar watchlists"
~~~

