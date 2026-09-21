# Zero-budget editorial image system: design

**Date:** 2026-09-22  
**Status:** Approved for implementation  
**Decision maker:** Founder-only editorial workflow for beta

## Goal

Give every published LARPer story a subject-specific, credible visual without a paid image provider, a generative-AI bill, generic stock photography, or casual copyright infringement. The public result must preserve LARPer's photographic collage, tactile print, cobalt-accented visual language across feed cards, story heroes, and social previews.

## Product principles

- Exact subject imagery beats generic stock. An album story should show the album, a show story should show the show, and an F1 story should show the relevant driver, car, circuit, or a story-specific data graphic.
- LARPer art direction surrounds a licensed asset; it does not disguise an unlicensed asset.
- Cropping, recolouring, adding overlays, or removing a watermark never turns an unlicensed image into a safe one.
- A story must always have a viable cover treatment, but publication must not depend on finding a photograph. A LARPer-designed fallback is a first-class editorial treatment.
- Rights metadata is part of the asset, not an optional note in article copy.
- The beta must run within existing Next.js and Supabase free-tier capabilities. No paid image API, paid stock library, or production AI dependency is allowed.

## Chosen approach

Use a three-level cover system, in priority order:

1. **Approved subject asset:** founder-owned work, contributor work with permission, an official press asset whose terms permit the intended use, or a public-domain/Creative Commons/Unsplash asset used within its licence.
2. **Provider-presented asset:** an exact poster, album cover, or video thumbnail displayed through an approved provider integration and within that provider's presentation rules. Restricted artwork remains unmodified inside the LARPer composition rather than becoming a cropped background.
3. **LARPer fallback treatment:** a subject-specific graphic made from the article's title, niche, story type, and structured facts. It uses LARPer typography, paper texture, cobalt accents, and a vertical-specific composition without copying third-party artwork.

Generic stock imagery is excluded. A random race car, television, microphone, or person wearing headphones is not an acceptable substitute for the subject of a story.

## Vertical treatments

The fallback and framing system has four initial art directions sharing the same design tokens:

- **Screen:** poster-window proportions, title-card typography, subtitle strips, and ticket/contact-sheet details for shows and films.
- **Music:** a square artwork bay, liner-note typography, catalogue marks, tracklist rhythm, and label-sticker details for albums and artists.
- **Motorsport:** timing-column structure, circuit-line motifs, car-number scale, technical annotation, and race-state colour for F1 and adjacent motorsport.
- **Culture:** the current torn-paper collage language for style, books, internet culture, products, places, and cross-category stories.

When an approved image exists, these treatments act as framing and page composition. They do not force destructive edits to provider-restricted artwork. When no image exists, the same system produces a deliberate graphic rather than an empty or generic placeholder.

## Studio experience

Add a **Cover** section to the candidate writing desk with three choices:

### Licensed upload

The editor uploads an image and supplies:

- Alt text.
- Creator and public credit line.
- Source URL.
- Licence/source type.
- Whether commercial use is allowed.
- Whether modification is allowed.
- Whether social-preview use is allowed.

The UI permits cropping and focal-position adjustment only when modification is allowed. It shows the feed-card, story-hero, and social-card previews before publication.

### Exact external asset

The editor selects a supported provider and supplies the canonical content URL or provider identifier. The system fetches only metadata that the provider permits and displays the asset according to its rules.

Initial provider policy:

- **TMDB:** eligible for non-commercial screen coverage when configured with a valid key and required attribution. Treat it as an optional adapter, not a publishing dependency.
- **Spotify:** keep supplied album artwork unmodified, accompany it with Spotify identification and a link to the applicable content, and do not turn it into an overlaid or cropped background.
- **YouTube:** keep the supplied thumbnail unmodified, identify YouTube as the source, and link the presentation to the video or use the official embed.
- **F1:** do not ingest official F1 photography merely because it is public on the web. Use a specifically permitted press asset, a correctly licensed Commons image, contributor permission, or the motorsport fallback.

Provider assets may have narrower rights than website display. The editor therefore cannot assume that a provider image may be downloaded, cached, modified, or placed inside a generated social image.

### LARPer treatment

This is always available and requires no third-party asset. Studio selects a vertical automatically from the niche, allows the editor to cycle through a small set of composition variants, and previews the final treatment. The treatment must be deterministic so the same story remains visually stable across renders.

## Rights model

Extend `media_assets` so the database can answer why an asset is usable instead of storing only a URL and alt text. The durable fields are:

- `kind`: `uploaded`, `external`, or `larper_treatment`.
- `provider`: `larper`, `owned`, `permission`, `press_kit`, `unsplash`, `wikimedia`, `tmdb`, `spotify`, `youtube`, or `other`.
- `source_url` and optional provider asset identifier.
- `creator` and `credit_line`.
- `license_code` and optional `license_url`.
- `commercial_use_allowed`.
- `modification_allowed`.
- `social_use_allowed`.
- `object_path` for files owned by LARPer's storage bucket.
- Existing dimensions, alt text, and focal position.
- A stable `treatment` and `visual_seed` for LARPer-generated designs.

Uploaded and external assets cannot be approved without a source, credit decision, and explicit values for the three permission flags. `larper_treatment` assets are internally owned and may be used in every placement.

