import { describe, expect, it, vi } from "vitest";

const redirect = vi.fn((url: string) => { throw new Error(`redirect:${url}`); });
const getEditorialRuntime = vi.fn();
const createEditorialActions = vi.fn();

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/backend/editorial/runtime", () => ({ getEditorialRuntime }));
vi.mock("@/backend/editorial/actions", () => ({ createEditorialActions }));

describe("addManualSignalAction", () => {
  it("refreshes unclustered signals after saving a founder lead", async () => {
    const rpc = vi.fn(async () => ({ error: null }));
    getEditorialRuntime.mockResolvedValue({
      actor: { id: "founder-1" }, service: {},
      client: { from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ limit: () => ({ maybeSingle: async () => ({ data: { id: "manual-source" }, error: null }) }) }) }) }) }), rpc },
    });
    createEditorialActions.mockReturnValue({ addManualSignal: async () => ({ ok: true, signalId: "signal-1" }) });
    const { addManualSignalAction } = await import("./actions");
    const form = new FormData();

    await expect(addManualSignalAction(form)).rejects.toThrow("redirect:/studio?notice=signal-added");
    expect(rpc).toHaveBeenCalledWith("process_unclustered_signals");
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

  it("returns activation and pause notices to the Sources workspace", async () => {
    const eq = vi.fn(async () => ({ error: null }));
    const update = vi.fn(() => ({ eq }));
    getEditorialRuntime.mockResolvedValue({ client: { from: () => ({ update }) } });
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
    await expect(publishCandidateAction(story)).rejects.toThrow("redirect:/studio?notice=story-published");

    const brief = new FormData();
    brief.set("candidateId", "cluster-1");
    brief.set("format", "brief");
    await expect(publishCandidateAction(brief)).rejects.toThrow("redirect:/studio?notice=brief-published");
  });
});
