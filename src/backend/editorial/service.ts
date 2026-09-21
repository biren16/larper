import { briefEligibility } from "@/backend/intelligence/publication";
import { normalizeManualSignal, type ManualSignalInput } from "@/backend/ingestion/manual";
import type { NormalizedSignal } from "@/backend/ingestion/types";
import type { PublicationFormat, TopicLifecycle } from "@/domain/discovery/types";
import { assertEditorialAccess } from "./authorization";
import type { BriefDraft, CandidateRecord, EditorialActor, StoryDraft } from "./types";

export interface PublicationCommand {
  candidateId: string;
  reviewerId: string;
  lifecycle: Extract<TopicLifecycle, "published_story" | "published_brief">;
  publicationFormat: PublicationFormat;
  draft: StoryDraft | BriefDraft;
}

export interface ReviewEvent {
  candidateId: string;
  reviewerId: string;
  action: string;
  notes?: string;
}

export interface EditorialStore {
  getCandidate(id: string): Promise<CandidateRecord | null>;
  commitPublication(command: PublicationCommand): Promise<{ storyId: string; revision: number }>;
  recordReview(event: ReviewEvent): Promise<void>;
  setCandidateState(id: string, state: TopicLifecycle): Promise<void>;
  mergeClusters(targetId: string, sourceId: string): Promise<void>;
  splitCluster(clusterId: string, signalIds: string[]): Promise<string>;
  addManualSignal(signal: NormalizedSignal): Promise<string>;
  schedulePublication(command: PublicationCommand & { scheduledFor: string }): Promise<{ storyId: string; revision: number }>;
}

const REQUIRED_STORY_FIELDS: Array<keyof StoryDraft> = [
  "nicheId", "slug", "title", "hook", "summary", "whyItMatters", "lore", "beginnerContext", "conversationLine", "freshnessLabel", "evidenceSummary",
];

function validateSlug(slug: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error("Slug must contain lowercase words separated by hyphens");
}

function validateStory(draft: StoryDraft) {
  for (const field of REQUIRED_STORY_FIELDS) {
    const value = draft[field];
    if (typeof value !== "string" || !value.trim()) throw new Error(`${field} is required`);
  }
  validateSlug(draft.slug);
  if (draft.regions.length === 0) throw new Error("At least one region is required");
}

function validateBrief(draft: BriefDraft) {
  for (const field of ["nicheId", "slug", "title", "freshnessLabel", "evidenceSummary"] as const) {
    if (!draft[field].trim()) throw new Error(`${field} is required`);
  }
  validateSlug(draft.slug);
  if (draft.regions.length === 0) throw new Error("At least one region is required");
}

function availableEvidence(candidate: CandidateRecord) {
  return candidate.evidence.filter((item) => item.availability === "available");
}

function independentEvidence(candidate: CandidateRecord) {
  return new Map(availableEvidence(candidate).map((item) => [item.sourceDefinitionId, item])).values();
}

export class EditorialService {
  constructor(private readonly store: EditorialStore, private readonly allowlistedEmails: ReadonlySet<string>) {}

  private async candidate(actor: EditorialActor | null, candidateId: string) {
    assertEditorialAccess(actor, this.allowlistedEmails);
    const candidate = await this.store.getCandidate(candidateId);
    if (!candidate) throw new Error("Candidate not found");
    return { actor, candidate };
  }

  async publishStory(actor: EditorialActor | null, candidateId: string, draft: StoryDraft) {
    const context = await this.candidate(actor, candidateId);
    validateStory(draft);
    const evidence = [...independentEvidence(context.candidate)];
    if (evidence.length < 2) throw new Error("A story requires two independent available sources");
    if (!evidence.some((item) => item.trustTier === "primary" || item.trustTier === "publication")) {
      throw new Error("A factual story requires at least one credible source");
    }
    const result = await this.store.commitPublication({
      candidateId,
      reviewerId: context.actor.id,
      lifecycle: "published_story",
      publicationFormat: "story",
      draft,
    });
    await this.store.recordReview({ candidateId, reviewerId: context.actor.id, action: "publish_story" });
    return result;
  }

