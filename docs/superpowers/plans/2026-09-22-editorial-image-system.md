# Zero-Budget Editorial Image System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every published LARPer story a rights-aware, subject-specific cover and social preview without paid image services, generic stock, or changes to the existing public layout.

**Architecture:** Extend the current `media_assets` record into a rights-aware discriminated media contract, then resolve each story to an approved upload, a policy-compliant external provider asset, or a deterministic LARPer treatment. Keep the existing `Artwork` frame as the public compatibility boundary, add a compact Studio cover desk, persist the selected media ID through the existing publication transaction, and generate social images from a pure presentation model shared with a Next.js `opengraph-image` route.

**Tech Stack:** Next.js 16.3 App Router, React 19 Server Actions, TypeScript 6, CSS Modules, Supabase Postgres/Storage/RLS, Vitest, Testing Library, Playwright, `next/image`, `next/og`.

**Spec:** `docs/superpowers/specs/2026-09-22-editorial-image-system-design.md`

## Global Constraints

- No paid image API, paid stock library, paid CDN transformation, or production AI dependency.
- Do not ingest arbitrary Open Graph images or treat cropping as copyright clearance.
- Generic stock imagery is not an acceptable substitute for the actual subject.
- Existing public card dimensions, grids, typography, motion, and local seed-art rendering are regression contracts.
- Restricted provider art must render unmodified: no crop, filter, overlay, blur, or social-image reuse unless its stored permissions expressly allow it.
- Supabase Image Transformations are unavailable; accepted uploads must already be WebP, no more than 400,000 bytes, and no larger than 1400×1400.
- Remote image hosts are provider-specific HTTPS allowlists; arbitrary remote URLs are rejected.
- Every non-LARPer asset stores source, credit, licence decision, commercial-use permission, modification permission, and social-use permission.
- Missing, deleted, invalid, or disallowed media must fall back to a deterministic LARPer treatment rather than a broken or empty card.
- Read the relevant local Next.js 16 guides in `node_modules/next/dist/docs/` before modifying image configuration, Server Actions, or Open Graph routes.

## Review Focus

- Portrait posters and square album covers must remain uncropped and unfiltered while the existing landscape card geometry remains unchanged; Task 6 pins this with rendering and CSS-contract tests.
- A forged MIME type, oversized payload, unsupported provider host, or path traversal attempt must be rejected before storage or database insertion; Tasks 2 and 3 pin these inputs.
- An asset that permits page display but forbids modification or social use must disable Studio crop controls and be excluded from OG composition; Tasks 4 and 7 pin both behaviors.
- A missing storage object or failed external image must render the same deterministic treatment on repeat requests and must not emit a broken `<img>`; Tasks 6 and 7 pin this fallback.
- Publish, brief, and schedule flows must persist the chosen media ID in both `stories.media_id` and the immutable revision snapshot without weakening evidence gates; Task 5 pins all three paths.

---

## File Structure

### New focused units

- `src/domain/media/types.ts` — media kinds, providers, permission flags, vertical treatments, and input contracts.
- `src/domain/media/policy.ts` — pure validation, provider host rules, vertical selection, and placement decisions.
- `src/domain/media/policy.test.ts` — policy and adversarial-input coverage.
- `src/backend/media/service.ts` — authorised creation of uploads, external records, and deterministic LARPer treatments.
- `src/backend/media/service.test.ts` — storage rollback, validation, and authorisation coverage.
- `src/backend/media/postgres-store.ts` — Supabase Storage and `media_assets` persistence adapter.
- `src/backend/media/external.ts` — provider-specific metadata resolution without downloading provider files.
- `src/backend/media/external.test.ts` — Spotify, YouTube, TMDB, host, and failure coverage.
- `src/app/studio/candidates/cover-editor.tsx` — compact client-side cover selection and preview controller.
- `src/app/studio/candidates/cover-editor.module.css` — Studio-only cover desk styling.
- `src/app/studio/candidates/cover-editor.test.tsx` — cover modes, permission controls, and failure UI.
- `src/app/studio/candidates/image-preflight.ts` — browser WebP conversion and dimension/size enforcement.
- `src/app/studio/candidates/image-preflight.test.ts` — pure target-dimension and validation tests.
- `src/components/discovery/larper-cover.tsx` — deterministic screen, music, motorsport, and culture treatments.
- `src/components/discovery/larper-cover.module.css` — treatment visuals contained inside the existing artwork frame.
- `src/components/discovery/larper-cover.test.tsx` — deterministic and accessible treatment coverage.
- `src/components/discovery/resilient-image.tsx` — minimal client boundary that replaces a failed image with the prepared treatment.
- `src/components/discovery/resilient-image.test.tsx` — broken-source fallback coverage.
- `src/domain/media/social.ts` — pure OG presentation model and social permission gate.
- `src/domain/media/social.test.ts` — social image selection coverage.
- `src/app/discover/[slug]/opengraph-image.tsx` — 1200×630 `ImageResponse` route.
- `supabase/migrations/202609220003_editorial_media.sql` — rights columns, storage bucket/policies, backfill, and publication RPC updates.

### Existing integration points

- `src/domain/discovery/types.ts` — expose the richer media contract to discovery view models.
- `src/data/postgres/database.types.ts` — describe the migrated media row.
- `src/data/postgres/supabase-reader.ts` and test — map legacy and new media safely.
- `src/backend/editorial/types.ts`, `actions.ts`, `service.ts`, and tests — carry `mediaId` through publication.
- `src/backend/editorial/runtime.ts` — expose the media service beside the editorial service.
- `src/app/studio/actions.ts` and tests — create/select media before publish or schedule.
- `src/app/studio/candidates/story-editor.tsx` and CSS — insert the compact Cover fieldset without changing the two-column workspace.
- `src/components/discovery/artwork.tsx`, CSS, and tests — preserve the outer layout while selecting crop-safe rendering.
- Discovery card, homepage, niche, and topic components — pass story context to the artwork boundary.
- `next.config.ts` — narrowly allow Supabase, Spotify, YouTube, and TMDB image hosts.
- `.env.example` and `src/backend/config/env.ts` — optional TMDB read token only; Spotify and YouTube resolution remain credential-free where official metadata endpoints permit it.
- `docs/operations/live-culture-runbook.md` — document sourcing, rights fields, and fallback operations.

