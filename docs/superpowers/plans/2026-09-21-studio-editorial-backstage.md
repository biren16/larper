# LARPer Studio Editorial Backstage Implementation Plan

**Goal:** Replace the founder Studio's infrastructure-heavy dashboard with a queue-first editorial workspace, a dedicated source manager, and an evidence-led candidate writing desk without changing the database schema or public discovery UI.

**Architecture:** Keep pages and data reads server-first. Add only the smallest client boundary required for the mobile signal composer. Extend the existing `StudioReader`, server actions, and current editorial contracts; derive source presentation states from existing records.

**Design direction:** LARPer's backstage is a disciplined editorial sheet: compact sans-serif operational copy, Newsreader only where a story title benefits from it, hard rules instead of card chrome, acid for affirmative publishing, cobalt for focus and links, and red only for actionable errors.

---

## Task 1: Extend Studio read models and action redirects

**Files:**
- Modify: `src/backend/editorial/studio-reader.ts`
- Modify: `src/backend/editorial/studio-reader.test.ts`
- Modify: `src/app/studio/studio-dashboard.tsx`
- Modify: `src/app/studio/actions.ts`
- Modify: `src/app/studio/actions.test.ts`

**Steps:**
1. Add failing reader tests for the latest eight signals, niche/source/cluster mapping, and four derived source statuses.
2. Add failing action tests for explicit success notice redirects and Sources-route errors.
3. Implement the dashboard and Sources read models using existing tables only.
4. Implement explicit notice-code redirects while preserving authorization and validation.
5. Run the focused reader and action tests.

## Task 2: Build the queue-first Studio workspace

**Files:**
- Modify: `src/app/studio/page.tsx`
- Modify: `src/app/studio/studio-dashboard.tsx`
- Modify: `src/app/studio/studio-dashboard.test.tsx`
- Modify: `src/app/studio/studio.module.css`
- Create: `src/app/studio/signal-composer.tsx`
- Create: `src/app/studio/status-notice.tsx`

**Steps:**
1. Add failing component tests for queue-first order, recent evidence, actionable empty state, notice copy, and accessible mobile composer controls.
2. Split the dashboard into focused queue, composer, evidence, watchlist, and notice components.
3. Implement the desktop two-column desk and the focus-managed mobile composer.
4. Add responsive, dark-mode, focus, and reduced-motion styles.
5. Run focused Studio component tests.

## Task 3: Add the dedicated Sources workspace

**Files:**
- Create: `src/app/studio/sources/page.tsx`
- Create: `src/app/studio/sources/source-manager.tsx`
- Create: `src/app/studio/sources/source-manager.test.tsx`
- Create: `src/app/studio/sources/sources.module.css`
- Create: `src/app/studio/runtime.ts`
- Modify: `src/app/studio/page.tsx`

**Steps:**
1. Add failing component tests for beat grouping, all four source states, founder-led Internet culture guidance, and activation controls.
2. Extract the shared founder authorization gate.
3. Implement `/studio/sources`, its focused source form, and compact run history.
4. Verify the new page stays founder-only and source mutations return to it with notices.
5. Run focused Sources tests.

## Task 4: Rebuild the candidate writing desk and verify the branch

**Files:**
- Modify: `src/app/studio/candidates/story-editor.tsx`
- Modify: `src/app/studio/candidates/story-editor.test.tsx`
- Modify: `src/app/studio/candidates/story-editor.module.css`
- Modify: `src/app/studio/candidates/[id]/page.tsx`

**Steps:**
1. Add failing tests for Story, Context, Classification, and Evidence field groups, stable publish controls, and separated More actions.
2. Implement the compact candidate header, grouped editor, sticky evidence rail, stable publication bar, and secondary action area.
3. Preserve current actions, gates, revision history, and sensitive-review messaging.
4. Run focused tests, then the full unit suite, lint, type-check, and production build.
5. Review the complete diff for security, accessibility, responsiveness, and unintended files. Record the production deployment commit check as a release step because it requires Vercel access after merge.