  async scheduleStory(actor: EditorialActor | null, candidateId: string, draft: StoryDraft, scheduledFor: string, now: string) {
    const context = await this.candidate(actor, candidateId);
    validateStory(draft);
    const evidence = [...independentEvidence(context.candidate)];
    if (evidence.length < 2) throw new Error("A story requires two independent available sources");
    if (!evidence.some((item) => item.trustTier === "primary" || item.trustTier === "publication")) throw new Error("A factual story requires at least one credible source");
    const target = Date.parse(scheduledFor);
    if (!Number.isFinite(target) || target <= Date.parse(now)) throw new Error("Scheduled publication must be in the future");
    const result = await this.store.schedulePublication({
      candidateId, reviewerId: context.actor.id, lifecycle: "published_story", publicationFormat: "story", draft,
      scheduledFor: new Date(target).toISOString(),
    });
    await this.store.recordReview({ candidateId, reviewerId: context.actor.id, action: "schedule_story", notes: new Date(target).toISOString() });
    return result;
  }

  async publishBrief(actor: EditorialActor | null, candidateId: string, draft: BriefDraft) {
    const context = await this.candidate(actor, candidateId);
    validateBrief(draft);
    const evidence = [...independentEvidence(context.candidate)];
    const eligibility = briefEligibility({
      heat: context.candidate.heat,
      confidence: context.candidate.confidence,
      independentSourceCount: evidence.length,
      allowlistedSourceCount: evidence.filter((item) => item.allowlisted).length,
      sensitiveFlags: context.candidate.sensitiveFlags,
    });
    if (!eligibility.eligible) throw new Error(`Brief cannot publish: ${eligibility.reasons.join(", ")}`);
    const result = await this.store.commitPublication({
      candidateId,
      reviewerId: context.actor.id,
      lifecycle: "published_brief",
      publicationFormat: "brief",
      draft,
    });
    await this.store.recordReview({ candidateId, reviewerId: context.actor.id, action: "publish_brief" });
    return result;
  }

  private async transition(actor: EditorialActor | null, candidateId: string, state: TopicLifecycle, action: string, notes: string) {
    const context = await this.candidate(actor, candidateId);
    if (!notes.trim()) throw new Error("A review note is required");
    await this.store.setCandidateState(candidateId, state);
    await this.store.recordReview({ candidateId, reviewerId: context.actor.id, action, notes: notes.trim() });
  }

  reject(actor: EditorialActor | null, candidateId: string, notes: string) { return this.transition(actor, candidateId, "rejected", "reject", notes); }
  expire(actor: EditorialActor | null, candidateId: string, notes: string) { return this.transition(actor, candidateId, "expired", "expire", notes); }
  unpublish(actor: EditorialActor | null, candidateId: string, notes: string) { return this.transition(actor, candidateId, "reviewing", "unpublish", notes); }

  async merge(actor: EditorialActor | null, targetId: string, sourceId: string) {
    await this.candidate(actor, targetId);
    if (targetId === sourceId) throw new Error("A cluster cannot merge into itself");
    await this.store.mergeClusters(targetId, sourceId);
    await this.store.recordReview({ candidateId: targetId, reviewerId: actor!.id, action: "merge", notes: sourceId });
  }

  async split(actor: EditorialActor | null, clusterId: string, signalIds: string[]) {
    const context = await this.candidate(actor, clusterId);
    const uniqueIds = [...new Set(signalIds)];
    if (uniqueIds.length === 0 || uniqueIds.length >= context.candidate.evidence.length) {
      throw new Error("A split must move some, but not all, evidence");
    }
    const newClusterId = await this.store.splitCluster(clusterId, uniqueIds);
    await this.store.recordReview({ candidateId: clusterId, reviewerId: context.actor.id, action: "split", notes: newClusterId });
    return newClusterId;
  }

  async addManualSignal(actor: EditorialActor | null, input: ManualSignalInput, sourceDefinitionId: string, observedAt: string) {
    assertEditorialAccess(actor, this.allowlistedEmails);
    const signal = normalizeManualSignal(input, sourceDefinitionId, observedAt);
    const id = await this.store.addManualSignal(signal);
    await this.store.recordReview({ candidateId: id, reviewerId: actor.id, action: "manual_signal", notes: signal.canonicalUrl });
    return id;
  }
}