---

### Task 1: Add the rights-aware media contract and database migration

**Files:**
- Create: `src/domain/media/types.ts`
- Create: `supabase/migrations/202609220003_editorial_media.sql`
- Modify: `src/domain/discovery/types.ts`
- Modify: `src/data/postgres/database.types.ts`
- Modify: `src/data/postgres/schema.test.ts`
- Modify: `src/data/postgres/supabase-reader.ts`
- Modify: `src/data/postgres/supabase-reader.test.ts`

**Interfaces:**
- Produces: `MediaKind`, `MediaProvider`, `CoverTreatment`, `MediaPermissions`, and the extended `MediaAsset` used by every later task.
- Produces database columns consumed by `PostgresMediaStore` and publication RPCs.

- [ ] **Step 1: Write failing schema and row-mapping tests**

Add assertions that the new migration creates the `editorial-media` bucket, write policies, rights columns, safe defaults, and seed backfill. Add a mapper test for both a full external row and a legacy-style LARPer row.

```ts
const editorialMediaMigration = readFileSync(
  "supabase/migrations/202609220003_editorial_media.sql",
  "utf8",
);

it("adds auditable media rights and a founder-writable public bucket", () => {
  expect(editorialMediaMigration).toMatch(/insert into storage\.buckets.*editorial-media/is);
  expect(editorialMediaMigration).toMatch(/commercial_use_allowed boolean not null/i);
  expect(editorialMediaMigration).toMatch(/modification_allowed boolean not null/i);
  expect(editorialMediaMigration).toMatch(/social_use_allowed boolean not null/i);
  expect(editorialMediaMigration).toMatch(/editorial media is publicly readable/i);
  expect(editorialMediaMigration).toMatch(/editorial media is editor writable/i);
  expect(editorialMediaMigration).toMatch(/provider = 'larper'/i);
});

it("maps a restricted external asset without losing its permissions", () => {
  const externalMediaRow = {
    id: "spotify-album-1", kind: "external", provider: "spotify",
    src: "https://i.scdn.co/image/abc", alt: "Album cover", width: 640, height: 640,
    focal_position: null, source_url: "https://open.spotify.com/album/abc",
    provider_asset_id: "abc", creator: null, credit_line: "Spotify",
    license_code: "spotify-platform", license_url: null,
    commercial_use_allowed: false, modification_allowed: false, social_use_allowed: false,
    object_path: null, treatment: null, visual_seed: null,
  };
  expect(mapMediaRow(externalMediaRow)).toMatchObject({
    kind: "external",
    provider: "spotify",
    permissions: {
      commercialUse: false,
      modification: false,
      socialUse: false,
    },
  });
});
```

- [ ] **Step 2: Run the focused tests and verify they fail**

Run: `npm test -- src/data/postgres/schema.test.ts src/data/postgres/supabase-reader.test.ts`

Expected: FAIL because the migration and extended media fields do not exist.

- [ ] **Step 3: Define the contract and migration**

Create the media types and re-export the canonical `MediaAsset` from discovery types.

```ts
export type MediaKind = "uploaded" | "external" | "larper_treatment";
export type MediaProvider =
  | "larper"
  | "owned"
  | "permission"
  | "press_kit"
  | "unsplash"
  | "wikimedia"
  | "tmdb"
  | "spotify"
  | "youtube"
  | "other";
export type CoverTreatment = "screen" | "music" | "motorsport" | "culture";

export interface MediaPermissions {
  commercialUse: boolean;
  modification: boolean;
  socialUse: boolean;
}

export interface MediaAsset {
  id: string;
  kind: MediaKind;
  provider: MediaProvider;
  src?: string;
  alt: string;
  width: number;
  height: number;
  focalPosition?: string;
  sourceUrl?: string;
  providerAssetId?: string;
  creator?: string;
  creditLine?: string;
  licenseCode?: string;
  licenseUrl?: string;
  permissions: MediaPermissions;
  objectPath?: string;
  treatment?: CoverTreatment;
  visualSeed?: string;
}

export interface MediaPlacementDecision {
  render: "cover" | "contain-unmodified";
  applyFilter: boolean;
  includeInSocialImage: boolean;
}

export type MediaValidationResult =
  | { ok: true }
  | { ok: false; errors: string[] };
```

The migration must add constrained columns, allow `src` to be null only for `larper_treatment`, backfill existing records as LARPer-owned, create the bucket with a 400,000-byte limit and `image/webp` MIME restriction, and grant writes only when `profiles.role in ('editor', 'founder')` for `auth.uid()`.

