import { beforeEach, describe, expect, it } from "vitest";
import { EditorialService, type EditorialStore, type PublicationCommand, type ReviewEvent } from "./service";
import type { CandidateRecord, EditorialActor, StoryDraft } from "./types";

const actor: EditorialActor = { id: "editor-1", email: "founder@example.com", role: "founder" };
const draft: StoryDraft = {
  nicheId: "books",
  slug: "f1-romance-books-cross-over",
  title: "F1 romance books cross over",
  hook: "Racing edits are sending readers into a new shelf.",
  summary: "Multiple reading and racing communities are circulating the same titles.",
  whyItMatters: "It is a measurable fandom crossover rather than one viral post.",
  lore: "Motorsport romance has an older publishing history than the current edits suggest.",
  beginnerContext: "These are romance novels built around racing settings and characters.",
  discoveryType: "TREND",
  mode: "current",
  regions: ["india", "global"],
  freshnessLabel: "Crossing feeds",
  evidenceSummary: "Three independent sources across books and racing.",
  tags: ["books", "f1"],
  conversationLine: "The F1 romance wave is fandom crossover, not a random BookTok trend.",
};

function candidate(overrides: Partial<CandidateRecord> = {}): CandidateRecord {
  return {
    id: "cluster-1",
    title: "F1 books",
    nicheId: "books",
    state: "reviewing",
    heat: 84,
    confidence: 88,
    sensitiveFlags: [],
    evidence: [
      { id: "a", sourceDefinitionId: "source-a", trustTier: "publication", allowlisted: true, availability: "available" },
      { id: "b", sourceDefinitionId: "source-b", trustTier: "community", allowlisted: true, availability: "available" },
    ],
    ...overrides,
  };
}

class MemoryStore implements EditorialStore {
  current = candidate();
  publications: PublicationCommand[] = [];
  reviews: ReviewEvent[] = [];
  transitions: string[] = [];
  merges: Array<[string, string]> = [];
  splits: Array<[string, string[]]> = [];
  manuals: unknown[] = [];
  schedules: Array<{ candidateId: string; scheduledFor: string }> = [];

  async getCandidate() { return this.current; }
  async commitPublication(command: PublicationCommand) { this.publications.push(command); return { storyId: "story-1", revision: this.publications.length }; }
  async recordReview(event: ReviewEvent) { this.reviews.push(event); }
  async setCandidateState(_id: string, state: string) { this.current = { ...this.current, state: state as CandidateRecord["state"] }; this.transitions.push(state); }
  async mergeClusters(target: string, source: string) { this.merges.push([target, source]); }
  async splitCluster(id: string, signalIds: string[]) { this.splits.push([id, signalIds]); return "cluster-2"; }
  async addManualSignal(signal: unknown) { this.manuals.push(signal); return "signal-1"; }
  async schedulePublication(command: PublicationCommand & { scheduledFor: string }) { this.schedules.push({ candidateId: command.candidateId, scheduledFor: command.scheduledFor }); return { storyId: "story-1", revision: 1 }; }
}

describe("EditorialService", () => {
  let store: MemoryStore;
  let service: EditorialService;

  beforeEach(() => {
    store = new MemoryStore();
    service = new EditorialService(store, new Set(["founder@example.com"]));
  });

  it("publishes a reviewed story with credible independent evidence and a revision", async () => {
    await expect(service.publishStory(actor, "cluster-1", draft)).resolves.toEqual({ storyId: "story-1", revision: 1 });
    expect(store.publications[0]).toMatchObject({ lifecycle: "published_story", publicationFormat: "story", reviewerId: "editor-1" });
    expect(store.reviews[0]).toMatchObject({ action: "publish_story", reviewerId: "editor-1" });
  });

  it("blocks a story with fewer than two independent available sources", async () => {
    store.current = candidate({ evidence: [candidate().evidence[0]] });
    await expect(service.publishStory(actor, "cluster-1", draft)).rejects.toThrow("two independent");
  });

  it("blocks a factual story without a primary or publication source", async () => {
    store.current = candidate({ evidence: candidate().evidence.map((item) => ({ ...item, trustTier: "community" })) });
    await expect(service.publishStory(actor, "cluster-1", draft)).rejects.toThrow("credible source");
  });

  it("requires a conversation-ready line before publishing", async () => {
    await expect(service.publishStory(actor, "cluster-1", { ...draft, conversationLine: "" })).rejects.toThrow("conversationLine is required");
  });

  it("auto-publishes only eligible evidence briefs", async () => {
    await service.publishBrief(actor, "cluster-1", { nicheId: "books", slug: "f1-books-brief", title: "F1 books are crossing feeds", regions: ["india", "global"], freshnessLabel: "Moving now", evidenceSummary: "Two allowlisted signals", tags: ["books", "f1"] });
    expect(store.publications[0]).toMatchObject({ lifecycle: "published_brief", publicationFormat: "brief" });

    store.current = candidate({ sensitiveFlags: ["minors"], heat: 100, confidence: 100 });
    await expect(service.publishBrief(actor, "cluster-1", { nicheId: "books", slug: "blocked", title: "Blocked", regions: ["india"], freshnessLabel: "Moving", evidenceSummary: "Evidence", tags: [] }))
      .rejects.toThrow("sensitive:minors");
  });

  it("schedules a reviewed story for a future publication time", async () => {
    await service.scheduleStory(actor, "cluster-1", draft, "2026-09-21T10:00:00.000Z", "2026-09-20T10:00:00.000Z");
    expect(store.schedules).toEqual([{ candidateId: "cluster-1", scheduledFor: "2026-09-21T10:00:00.000Z" }]);
    expect(store.reviews.at(-1)).toMatchObject({ action: "schedule_story" });
  });

  it("records reject, expire, and unpublish transitions", async () => {
    await service.reject(actor, "cluster-1", "Not actually moving");
    await service.expire(actor, "cluster-1", "Momentum ended");
    await service.unpublish(actor, "cluster-1", "Source was removed");
    expect(store.transitions).toEqual(["rejected", "expired", "reviewing"]);
  });

  it("supports auditable merge, split, and manual intake operations", async () => {
    await service.merge(actor, "cluster-1", "cluster-duplicate");
    await expect(service.split(actor, "cluster-1", ["signal-b"])).resolves.toBe("cluster-2");
    await service.addManualSignal(actor, {
      url: "https://www.instagram.com/reel/abc/?igsh=tracking",
      title: "F1 book edit",
      sourceName: "Founder watchlist",
      publishedAt: "2026-09-20T08:00:00.000Z",
      region: "india",
    }, "manual-source", "2026-09-20T10:00:00.000Z");
    expect(store.merges).toEqual([["cluster-1", "cluster-duplicate"]]);
    expect(store.splits).toEqual([["cluster-1", ["signal-b"]]]);
    expect(store.manuals).toHaveLength(1);
  });
});
