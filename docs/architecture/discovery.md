# Discovery subsystem

## Purpose

Part 1 proves LARPer's core loop: see what niche communities are focused on, understand why it matters, learn the context, and move into adjacent rabbit holes.

The interface is deliberately source-agnostic. Seed fixtures behave like one repository adapter; a future ingestion-backed adapter can replace them without changing page components.

## Domain entities

- `Niche` describes an active area of interest, its discovery hook, media, and adjacent niches.
- `DiscoveryTopic` contains editorial explanation, classification, timestamps, ranking inputs, media, tags, and related-topic IDs.
- `SourceSignal` represents one piece of evidence from Reddit, YouTube, RSS, publications, blogs, or trend data.
- `MediaAsset` centralizes local media paths, dimensions, alt text, and focal position.

Relations remain normalized. Topics store `nicheId`, sources store `topicId`, and related content uses IDs. UI components never import seed arrays or perform entity joins.

## Repository and view models

`DiscoveryRepository` is the read boundary. `SeedDiscoveryRepository` implements it with local TypeScript fixtures and exposes only normalized entities.

The service layer builds three view models:

- `DiscoveryHomeViewModel` for ranked current topics, followed niches, recommendations, and Deep Lore.
- `TopicDetailViewModel` for one topic, its niche, media, sources, and related topics.
- `NichePageViewModel` for niche identity, ranked current topics, evergreen lore, and adjacent niches.

Server components request view models. The only broad client boundary is the Discovery home, where local follow preferences can reapply the small affinity boost without refetching data.

## Ranking

Current topics use this deterministic score:

```text
30% freshness
30% momentum
20% evidence
15% novelty
 5% followed-niche affinity
```

Freshness, momentum, and novelty are normalized values from 0 to 100. Evidence is `source count * 15 + unique source types * 10`, capped at 100. Followed affinity is 100 for a followed niche and 0 otherwise.

Equal scores resolve by newest `lastUpdatedAt`, then stable topic ID. Draft and Deep Lore topics never enter the current feed.

Deep Lore uses `60% novelty + 40% evidence`. It is intentionally independent from freshness so evergreen context is not presented as breaking news.

## Seed content and media

The dataset is explicitly marked `origin: "seed"`. It currently contains nine niches, twenty-five topics, fifty-eight source signals, and six local artworks. Counts are targets, not product constraints.

Fictional source records have no URL, so the interface cannot present them as links to real reporting. The seed validator checks identifiers, dates, score ranges, relationships, media references, alt text, and seed-link rules.

Local artwork is registered through `MediaAsset`; route components never import individual image files. A future media adapter can map source media into the same contract.

## Preferences

Anonymous follow state is stored under `larper:preferences:v1`:

```json
{ "version": 1, "followedNicheIds": ["fragrance", "sneakers"] }
```

Malformed, missing, unsupported, duplicate, or unknown values are handled defensively. This state is intentionally device-local until authentication exists.

## Future ingestion seam

A future pipeline should normalize source-specific records before they reach `DiscoveryRepository`:

```text
source adapter -> source records -> topic clustering/editorial layer -> normalized repository -> view-model services -> UI
```

Reddit, YouTube, RSS, trend, or publication adapters may have different raw fields, but none should leak into components. A database-backed repository can replace `SeedDiscoveryRepository` while preserving the service and UI contracts.

## Intentionally excluded

Part 1 does not include live ingestion, scraping, AI chat, recommendations ML, authentication, cross-device preferences, community posts, profiles, comments, messaging, moderation, notifications, payments, or analytics.