```sql
alter table public.media_assets
  alter column src drop not null,
  add column if not exists kind text not null default 'uploaded'
    check (kind in ('uploaded', 'external', 'larper_treatment')),
  add column if not exists provider text not null default 'larper',
  add column if not exists source_url text,
  add column if not exists provider_asset_id text,
  add column if not exists creator text,
  add column if not exists credit_line text,
  add column if not exists license_code text,
  add column if not exists license_url text,
  add column if not exists commercial_use_allowed boolean not null default true,
  add column if not exists modification_allowed boolean not null default true,
  add column if not exists social_use_allowed boolean not null default true,
  add column if not exists object_path text,
  add column if not exists treatment text check (treatment in ('screen', 'music', 'motorsport', 'culture')),
  add column if not exists visual_seed text;

update public.media_assets
set provider = 'larper', source_url = coalesce(source_url, src),
    commercial_use_allowed = true,
    modification_allowed = true, social_use_allowed = true
where provider = 'larper';

alter table public.media_assets
  add constraint media_asset_source_shape check (
    (kind = 'larper_treatment' and treatment is not null and visual_seed is not null)
    or (kind <> 'larper_treatment' and src is not null and source_url is not null)
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('editorial-media', 'editorial-media', true, 400000, array['image/webp'])
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
```

Update `mapMediaRow` to supply explicit legacy-safe values and keep the existing `src`, dimensions, alt, and focal position intact.

- [ ] **Step 4: Run mapper, schema, type, and seed tests**

Run: `npm test -- src/data/postgres/schema.test.ts src/data/postgres/supabase-reader.test.ts src/data/seed/validate.test.ts`

Expected: PASS.

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 5: Commit the contract and migration**

```bash
git add src/domain/media/types.ts src/domain/discovery/types.ts src/data/postgres/database.types.ts src/data/postgres/schema.test.ts src/data/postgres/supabase-reader.ts src/data/postgres/supabase-reader.test.ts supabase/migrations/202609220003_editorial_media.sql
git commit -m "feat: add rights-aware editorial media contract"
```

---

### Task 2: Implement pure media policy and deterministic treatment selection

**Files:**
- Create: `src/domain/media/policy.ts`
- Create: `src/domain/media/policy.test.ts`

**Interfaces:**
- Consumes: media types from Task 1.
- Produces: `validateMediaDraft(draft): MediaValidationResult`, `providerForExternalUrl(provider, url): URL`, `chooseCoverTreatment(nicheId, discoveryType): CoverTreatment`, `visualSeedFor(candidateId): string`, and `placementFor(asset, placement): MediaPlacementDecision`.

- [ ] **Step 1: Write failing policy tests**

Cover complete rights metadata, non-HTTPS URLs, mismatched provider hosts, modification/social restrictions, provider-specific host allowlists, vertical selection, and stable seeds.

```ts
it.each([
  ["spotify", "https://i.scdn.co/image/abc"],
  ["youtube", "https://i.ytimg.com/vi/abc/hqdefault.jpg"],
  ["tmdb", "https://image.tmdb.org/t/p/original/abc.jpg"],
])("accepts the %s image host", (provider, src) => {
  expect(() => providerForExternalUrl(provider as MediaProvider, src)).not.toThrow();
});

it("rejects a provider label pasted onto an arbitrary host", () => {
  expect(() => providerForExternalUrl("spotify", "https://evil.example/cover.jpg"))
    .toThrow("Spotify images must use i.scdn.co");
});

it("keeps display-only provider media out of modified and social placements", () => {
  const restrictedSpotifyAsset: MediaAsset = {
    id: "spotify-album-1", kind: "external", provider: "spotify",
    src: "https://i.scdn.co/image/abc", alt: "Album cover", width: 640, height: 640,
    sourceUrl: "https://open.spotify.com/album/abc", creditLine: "Spotify",
    licenseCode: "spotify-platform", permissions: {
      commercialUse: false, modification: false, socialUse: false,
    },
  };
  expect(placementFor(restrictedSpotifyAsset, "card")).toEqual({
    render: "contain-unmodified",
    applyFilter: false,
    includeInSocialImage: false,
  });
});

it("selects stable verticals and seeds", () => {
  expect(chooseCoverTreatment("f1", "EVENT")).toBe("motorsport");
  expect(chooseCoverTreatment("music", "DROP")).toBe("music");
  expect(visualSeedFor("candidate-42")).toBe(visualSeedFor("candidate-42"));
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `npm test -- src/domain/media/policy.test.ts`

Expected: FAIL because the policy functions do not exist.

- [ ] **Step 3: Implement the pure policy**

Use exact allowlists and return structured errors for Studio rather than scattering provider checks through UI components.

```ts
const PROVIDER_HOSTS: Partial<Record<MediaProvider, ReadonlySet<string>>> = {
  spotify: new Set(["i.scdn.co"]),
  youtube: new Set(["i.ytimg.com"]),
  tmdb: new Set(["image.tmdb.org"]),
};

export function providerForExternalUrl(provider: MediaProvider, value: string): URL {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("External images must use HTTPS");
  const hosts = PROVIDER_HOSTS[provider];
  if (!hosts?.has(url.hostname)) {
    const label = provider === "tmdb" ? "TMDB" : provider[0].toUpperCase() + provider.slice(1);
    throw new Error(`${label} images must use ${[...(hosts ?? [])].join(", ")}`);
  }
  return url;
}

export function placementFor(asset: MediaAsset, placement: "card" | "hero" | "social"): MediaPlacementDecision {
  const restricted = asset.kind === "external" && !asset.permissions.modification;
  return {
    render: restricted ? "contain-unmodified" : "cover",
    applyFilter: !restricted,
    includeInSocialImage: placement === "social" && asset.permissions.socialUse,
  };
}
```

The validator must require source URL, credit decision, licence code, and all permission booleans for non-LARPer media. `chooseCoverTreatment` maps F1/motorsport niches to `motorsport`, music niches to `music`, film/TV niches to `screen`, and everything else to `culture`.

- [ ] **Step 4: Run the policy tests**

Run: `npm test -- src/domain/media/policy.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the policy**

```bash
git add src/domain/media/policy.ts src/domain/media/policy.test.ts
git commit -m "feat: enforce editorial media usage policy"
```

---

