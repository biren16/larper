import { describe, expect, it, vi } from "vitest";
import { createEditorialActions } from "./actions";

describe("editorial action factory", () => {
  it("re-resolves the actor and validates form input before publishing", async () => {
    const getActor = vi.fn(async () => ({ id: "editor-1", email: "founder@example.com", role: "founder" as const }));
    const publishStory = vi.fn(async () => ({ storyId: "story-1", revision: 1, workingPersisted: true }));
    const invalidatePublicContent = vi.fn();
    const actions = createEditorialActions({
      getActor,
      now: () => "2026-09-20T10:00:00.000Z",
      service: { publishStory } as never,
      invalidatePublicContent,
    });
    const form = new FormData(); form.set("editorialVersion", "0");
    Object.entries({
      candidateId: "cluster-1", nicheId: "books", slug: "f1-books", title: "F1 books", hook: "Hook", summary: "Summary",
      whyItMatters: "Why", lore: "Lore", beginnerContext: "Context", discoveryType: "TREND", mode: "current", regions: "india,global",
      conversationLine: "Mention the crossover, not just the headline.", freshnessLabel: "Moving", evidenceSummary: "Two sources", tags: "books,f1", independentSourcesConfirmed: "on",
    }).forEach(([key, value]) => form.set(key, value));

    await expect(actions.publishStory(form)).resolves.toEqual({ ok: true, storyId: "story-1", revision: 1, workingPersisted: true });
    expect(getActor).toHaveBeenCalledOnce();
    expect(publishStory).toHaveBeenCalledWith(expect.objectContaining({ id: "editor-1" }), "cluster-1", expect.objectContaining({ regions: ["india", "global"], tags: ["books", "f1"], independentSourcesConfirmed: true }), 0);
    expect(invalidatePublicContent).toHaveBeenCalledWith({ slug: "f1-books" });
  });

  it("returns a usable validation error without invoking the service", async () => {
    const publishStory = vi.fn();
    const actions = createEditorialActions({
      getActor: async () => ({ id: "editor-1", email: "founder@example.com", role: "founder" as const }),
      now: () => "2026-09-20T10:00:00.000Z",
      service: { publishStory } as never,
    });
    await expect(actions.publishStory(new FormData())).resolves.toMatchObject({ ok: false, error: "candidateId is required", fieldErrors: { candidateId: "candidateId is required" } });
    expect(publishStory).not.toHaveBeenCalled();
  });

  it("invalidates public discovery after an editorial removal", async () => {
    const invalidatePublicContent = vi.fn();
    const unpublish = vi.fn();
    const actions = createEditorialActions({
      getActor: async () => ({ id: "editor-1", email: "founder@example.com", role: "founder" as const }),
      now: () => "2026-09-20T10:00:00.000Z",
      service: { unpublish } as never, invalidatePublicContent,
    });
    const form = new FormData(); form.set("editorialVersion", "0");
    form.set("candidateId", "cluster-1");
    form.set("action", "unpublish");
    form.set("notes", "Evidence removed");
    await expect(actions.transition(form)).resolves.toEqual({ ok: true });
    expect(unpublish).toHaveBeenCalledOnce();
    expect(invalidatePublicContent).toHaveBeenCalledWith({ slug: undefined });
  });

  it("passes structured founder pulse details to the editorial service", async () => {
    const addManualSignal = vi.fn(async () => "signal-1");
    const actions = createEditorialActions({
      getActor: async () => ({ id: "editor-1", email: "founder@example.com", role: "founder" as const }),
      now: () => "2026-09-21T10:00:00.000Z", service: { addManualSignal } as never,
    });
    const form = new FormData(); form.set("editorialVersion", "0");
    Object.entries({ url: "https://www.instagram.com/reel/a/", title: "F1 edit", sourceName: "Founder", publishedAt: "2026-09-21T09:00", region: "india", sourceDefinitionId: "manual-1", platform: "instagram", suggestedNicheId: "f1", observationNote: "Crossing feeds", visibleLikes: "1200" }).forEach(([key, value]) => form.set(key, value));

    await expect(actions.addManualSignal(form)).resolves.toEqual({ ok: true, signalId: "signal-1" });
    expect(addManualSignal).toHaveBeenCalledWith(expect.objectContaining({ id: "editor-1" }), expect.objectContaining({ platform: "instagram", suggestedNicheId: "f1", observationNote: "Crossing feeds", visibleMetrics: expect.objectContaining({ likes: "1200" }) }), "manual-1", "2026-09-21T10:00:00.000Z");
  });
});

describe("Style briefs", () => {
  it("keeps overlapping Sneakers and Streetwear filters when publishing a brief", async () => {
    const publishBrief = vi.fn(async () => ({ storyId: "style-brief", revision: 1 }));
    const actions = createEditorialActions({ getActor: async () => null, now: () => "2026-10-03T00:00:00Z", service: { publishBrief } as never });
    const form = new FormData(); form.set("editorialVersion", "0");
    for (const [key, value] of Object.entries({candidateId:"style-cluster", nicheId:"style", slug:"style-brief", title:"A collaboration", regions:"global", freshnessLabel:"Archive", evidenceSummary:"Independent sources", tags:"archive", styleSubtopicsPresent:"true", independentSourcesConfirmed:"on"})) form.set(key,value);
    form.append("styleSubtopics", "sneakers"); form.append("styleSubtopics", "streetwear");
    expect(await actions.publishBrief(form)).toEqual({ok:true, storyId:"style-brief", revision:1, workingPersisted:true});
    expect(publishBrief).toHaveBeenCalledWith(null,"style-cluster",expect.objectContaining({tags:["archive","sneakers","streetwear"]}), 0, expect.objectContaining({discoveryType:"TREND",mode:"current"}));
  });
});
it("passes newly typed full working writing independently from a brief projection", async () => {
 const publishBrief=vi.fn<(...args: unknown[]) => Promise<{storyId:string;revision:number}>>(async()=>({storyId:"brief",revision:8}));
 const actions=createEditorialActions({service:{publishBrief} as never,getActor:async()=>null,now:()=>"2026-10-03T00:00:00Z"});
 const form=new FormData();
 Object.entries({candidateId:"candidate",editorialVersion:"7",nicheId:"books",slug:"brief",title:"Brief",regions:"global",freshnessLabel:"Now",evidenceSummary:"Evidence",independentSourcesConfirmed:"on",discoveryType:"LORE",mode:"deep-lore",hook:"Typed just now",summary:"Full summary",lore:"Full lore",whyItMatters:"Context",beginnerContext:"Intro",conversationLine:"Chat line"}).forEach(([key,value])=>form.set(key,value));
 await actions.publishBrief(form);
 expect(publishBrief.mock.calls[0]?.[4]).toMatchObject({hook:"Typed just now",summary:"Full summary",lore:"Full lore",mode:"deep-lore",discoveryType:"LORE"});
 expect(publishBrief.mock.calls[0]?.[2]).not.toHaveProperty("hook");
});
