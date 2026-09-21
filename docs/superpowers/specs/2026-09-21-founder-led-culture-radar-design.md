# Founder-led culture radar: design

**Date:** 2026-09-21  
**Status:** Approved for implementation  
**Decision maker:** Founder-only editorial workflow for beta

## Goal

Make LARPer a credible, current Gen Z culture digest without pretending that unsupported social-platform data is live. The system should surface movement across five selected beats, preserve evidence, and help a reader understand both why a topic matters and what they can say about it in a real conversation.

## Product boundaries

- Public visitors can browse published stories and briefs.
- Only the founder can operate Studio during beta.
- No login scraping, browser automation, unsupported APIs, or fabricated trend data.
- A viral post is a lead, never sufficient editorial evidence on its own.
- Nothing auto-publishes in this phase.

## Source model

### Automated watchlists

The five initial beats are F1, books, music, tech/gaming, and internet culture (memes and style). F1, books, music, and tech/gaming each have a small allowlisted watchlist of official YouTube channels, YouTube searches, and approved RSS/Atom feeds. Internet culture begins founder-led; no automated Reddit, TikTok, Instagram, X, or GitHub Trending collection is part of this release. Food/places is deferred until beta evidence shows that it deserves a dedicated beat.

The scheduled ingestion job runs every three hours. It stores immutable raw signals and engagement snapshots, then uses the existing duplicate detection, clustering, and scoring path to create candidates.

Each automated source remains explicitly visible in Studio with one of four states:

- **Active:** collected on schedule.
- **Paused:** saved but excluded from ingestion.
- **Failing:** latest collection failed or has become stale.
- **Manual only:** a hard-to-access platform where links are submitted by the founder.

### Founder pulse inbox

Memes and style begin as founder-submitted public links from Instagram, TikTok, Reddit, X, or any other accessible public page. The intake captures:

- Platform, canonical URL, and source name.
- A concise observation/title supplied by the founder.
- Niche and India/global region.
- When it was observed and, optionally, visible engagement figures.
- A short note explaining why it appears to be moving.

These inputs become `raw_signals` with a source type representing the platform. They are auditable, de-duplicated by canonical URL, and labelled as manually observed rather than programmatically collected.

### Google Trends validation seam

Google Trends is not a source until the project has official API access. A disabled `trend` validation source can be saved in Studio with an explicit “waiting for official API access” state, but it produces no data and displays no made-up search metrics. When access is available, it validates a cluster; it does not create publishable stories by itself.

## Evidence and editorial rules

The existing publishing service remains the decision point. This design strengthens its definition of independent evidence:

- A polished story requires at least two available, independent source definitions.
- Two reposts, summaries, or mirrors of the same original post do not count as independent.
- A manual social lead must be supported by a second unrelated signal (another original creator, automated YouTube/RSS source, credible publication, or validated search movement).
- Factual claims in story copy need a primary or otherwise credible source.
- Sensitive topics remain review-only and cannot be auto-published.
- The founder is the final publishing authority for every item in this beta.

The candidate queue exposes the source links, source/platform, observed time, availability, visible metrics, match rationale, and an evidence state:

- **Needs another source**
- **Ready for review**
- **Blocked: sensitive**

### Editorial stages

The internal queue uses plain-language editorial stages alongside the durable database lifecycle:

- **Watching:** a newly captured lead, including a single-source lead.
- **Rising:** a lead with meaningful movement or additional evidence, but not yet ready to publish.
- **Confirmed:** two independent available source definitions, plus a credible source for factual claims; eligible for founder review and publication.

Heat and confidence may remain internal ordering signals, but they are not editorial verdicts and are not presented as a public claim.

### Published story format

Every published story uses a required four-part structure:

1. **What is happening** — a concise, factual opening.
2. **Why it matters / the drama** — the context a newcomer is missing.
3. **Say this in the group chat** — a concise conversation-ready line that gives the reader social fluency without fabricating a take.
4. **Sources** — evidence links presented as receipts.

## Scoring and presentation

Automated and manual inputs share the existing heat, recency, novelty, India relevance, crossover, and source-diversity concepts. Manual inputs may add topic confidence only when they are corroborated; a large visible metric never overrules the two-source rule.

The public feed continues to show only approved content and evidence summaries. It must never describe seed fixtures, a manually pasted link, or an unavailable source as live proof.

## Studio experience

Studio gains a clear founder-pulse form alongside source management:

- Separate platform selector from source URL.
- Optional visible metrics and founder context.
- Niche selection tied to the stable niche registry.
- Region and observed time with useful defaults.
- Clear acknowledgement that the link is a lead, not publication-ready proof.

The form must be usable on a phone in under a minute. A founder-only Telegram bot is a later convenience option, not a prerequisite for beta; if added, it writes the same raw-signal record through an authenticated webhook and never bypasses evidence rules.

Automated source management is organised by watchlist beat so the founder can add, pause, or diagnose sources without editing environment variables or database rows.

## Non-goals for this release

- External editor accounts or contributor submissions.
- A Telegram bot before the mobile Studio capture flow proves insufficient.
- Automatic publishing.
- Generic Instagram, TikTok, Reddit, or X scraping.
- Claims of real-time Google search interest without approved API access.
- Paid data providers or production AI dependencies.

## Operational success checks

- Every configured automated source is attributable to a beat and an allowlist decision.
- A manually submitted social link reaches the candidate queue with its provenance intact.
- A single viral source cannot pass publishing validation.
- The founder can tell why a source or topic is ready, blocked, stale, or failing.
- Disabled Google Trends validation remains visibly disabled until official credentials/access exist.
