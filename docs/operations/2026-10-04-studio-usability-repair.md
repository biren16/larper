# Studio usability repair — 4 October 2026

## Repairs
- Sticky Studio navigation with an active destination and explicit environment/website link.
- Overview task cards link directly to drafts, scheduling, published review, and actionable source issues.
- Compact queue typography and named niches; retain the public website design.
- Searchable Sources filters, collapsed setup/add-source controls, grouped diagnostic occurrences and readable source rows.
- Posts has Inbox separately from written Drafts, one title per row, readable dates and contextual bulk controls.
- Bulk selections are scoped to the current query; action/selection changes reset confirmation. Individual outcomes remain visible.
- Media uses the shared Studio layout. Manual references explicitly state no automated collection.
- Additive migrations classify Inbox without modifying posts and correct only the legacy IndieWire feed URL. Preserve permissions, activation and history.

## Verification
- 76 unit test files / 362 tests passed; lint, TypeScript and production build passed.
- Disposable database regression passed: management transactions, identity, ageing, public RLS, scheduler and Inbox classification.
- Authenticated deployed staging: source search, honest empty Failures filter, Overview → Needs attention, Posts selection/confirmation reset and Inbox filter verified.
- Read-only review found two Important defects; both corrected and re-reviewed with no remaining Critical/Important findings.
- Baseline staging comparison confirms all original story fields and source settings are preserved except the intended IndieWire URL/updated-at correction.
- IndieWire /feed/rss redirects; /feed/ returns HTTP 200 RSS with 12 items. World Screen /tvdrama/feed/ returns 403. Both production sources were paused; this repair does not activate sources or fabricate permission reviews.

## Remaining launch gates
This repair is not evidence that every product flow is launch-ready. The earlier Studio rollout still requires hosted verification for large cover uploads, rescheduling, revision restoration, partial bulk failure, complete saved/related/cache removal, and stale/scheduled job execution. Production has no approved published stories. Missing usage reviews remain collection blockers; World Screen is externally restricted. Founder approval remains necessary for publication.
