# larper Frontend V2 Redesign

## Goal

Redesign the existing discovery frontend in place on `frontend-v2` as a controlled street-print scroll story while preserving routes, repository boundaries, ranking, preferences, and domain types.

## Tasks

### Task 1: Presentation model and card vocabulary

- Add failing tests for topic-to-card mapping, signal cue derivation, fallbacks, and contextual action anchors.
- Implement presentation-only types and pure mapping helpers.
- Add reusable lead, trend, meme, drop, debate, visual, place, lore, and compact card treatments.
- Verify with unit and component tests.

### Task 2: Homepage narrative and responsive behavior

- Update the comprehension test for the compact product message.
- Recompose the intro and Larping RN first viewport, then Your Larps, recommendations, and Deep Lore.
- Add controlled CSS scroll choreography with static and reduced-motion fallbacks.
- Verify desktop density, mobile rails, actions, and follow persistence.

### Task 3: Detail and niche continuation

- Add failing tests for stable context anchors and navigation.
- Tighten detail and niche heroes and reuse the new card vocabulary for current and related content.
- Preserve reading hierarchy and all route/domain behavior.

### Task 4: Artwork and visual calibration

- Generate niche-specific local editorial images for film photography, football culture, and archive outerwear.
- Register them in the current media catalog without schema changes.
- Review light/dark desktop, tablet, and mobile captures and remove any excess texture or motion.

### Task 5: Final verification and review

- Run lint, type-check, unit/component tests, lightweight Playwright, and production build.
- Run the design pre-flight and ten-minute browsing review.
- Request an independent whole-branch review and fix Critical or Important findings in one TDD pass.

## Constraints

- No parallel app, duplicate route tree, or v2 source directory.
- No domain, repository, ranking, preference, route, or seed-schema changes.
- No new motion or UI library.
- Keep `.agents/` and `skills-lock.json` untouched.