### Task 3: Add authorised media creation, storage rollback, and provider resolution

**Files:**
- Create: `src/backend/media/service.ts`
- Create: `src/backend/media/service.test.ts`
- Create: `src/backend/media/postgres-store.ts`
- Create: `src/backend/media/external.ts`
- Create: `src/backend/media/external.test.ts`
- Modify: `src/backend/editorial/runtime.ts`
- Modify: `src/backend/config/env.ts`
- Modify: `src/backend/config/env.test.ts`
- Modify: `.env.example`

**Interfaces:**
- Consumes: `validateMediaDraft`, provider policy, editorial authorisation, server Supabase client, and media table from Tasks 1–2.
- Produces: `MediaService.createUpload(actor, input)`, `MediaService.createExternal(actor, input)`, `MediaService.ensureTreatment(actor, input)`, and `resolveExternalMedia(request, dependencies)`.

- [ ] **Step 1: Write failing service and resolver tests**

Use in-memory fakes for the media store and injected `fetch` for resolvers. Test unauthorised actors, invalid WebP signatures, size/dimension caps, path traversal, failed insert rollback, stable treatment upsert, mismatched external hosts, unavailable providers, and restricted provider flags.

```ts
it("removes the uploaded object when media insertion fails", async () => {
  store.insertError = new Error("database unavailable");
  await expect(service.createUpload(founder, validUpload)).rejects.toThrow("database unavailable");
  expect(store.removedPaths).toEqual([expect.stringMatching(/^stories\/candidate-1\/[a-f0-9-]+\.webp$/)]);
});

it("rejects a renamed executable before storage", async () => {
  await expect(service.createUpload(founder, {
    ...validUpload,
    bytes: new Uint8Array([0x4d, 0x5a, 0x90, 0x00]),
  })).rejects.toThrow("Upload must be a valid WebP image");
  expect(store.uploadedPaths).toEqual([]);
});

it("resolves Spotify as display-only external art", async () => {
  const asset = await resolveExternalMedia(
    { provider: "spotify", sourceUrl: "https://open.spotify.com/album/abc" },
    { fetch: spotifyOEmbedFetch, tmdbToken: null },
  );
  expect(asset).toMatchObject({
    provider: "spotify",
    permissions: { commercialUse: false, modification: false, socialUse: false },
  });
});
```

- [ ] **Step 2: Run focused tests and verify they fail**

Run: `npm test -- src/backend/media/service.test.ts src/backend/media/external.test.ts src/backend/config/env.test.ts`

Expected: FAIL because the media backend does not exist.

- [ ] **Step 3: Implement the service boundary**

Define a store that keeps storage details out of domain and UI code.

```ts
export interface MediaStore {
  upload(path: string, bytes: Uint8Array, contentType: "image/webp"): Promise<string>;
  remove(path: string): Promise<void>;
  insert(asset: MediaAsset): Promise<MediaAsset>;
  upsert(asset: MediaAsset): Promise<MediaAsset>;
  get(id: string): Promise<MediaAsset | null>;
}

export interface TreatmentInput {
  candidateId: string;
  nicheId: string;
  discoveryType: DiscoveryType;
}

export interface PreparedUploadInput {
  candidateId: string;
  bytes: Uint8Array;
  width: number;
  height: number;
  alt: string;
  sourceUrl: string;
  creator?: string;
  creditLine: string;
  licenseCode: string;
  licenseUrl?: string;
  permissions: MediaPermissions;
}

export class MediaService {
  constructor(
    private readonly store: MediaStore,
    private readonly allowlistedEmails: ReadonlySet<string>,
  ) {}

  async ensureTreatment(actor: EditorialActor | null, input: TreatmentInput) {
    assertEditorialAccess(actor, this.allowlistedEmails);
    const id = `larper-${input.candidateId}`;
    return this.store.upsert({
      id,
      kind: "larper_treatment",
      provider: "larper",
      alt: "",
      width: 1400,
      height: 933,
      treatment: chooseCoverTreatment(input.nicheId, input.discoveryType),
      visualSeed: visualSeedFor(input.candidateId),
      permissions: { commercialUse: true, modification: true, socialUse: true },
    });
  }
}
```

`createUpload` must accept only WebP RIFF bytes, a maximum of 400,000 bytes, dimensions from 1 through 1400, and a candidate ID matching `/^[a-zA-Z0-9-]+$/`. Generate the object path server-side with `crypto.randomUUID()`. If database insertion fails after upload, remove that exact object before rethrowing.

`resolveExternalMedia` uses official metadata presentation paths without copying the binary into LARPer storage:

- Spotify and YouTube use their public oEmbed metadata endpoints and retain returned image URLs only after host validation.
- TMDB requires optional `TMDB_API_READ_ACCESS_TOKEN`; without it, return `TMDB is not configured` and leave the LARPer fallback available.
- All three provider records default to `modification: false` and `socialUse: false`.
- No F1 downloader exists; F1 exact imagery enters through licensed upload or correctly attributed Commons/permission records.

Read the token as optional in non-production and production because it is an optional adapter rather than an application requirement.

- [ ] **Step 4: Run backend media, configuration, and authorisation tests**

