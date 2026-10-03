import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";

const redirect = vi.fn((url: string) => { throw new Error(`redirect:${url}`); });
const getEditorialRuntime = vi.fn();
const createEditorialActions = vi.fn();

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/backend/editorial/runtime", () => ({ getEditorialRuntime }));
vi.mock("@/backend/editorial/actions", () => ({ createEditorialActions }));

describe("addManualSignalAction", () => {
  it("refreshes unclustered signals after saving a founder lead", async () => {
    const rpc = vi.fn(async () => ({ error: null }));
    const query: Record<string, unknown> = {};
    Object.assign(query, {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      limit: vi.fn(() => query),
      maybeSingle: async () => ({ data: { id: "manual-source" }, error: null }),
    });
    getEditorialRuntime.mockResolvedValue({
      actor: { id: "founder-1" }, service: {},
      client: { from: () => query, rpc },
    });
    createEditorialActions.mockReturnValue({ addManualSignal: async () => ({ ok: true, signalId: "signal-1" }) });
    const { addManualSignalAction } = await import("./actions");
    const form = new FormData();
    form.set("sourceDefinitionId", "manual-source");

    await expect(addManualSignalAction(form)).rejects.toThrow("redirect:/studio?notice=signal-added");
    expect(rpc).toHaveBeenCalledWith("process_unclustered_signals");
  });

  it("accepts the manual intake source even when scheduled polling is paused", async () => {
    const rpc = vi.fn(async () => ({ error: null }));
    const query: Record<string, unknown> = {};
    const eq = vi.fn(() => query);
    Object.assign(query, {
      select: vi.fn(() => query),
      eq,
      limit: vi.fn(() => query),
      maybeSingle: async () => ({ data: { id: "manual-source" }, error: null }),
    });
    getEditorialRuntime.mockResolvedValue({
      actor: { id: "founder-1" }, service: {},
      client: { from: () => query, rpc },
    });
    createEditorialActions.mockReturnValue({ addManualSignal: async () => ({ ok: true, signalId: "signal-1" }) });
    const { addManualSignalAction } = await import("./actions");

    const form = new FormData(); form.set("sourceDefinitionId", "manual-source");
    await expect(addManualSignalAction(form)).rejects.toThrow("redirect:/studio?notice=signal-added");
    expect(eq).not.toHaveBeenCalled();
  });
});

describe("source actions", () => {
  it("returns a source-added notice after creating a paused source", async () => {
    const insert = vi.fn(async () => ({ error: null }));
    getEditorialRuntime.mockResolvedValue({ client: { from: () => ({ insert }) } });
    const { createSourceAction } = await import("./actions");
    const form = new FormData();
    form.set("name", "Books desk");
    form.set("adapterType", "rss");
    form.set("trustTier", "publication");
    form.set("watchlistBeat", "books");
    form.set("locator", "https://example.com/feed.xml");

    await expect(createSourceAction(form)).rejects.toThrow("redirect:/studio/sources?notice=source-added");
  });

  it("accepts screen culture as a source beat", async () => {
    const insert = vi.fn(async () => ({ error: null }));
    getEditorialRuntime.mockResolvedValue({ client: { from: () => ({ insert }) } });
    const { createSourceAction } = await import("./actions");
    const form = new FormData();
    form.set("name", "International screen desk");
    form.set("adapterType", "rss");
    form.set("trustTier", "publication");
    form.set("watchlistBeat", "screen-culture");
    form.set("locator", "https://example.com/screen.xml");

    await expect(createSourceAction(form)).rejects.toThrow("redirect:/studio/sources?notice=source-added");
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ watchlist_beat: "screen-culture" }));
  });

  it("returns activation and pause notices to the Sources workspace", async () => {
    const eq = vi.fn(async () => ({ error: null }));
    const update = vi.fn(() => ({ eq }));
    getEditorialRuntime.mockResolvedValue({ client: { from: () => ({ update, select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { adapter_type: "rss", config: { usageReview: { termsUrl: "https://example.com/terms", basis: "Feed usage allowed", notes: "Links only", reviewedBy: "founder", reviewedAt: "2026-10-02T10:00:00Z" } } }, error: null }) }) }) }) } });
    const { toggleSourceAction } = await import("./actions");

    const activate = new FormData();
    activate.set("sourceId", "source-1");
    activate.set("active", "true");
    await expect(toggleSourceAction(activate)).rejects.toThrow("redirect:/studio/sources?notice=source-activated");

    const pause = new FormData();
    pause.set("sourceId", "source-1");
    pause.set("active", "false");
    await expect(toggleSourceAction(pause)).rejects.toThrow("redirect:/studio/sources?notice=source-paused");
  });
});