Non-commercial status expands the pool to some NC-licensed material, but NC assets should not be the default because future monetisation would require an audit and replacement. Studio clearly marks such assets and never silently treats “free to view” as “free to reuse.”

## Storage and delivery

- Create a public Supabase Storage bucket named `editorial-media` restricted to JPEG, PNG, and WebP.
- Do not depend on Supabase Image Transformations because they are unavailable on the free plan.
- For assets whose licence permits modification, resize and compress in the browser before upload to a WebP master near 1400×933 and approximately 300 KB or less.
- Preserve an unmodified asset when its terms prohibit modification; present it with `object-fit: contain` inside the vertical treatment rather than cropping it.
- Reject executable uploads and do not accept arbitrary SVG from editors.
- Use the existing `next/image` delivery path where permitted. Remote provider hosts must be allowlisted narrowly rather than accepting arbitrary remote image URLs.
- A failed upload leaves the draft intact and automatically selects a LARPer fallback until the editor retries.

At roughly 300 KB per owned asset, the current 1 GB storage allowance supports approximately 3,000 uploaded covers before operational overhead. LARPer treatments consume no asset storage.

## Public rendering

Replace the current media-only assumption with a story-aware artwork boundary:

- Uploaded assets render as responsive images with stored dimensions, alt text, and focal position.
- Restricted provider assets render unmodified within the appropriate vertical frame and show the required attribution/link near the visual.
- Missing, unavailable, or disallowed assets render the deterministic LARPer treatment using the story title, niche, discovery type, and visual seed.
- Existing seed artwork is treated as LARPer-owned media and keeps its current rendering.

The feed card, niche page, topic page, and homepage collage consume the same artwork boundary so rules cannot diverge between routes.

## Open Graph and social previews

Generate story-specific Open Graph images through Next.js using the same vertical templates.

- An uploaded asset is included only when `social_use_allowed` is true.
- A provider-restricted asset is not copied into the social image unless its terms explicitly permit that placement.
- When social use is unavailable, the OG image uses the LARPer fallback treatment; the public article may still show the provider asset in its compliant linked presentation.
- The social card includes the story title, niche, LARPer identity, and a simplified composition legible at small sizes.

This makes the social preview more designed than the raw hero without confusing visual modification with copyright permission.

## Publication and revision flow

Publishing a story resolves its cover in this order:

1. Approved uploaded asset.
2. Valid provider-presented asset.
3. LARPer fallback treatment.

Publication never produces a blank cover. Invalid or incomplete rights metadata blocks use of that asset, not completion of the article; Studio explains the issue and offers the fallback. The selected media ID and rights metadata are included in story revision snapshots so later changes remain auditable.

Existing published stories require no blocking migration. They continue using their current media when present and receive a stable LARPer fallback when absent. Existing local seed media is backfilled as provider `larper`, commercially usable, modifiable, and social-safe.

## Failure handling

- Upload failure: retain all entered metadata and switch the preview to the fallback without publishing a broken URL.
- Provider timeout or unavailable asset: display the fallback and mark the external media record for review.
- Provider terms do not permit a requested crop or social placement: disable that operation and explain why.
- Deleted storage object: repository mapping returns an unavailable asset and public rendering falls back safely.
- Missing attribution: block asset approval and identify the exact missing field.
- Unsupported host or file type: reject before persisting any media record.

## Security and privacy

- Only authorised Studio users can create, approve, replace, or delete editorial media.
- Server-side validation repeats MIME type, size, provider, host, and rights checks; client checks are convenience only.
- Storage policies permit public reads but founder/editor writes.
- Object paths use generated identifiers rather than user-supplied filenames.
- External URLs are validated against provider-specific HTTPS hosts to avoid server-side request forgery.
- Replacing an asset does not immediately delete the previous object because published revisions may reference it. Cleanup is a separate audited maintenance operation.

## Testing

- Migration tests cover the media schema, constraints, storage policies, and seed backfill.
- Unit tests cover rights validation, provider capabilities, asset precedence, and deterministic fallback selection.
- Editorial service tests prove that a valid media ID reaches publishing and revision snapshots.
- Component tests cover each rendering kind, required attribution, disabled crop controls, broken-asset fallback, and accessible alt text.
- Route tests cover dynamic OG output with and without social-use permission.
- End-to-end coverage publishes one uploaded-image story and one fallback story, then verifies feed, detail, and Studio previews.
- Visual review checks the four vertical treatments at mobile card, desktop hero, and OG dimensions.

## Non-goals

- AI image generation.
- Paid stock, paid CDN transformations, or paid rights-management services.
- Automatic scraping or downloading of arbitrary OG images.
- Treating non-commercial operation as blanket copyright permission.
- Automated legal conclusions about fair dealing.
- A public contributor upload system.
- Automatic deletion of historical media.

## Success criteria

- Every story has a deliberate cover and social preview without a paid dependency.
- Show, album, video, and F1 stories use exact subject imagery only through a compatible licence/provider path; otherwise they use a subject-specific LARPer treatment.
- No product flow recommends generic stock as a substitute for the actual subject.
- An editor can determine the source, creator, licence, modification right, commercial-use right, and social-use right of every non-LARPer asset.
- The same asset rules apply across Studio previews, public routes, and OG generation.
- Missing or failing external media never creates a blank or broken public card.