Run: `npm test -- src/backend/media src/backend/config src/backend/editorial/authorization.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the media backend**

```bash
git add src/backend/media src/backend/editorial/runtime.ts src/backend/config/env.ts src/backend/config/env.test.ts .env.example
git commit -m "feat: create authorised editorial media service"
```

---

### Task 4: Build the compact Studio cover desk and browser preflight

**Files:**
- Create: `src/app/studio/candidates/image-preflight.ts`
- Create: `src/app/studio/candidates/image-preflight.test.ts`
- Create: `src/app/studio/candidates/cover-editor.tsx`
- Create: `src/app/studio/candidates/cover-editor.module.css`
- Create: `src/app/studio/candidates/cover-editor.test.tsx`
- Modify: `src/app/studio/actions.ts`
- Modify: `src/app/studio/actions.test.ts`
- Modify: `src/app/studio/candidates/story-editor.tsx`
- Modify: `src/app/studio/candidates/story-editor.module.css`

**Interfaces:**
- Consumes: media service from Task 3.
- Produces: `createUploadedMediaAction(formData)`, `createExternalMediaAction(formData)`, `selectLarperTreatmentAction(formData)`, and a hidden `mediaId` value consumed by publication actions in Task 5.

- [ ] **Step 1: Write failing preflight, action, and component tests**

Test dimension calculation, unsupported source types, upload failure state, three modes, restricted controls, accessible status, hidden media selection, and the existing workspace/sidebar structure.

```ts
it("fits a landscape upload inside 1400 pixels without upscaling", () => {
  expect(targetDimensions(2400, 1600, 1400)).toEqual({ width: 1400, height: 933 });
  expect(targetDimensions(900, 600, 1400)).toEqual({ width: 900, height: 600 });
});

it("keeps restricted external artwork uneditable", async () => {
  render(<CoverEditor candidate={candidate} actions={actions} />);
  await user.click(screen.getByRole("radio", { name: "Exact external asset" }));
  await user.selectOptions(screen.getByLabelText("Provider"), "spotify");
  expect(screen.getByLabelText("Focal position")).toBeDisabled();
  expect(screen.getByText("Spotify artwork stays uncropped and unmodified.")).toBeVisible();
});