describe("uploadEditorialMediaAction", () => {
  it("rejects an unsupported image before storing it", async () => {
    const upload = vi.fn();
    getEditorialRuntime.mockResolvedValue({ client: { storage: { from: () => ({ upload }) } } });
    const { uploadEditorialMediaAction } = await import("./actions");
    const form = new FormData();
    form.set("candidateId", "00000000-0000-0000-0000-000000000101");
    form.set("image", new File(["not a webp"], "cover.png", { type: "image/png" }));
    await expect(uploadEditorialMediaAction(form)).resolves.toMatchObject({ ok: false, error: expect.stringContaining("WebP") });
    expect(upload).not.toHaveBeenCalled();
  });

  it("stores an approved cover and its rights record", async () => {
    const upload = vi.fn(async () => ({ error: null }));
    const insert = vi.fn(async () => ({ error: null }));
    getEditorialRuntime.mockResolvedValue({ client: {
      storage: { from: () => ({ upload, getPublicUrl: () => ({ data: { publicUrl: "https://storage.example/cover.webp" } }) }) },
      from: () => ({ insert }),
    } });
    const bytes = await sharp({ create: { width: 200, height: 100, channels: 3, background: "#eeeeee" } }).webp().toBuffer();
    const form = new FormData();
    form.set("candidateId", "00000000-0000-0000-0000-000000000101");
    form.set("image", new File([new Uint8Array(bytes)], "cover.webp", { type: "image/webp" }));
    form.set("alt", "Race car at the circuit");
    form.set("sourceUrl", "https://example.com/original");
    form.set("creditLine", "Photo by Artist");
    form.set("licenseCode", "permission");
    form.set("commercialUseAllowed", "on");
    const { uploadEditorialMediaAction } = await import("./actions");
    await expect(uploadEditorialMediaAction(form)).resolves.toMatchObject({ ok: true, mediaId: expect.any(String) });
    expect(upload).toHaveBeenCalledOnce();
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      alt: "Race car at the circuit", credit_line: "Photo by Artist",
      commercial_use_allowed: true, modification_allowed: false, social_use_allowed: false,
      width: 200, height: 100, src: "https://storage.example/cover.webp",
    }));
  });
});

describe("candidate action notices", () => {
  it("confirms story and brief publication", async () => {
    getEditorialRuntime.mockResolvedValue({ actor: { id: "founder-1" }, service: {} });
    createEditorialActions.mockReturnValue({
      publishStory: async () => ({ ok: true, storyId: "story-1" }),
      publishBrief: async () => ({ ok: true, storyId: "story-1" }),
    });
    const { publishCandidateAction } = await import("./actions");
    const story = new FormData();
    story.set("candidateId", "cluster-1");
    await expect(publishCandidateAction(story)).resolves.toMatchObject({ ok: true, destination: "/studio?notice=story-published" });

    const brief = new FormData();
    brief.set("candidateId", "cluster-1");
    brief.set("format", "brief");
    await expect(publishCandidateAction(brief)).resolves.toMatchObject({ ok: true, destination: "/studio?notice=brief-published" });
  });
});

describe("seven-lane source actions", () => {
  it.each(["style", "internet-culture"])("accepts %s for a paused source", async (beat) => {
    const insert = vi.fn(async () => ({ error: null }));
    getEditorialRuntime.mockResolvedValue({ client: { from: () => ({ insert }) } });
    const { createSourceAction } = await import("./actions");
    const form = new FormData();
    for (const [key, value] of Object.entries({ name: "Culture desk", adapterType: "rss", trustTier: "publication", watchlistBeat: beat, locator: "https://example.com/feed" })) form.set(key, value);
    await expect(createSourceAction(form)).rejects.toThrow("notice=source-added");
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ watchlist_beat: beat, active: false, region: "global", locale: "en" }));
  });

  it("blocks activation without a recorded usage review", async () => {
    const update = vi.fn();
    const query = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: { config: {} }, error: null }), update };
    getEditorialRuntime.mockResolvedValue({ client: { from: () => query } });
    const { toggleSourceAction } = await import("./actions");
    const form = new FormData(); form.set("sourceId", "source-1"); form.set("active", "true");
    await expect(toggleSourceAction(form)).rejects.toThrow(/usage.*review/i);
    expect(update).not.toHaveBeenCalled();
  });
});


describe("creator registration cannot bypass origin and trust controls", () => {
  it.each(["manual", "rss"])("rejects a social creator through the %s publisher form", async (adapterType) => {
    const insert = vi.fn(async () => ({ error: null }));
    getEditorialRuntime.mockResolvedValue({ client: { from: () => ({ insert }) } });
    const { createSourceAction } = await import("./actions");
    const form = new FormData();
    for (const [key, value] of Object.entries({ name: "Creator", adapterType, trustTier: "primary", watchlistBeat: "internet-culture", locator: "https://www.instagram.com/person" })) form.set(key, value);
    await expect(createSourceAction(form)).rejects.toThrow(/creator/);
    expect(insert).not.toHaveBeenCalled();
  });
});