it("returns a field-specific error without redirecting when upload validation fails", async () => {
  const result = await createUploadedMediaAction(invalidUploadForm);
  expect(result).toEqual({ ok: false, error: "Upload must be a valid WebP image" });
});
```

- [ ] **Step 2: Run the focused tests and verify they fail**

Run: `npm test -- src/app/studio/candidates/image-preflight.test.ts src/app/studio/candidates/cover-editor.test.tsx src/app/studio/actions.test.ts`

Expected: FAIL because the cover desk and media actions do not exist.

- [ ] **Step 3: Implement preflight, actions, and UI**

Keep the client-side image code isolated and dependency-free.

```ts
export function targetDimensions(width: number, height: number, max: number) {
  const scale = Math.min(1, max / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export interface PreparedImage {
  file: File;
  width: number;
  height: number;
}

export async function toEditorialWebp(file: File): Promise<PreparedImage> {
  if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(file.type)) {
    throw new Error("Choose a JPEG, PNG, or WebP image");
  }
  const bitmap = await createImageBitmap(file);
  const size = targetDimensions(bitmap.width, bitmap.height, 1400);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d", { alpha: false })!;
  context.fillStyle = "#e9ebee";
  context.fillRect(0, 0, size.width, size.height);
  context.drawImage(bitmap, 0, 0, size.width, size.height);
  let blob: Blob | null = null;
  for (const quality of [0.82, 0.72, 0.62, 0.52]) {
    blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/webp", quality));
    if (blob && blob.size <= 400_000) break;
  }
  if (!blob || blob.size > 400_000) throw new Error("Image is still larger than 400 KB after compression");
  return { file: new File([blob], "cover.webp", { type: "image/webp" }), ...size };
}
```

The three server actions return structured results and re-check Studio authorisation through the runtime media service. The cover editor uses `type="button"` controls inside the existing story form, calls those actions through a transition, and updates one hidden `<input name="mediaId">`. It must not nest another `<form>` inside the publication form.

Insert a compact `<fieldset>` between Classification and Evidence Summary. Keep `.workspace`, `.evidence`, and `.actionBar` rules unchanged. The new cover CSS uses a maximum preview height and collapses its option grid below 600 px.

- [ ] **Step 4: Run Studio component and action tests**

Run: `npm test -- src/app/studio/candidates src/app/studio/actions.test.ts src/app/studio/studio-dashboard.test.tsx`

Expected: PASS, including all pre-existing editor and dashboard assertions.

- [ ] **Step 5: Commit the Studio cover desk**

```bash
git add src/app/studio/actions.ts src/app/studio/actions.test.ts src/app/studio/candidates
git commit -m "feat: add Studio cover selection desk"
```

---

### Task 5: Persist selected media through publish, brief, schedule, and revisions

**Files:**
- Modify: `src/backend/editorial/types.ts`
- Modify: `src/backend/editorial/actions.ts`
- Modify: `src/backend/editorial/actions.test.ts`
- Modify: `src/backend/editorial/service.ts`
- Modify: `src/backend/editorial/service.test.ts`
- Modify: `src/app/studio/actions.ts`
- Modify: `src/app/studio/actions.test.ts`
- Modify: `supabase/migrations/202609220003_editorial_media.sql`
- Modify: `src/data/postgres/schema.test.ts`

**Interfaces:**
- Consumes: hidden `mediaId` from Task 4 or `MediaService.ensureTreatment` when none is selected.
- Produces: `StoryDraft.mediaId` and `BriefDraft.mediaId`, persisted by both publication RPCs.

- [ ] **Step 1: Write failing publication tests**

Pin story, brief, schedule, fallback, foreign media ID, and revision behavior without changing evidence eligibility tests.

```ts
it.each(["publishStory", "publishBrief"] as const)("passes mediaId through %s", async method => {
  const form = validPublicationForm();
  form.set("mediaId", "media-1");
  await actions[method](form);
  expect(service[method]).toHaveBeenCalledWith(
    actor,
    "candidate-1",
    expect.objectContaining({ mediaId: "media-1" }),
  );
});

it("creates the deterministic fallback before publishing when no cover is selected", async () => {
  await publishCandidateAction(validPublicationForm());
  expect(media.ensureTreatment).toHaveBeenCalledWith(actor, expect.objectContaining({ candidateId: "candidate-1" }));
  expect(editorial.publishStory).toHaveBeenCalledWith(actor, "candidate-1", expect.objectContaining({ mediaId: "larper-candidate-1" }));
});

it("writes media_id and the mediaId revision field in the same transaction", () => {
  expect(editorialMediaMigration).toMatch(/media_id = .*p_draft->>'mediaId'/is);
  expect(editorialMediaMigration).toMatch(/insert into public\.story_revisions.*p_draft/is);
});
```

- [ ] **Step 2: Run the focused editorial tests and verify they fail**

Run: `npm test -- src/backend/editorial src/app/studio/actions.test.ts src/data/postgres/schema.test.ts`

Expected: FAIL because drafts and RPCs do not carry `mediaId`.

- [ ] **Step 3: Add media selection to every publication path**

Make `mediaId` required after app-layer resolution.

```ts
export interface StoryDraft {
  mediaId: string;
  nicheId: string;
  slug: string;
  title: string;
  hook: string;
  summary: string;
  whyItMatters: string;
  lore: string;
  beginnerContext: string;
  conversationLine: string;
  discoveryType: DiscoveryType;
  mode: TopicMode;
  regions: string[];
  freshnessLabel: string;
  evidenceSummary: string;
  tags: string[];
}
```

Before calling backend editorial actions, `publishCandidateAction` and `scheduleCandidateAction` resolve the chosen ID or call `ensureTreatment`, then set `form.set("mediaId", resolved.id)`. The backend action parser uses `required(form, "mediaId")`. The service validates that the store can load the referenced media and refuses missing records with `Selected cover is unavailable`.

In the migration, replace both editorial RPC definitions so insert/update sets `media_id` from the draft and the existing `snapshot` remains the complete draft JSON. Preserve every current lock, evidence, lifecycle, scheduling, grant, and search-path clause.

- [ ] **Step 4: Run all editorial, migration, and scheduling tests**

Run: `npm test -- src/backend/editorial src/app/studio/actions.test.ts src/data/postgres/schema.test.ts src/backend/intelligence/publication.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit publication persistence**

```bash
git add src/backend/editorial src/app/studio/actions.ts src/app/studio/actions.test.ts src/data/postgres/schema.test.ts supabase/migrations/202609220003_editorial_media.sql
git commit -m "feat: persist story covers through publication"
```

---

### Task 6: Upgrade public artwork without changing existing layout contracts

**Files:**
- Create: `src/components/discovery/larper-cover.tsx`
- Create: `src/components/discovery/larper-cover.module.css`
- Create: `src/components/discovery/larper-cover.test.tsx`
- Create: `src/components/discovery/resilient-image.tsx`
- Create: `src/components/discovery/resilient-image.test.tsx`
- Modify: `src/components/discovery/artwork.tsx`
- Modify: `src/components/discovery/artwork.module.css`
- Modify: `src/components/discovery/discovery-card.tsx`
- Modify: `src/components/discovery/discovery-home.tsx`
- Modify: `src/components/discovery/topic-pieces.tsx`
- Modify: `src/components/discovery/niche-signal-card.tsx`
- Modify: `src/app/discover/[slug]/page.tsx`
- Modify: `src/app/niches/[slug]/page.tsx`
- Modify: corresponding component and route tests
- Modify: `next.config.ts`

**Interfaces:**
- Consumes: `MediaAsset`, `placementFor`, story title/niche/type, and treatment metadata.
- Produces: backward-compatible `Artwork` behavior for local assets plus restricted external and LARPer treatment rendering.

- [ ] **Step 1: Write failing rendering and regression tests**

Assert existing local markup/class behavior, unmodified external presentation, deterministic treatment output, attribution, no broken `img` for missing source, and unchanged card structure.

```tsx
it("keeps existing LARPer images in cover mode", () => {
  render(<Artwork media={larperOwnedAsset} context={storyContext} />);
  expect(screen.getByRole("img")).toHaveStyle({ objectFit: "cover" });
  expect(screen.getByTestId("artwork-frame")).toHaveAttribute("data-render", "cover");
});

it("contains restricted album artwork without the editorial filter", () => {
  render(<Artwork media={spotifyAsset} context={musicContext} />);
  expect(screen.getByRole("img")).toHaveStyle({ objectFit: "contain", filter: "none" });
  expect(screen.getByText("Spotify")).toBeVisible();
});

it("uses a stable treatment instead of a broken image", () => {
  const externalAsset: MediaAsset = {
    id: "external-1", kind: "external", provider: "youtube",
    src: "https://i.ytimg.com/vi/abc/hqdefault.jpg", alt: "Video thumbnail",
    width: 480, height: 360, sourceUrl: "https://www.youtube.com/watch?v=abc",
    creditLine: "YouTube", licenseCode: "youtube-platform",
    permissions: { commercialUse: false, modification: false, socialUse: false },
  };
  const missingExternalAsset = { ...externalAsset, src: undefined };
  const { rerender } = render(<Artwork media={missingExternalAsset} context={f1Context} />);
  const firstVariant = screen.getByTestId("larper-cover").getAttribute("data-variant");
  rerender(<Artwork media={missingExternalAsset} context={f1Context} />);
  expect(screen.getByTestId("larper-cover")).toHaveAttribute("data-variant", firstVariant);
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
});

it("preserves discovery card link and copy structure", () => {
  const { container } = render(<DiscoveryCard item={item} kind="visual" />);
  expect(container.querySelector("article > a + div")).not.toBeNull();
});
```

- [ ] **Step 2: Run component and route tests and verify they fail**

Run: `npm test -- src/components/discovery src/app/discover src/app/niches`

Expected: FAIL because media kinds and treatments are not rendered.

- [ ] **Step 3: Implement the story-aware compatibility boundary**

Keep the outer `.frame`/`.fallback` sizing declarations unchanged. Select only the inside presentation.

```tsx
export function Artwork({ media, context, priority = false, className = "" }: ArtworkProps) {
  const decision = media ? placementFor(media, "card") : null;
  if (!media || media.kind === "larper_treatment" || !media.src) {
    return (
      <div className={`${styles.frame} ${className}`} data-render="treatment" data-testid="artwork-frame">
        <LarperCover context={context} treatment={media?.treatment} visualSeed={media?.visualSeed} />
      </div>
    );
  }
  return (
    <div className={`${styles.frame} ${className}`} data-render={decision!.render} data-testid="artwork-frame">
      <ResilientImage
        src={media.src}
        alt={media.alt}
        fill
        unoptimized={media.kind === "external"}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        sizes="(max-width: 767px) 100vw, (max-width: 1100px) 60vw, 50vw"
        style={{
          objectFit: decision!.render === "cover" ? "cover" : "contain",
          objectPosition: decision!.render === "cover" ? media.focalPosition ?? "50% 50%" : "50% 50%",
          filter: decision!.applyFilter ? undefined : "none",
        }}
        fallback={<LarperCover context={context} />}
      />
      {media.kind === "external" && media.creditLine && <span className={styles.credit}>{media.creditLine}</span>}
    </div>
  );
}
```

Keep failure state in the smallest possible client component rather than making every discovery card a client component:

```tsx
"use client";

import Image, { type ImageProps } from "next/image";
import { useState, type ReactNode } from "react";

export function ResilientImage({ fallback, ...props }: ImageProps & { fallback: ReactNode }) {
  const [failed, setFailed] = useState(false);
  if (failed) return fallback;
  return <Image {...props} onError={() => setFailed(true)} />;
}
```

`LarperCover` uses semantic text already present in the linked card, so decorative repetitions are `aria-hidden`. Use CSS custom properties derived from the stable seed for three variants per vertical; do not use runtime randomness.

Update every story call site to pass title, niche ID, discovery type, and stable story ID. Niche-only artwork keeps current behavior. Add exact `remotePatterns` entries for the configured Supabase hostname and the three provider image hosts, with HTTPS and narrow path patterns.

- [ ] **Step 4: Run public component, route, accessibility, and type tests**

Run: `npm test -- src/components/discovery src/app/discover src/app/niches src/data`

Expected: PASS, including all existing discovery tests.

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 5: Commit the public renderer**

```bash
git add src/components/discovery src/app/discover src/app/niches next.config.ts
git commit -m "feat: render rights-aware story artwork"
```

---

### Task 7: Generate permission-aware Open Graph images

**Files:**
- Create: `src/domain/media/social.ts`
- Create: `src/domain/media/social.test.ts`
- Create: `src/app/discover/[slug]/opengraph-image.tsx`
- Create: `src/app/discover/[slug]/opengraph-image.test.tsx`
- Modify: `src/app/discover/[slug]/page.tsx`

**Interfaces:**
- Consumes: topic detail view model and `MediaAsset.permissions.socialUse`.
- Produces: `buildSocialArtwork(detail): SocialArtworkModel` and a cached 1200×630 PNG response.

- [ ] **Step 1: Write failing social-model and route tests**

```ts
it("includes an approved uploaded asset", () => {
  expect(buildSocialArtwork(detailWithSocialUpload)).toMatchObject({
    imageSrc: "https://project.supabase.co/storage/v1/object/public/editorial-media/cover.webp",
    treatment: "culture",
  });
});

it("excludes display-only provider artwork", () => {
  expect(buildSocialArtwork(detailWithSpotifyArt)).toMatchObject({
    imageSrc: null,
    treatment: "music",
  });
});

it("returns an image response for an existing story", async () => {
  const response = await OpenGraphImage({ params: Promise.resolve({ slug: "story" }) });
  expect(response.headers.get("content-type")).toBe("image/png");
});
```

- [ ] **Step 2: Run focused tests and verify they fail**

Run: `npm test -- src/domain/media/social.test.ts 'src/app/discover/[slug]/opengraph-image.test.tsx'`

Expected: FAIL because the social model and route do not exist.

- [ ] **Step 3: Implement the pure model and Next.js 16 image route**

Use Promise-based route params as required by Next.js 16 and keep permission logic outside JSX.

```ts
export function buildSocialArtwork(detail: TopicDetailViewModel): SocialArtworkModel {
  const media = detail.media;
  return {
    title: detail.topic.title,
    niche: detail.niche.name,
    hook: detail.topic.hook,
    treatment: media?.treatment ?? chooseCoverTreatment(detail.topic.nicheId, detail.topic.type),
    visualSeed: media?.visualSeed ?? visualSeedFor(detail.topic.id),
    imageSrc: media?.src && media.permissions.socialUse ? media.src : null,
  };
}
```

Define the model beside the builder so the route never reinterprets rights:

```ts
export interface SocialArtworkModel {
  title: string;
  niche: string;
  hook: string;
  treatment: CoverTreatment;
  visualSeed: string;
  imageSrc: string | null;
}
```

```tsx
export const alt = "LARPer story preview";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const detail = await getCachedTopicDetail(slug);
  if (!detail) return new ImageResponse(<div style={fallbackStyle}>LARPer</div>, size);
  const model = buildSocialArtwork(detail);
  return new ImageResponse(<SocialImage model={model} />, size);
}
```

Implement the image component with Satori-supported flexbox styles. It keeps any permitted image in a distinct rectangular bay and never overlays text on provider artwork.

```tsx
function SocialImage({ model }: { model: SocialArtworkModel }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", background: "#e9ebee", color: "#101110", padding: 56 }}>
      <div style={{ width: "55%", display: "flex", flexDirection: "column", justifyContent: "space-between", borderTop: "8px solid #1546d2", paddingTop: 24 }}>
        <div style={{ display: "flex", fontSize: 24, textTransform: "uppercase" }}>LARPer / {model.niche}</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 64, lineHeight: 0.95, fontWeight: 700 }}>{model.title}</div>
          <div style={{ display: "flex", marginTop: 24, fontSize: 26, lineHeight: 1.2 }}>{model.hook}</div>
        </div>
      </div>
      <div style={{ width: "45%", display: "flex", marginLeft: 44, alignItems: "center", justifyContent: "center", border: "2px solid #101110", background: "#d7d9dc" }}>
        {model.imageSrc
          ? <img src={model.imageSrc} alt="" width="100%" height="100%" style={{ objectFit: "contain" }} />
          : <div style={{ display: "flex", fontSize: 36, textTransform: "uppercase" }}>{model.treatment}</div>}
      </div>
    </div>
  );
}
```

Page metadata keeps the route-generated image convention rather than adding manual duplicate URLs.

- [ ] **Step 4: Run social, route, discovery-cache, and build tests**

Run: `npm test -- src/domain/media/social.test.ts 'src/app/discover/[slug]/opengraph-image.test.tsx' src/data/discovery-cache.test.ts`

Expected: PASS.

Run: `npm run build`

Expected: PASS with generated Open Graph routes and no unsupported Satori CSS errors.

- [ ] **Step 5: Commit social images**

```bash
git add src/domain/media/social.ts src/domain/media/social.test.ts 'src/app/discover/[slug]/opengraph-image.tsx' 'src/app/discover/[slug]/opengraph-image.test.tsx' 'src/app/discover/[slug]/page.tsx'
git commit -m "feat: generate rights-aware story social images"
```

---

### Task 8: Verify the complete workflow and document editorial operations

**Files:**
- Create: `e2e/editorial-media.spec.ts`
- Create: `e2e/fixtures/editorial-cover.webp`
- Modify: `docs/operations/live-culture-runbook.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: all prior tasks.
- Produces: operator guidance and end-to-end proof for upload, fallback, public rendering, and social output.

- [ ] **Step 1: Add the end-to-end workflow tests**

Use the deterministic local test runtime rather than live provider credentials. Cover one uploaded asset, one restricted external asset fixture, and one LARPer fallback.

```ts
test("publishes a story with a selected cover without changing card geometry", async ({ page }) => {
  await page.goto("/studio/candidates/media-fixture");
  await page.getByLabel("Licensed upload").check();
  await page.getByLabel("Cover image").setInputFiles("e2e/fixtures/editorial-cover.webp");
  await page.getByLabel("Alt text").fill("Race car entering a floodlit corner");
  await page.getByLabel("Credit line").fill("Photo: LARPer test fixture");
  await page.getByRole("button", { name: "Use this cover" }).click();
  await page.getByRole("button", { name: "Publish story" }).click();
  await page.goto("/");
  await expect(page).toHaveScreenshot("home-after-editorial-media.png", { fullPage: true });
});

test("uses the deterministic fallback when external media is unavailable", async ({ page }) => {
  await page.goto("/discover/media-fallback-fixture");
  await expect(page.getByTestId("larper-cover")).toHaveAttribute("data-treatment", "motorsport");
  await expect(page.locator('img[src*="broken"]')).toHaveCount(0);
});
```

- [ ] **Step 2: Run the end-to-end tests and fix only workflow defects**

Run: `npm run test:e2e -- e2e/editorial-media.spec.ts`

Expected: PASS.

- [ ] **Step 3: Document the operator checklist**

Add a concise runbook section with this exact decision order:

```md
## Story covers

1. Prefer an exact, approved subject asset over generic stock.
2. Record creator, source URL, licence, commercial-use, modification, and social-use decisions.
3. Never paste or download an arbitrary source-page OG image.
4. Keep Spotify, YouTube, and other display-only provider art unmodified.
5. If rights are unclear or the provider fails, publish with the LARPer treatment and revisit later.
6. Verify the feed card, story hero, and social preview before publishing.
```

Document the `editorial-media` bucket, 400 KB WebP cap, optional TMDB token, attribution locations, and recovery steps for a missing object. Update the README architecture list with the new `src/domain/media` and `src/backend/media` boundaries.

- [ ] **Step 4: Run the complete verification suite**

Run: `npm test`

Expected: PASS.

Run: `npm run lint`

Expected: PASS.

Run: `npm run typecheck`

Expected: PASS.

Run: `npm run build`

Expected: PASS.

Run: `npm run test:e2e`

Expected: PASS.

- [ ] **Step 5: Perform visual regression review**

Compare desktop and mobile screenshots for:

- Homepage hero collage.
- Lead, visual, lore, and compact discovery cards.
- Topic hero with an existing local asset.
- Square Spotify artwork contained inside a music frame.
- Portrait screen artwork contained inside a screen frame.
- F1 LARPer treatment without photography.
- Studio editor at 1440 px and 390 px widths.
- 1200×630 Open Graph image.

Reject the implementation if existing local artwork changes crop/filter unexpectedly, any card height changes, provider art is altered, attribution overlaps copy, or mobile Studio actions become unreachable.

- [ ] **Step 6: Commit operations and end-to-end coverage**

```bash
git add e2e/editorial-media.spec.ts e2e/fixtures/editorial-cover.webp docs/operations/live-culture-runbook.md README.md
git commit -m "test: verify editorial image workflow"
```
