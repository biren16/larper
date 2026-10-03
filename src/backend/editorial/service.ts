import { starterForKey, type StarterDraft } from "./starters";
import { briefEligibility } from "@/backend/intelligence/publication";
import { normalizeManualSignal, type ManualSignalInput } from "@/backend/ingestion/manual";
import type { NormalizedSignal, SourceDefinition } from "@/backend/ingestion/types";
import type { PublicationFormat, TopicLifecycle } from "@/domain/discovery/types";
import { assertEditorialAccess } from "./authorization";
import type { BriefDraft, CandidateRecord, EditorialActor, StoryDraft } from "./types";

export interface PublicationCommand {
  candidateId: string;
  expectedVersion?: number;
  reviewerId: string;
  lifecycle: Extract<TopicLifecycle, "published_story" | "published_brief">;
  publicationFormat: PublicationFormat;
  draft: StoryDraft | BriefDraft;
}

export interface DraftCommand { expectedVersion?: number; candidateId: string; reviewerId: string; draft: StoryDraft; }

export interface ReviewEvent {
  expectedVersion?: number;
  candidateId: string;
  reviewerId: string;
  action: string;
  notes?: string;
}

export interface EditorialStore {
  createWorkingStory?(reviewerId: string): Promise<string>;
  changeSchedule?(command: DraftCommand & { operation: "cancel_schedule" | "update_schedule" }): Promise<{storyId: string; revision: number}>;
  commitStarterDraft(command: { reviewerId: string; starter: StarterDraft }): Promise<string>;
  getSourceDefinition(id: string): Promise<SourceDefinition | null>;
  commitDraft(command: DraftCommand): Promise<{ storyId: string; revision: number }>;
  getCandidate(id: string): Promise<CandidateRecord | null>;
  commitPublication(command: PublicationCommand): Promise<{ storyId: string; revision: number }>;
  recordReview(event: ReviewEvent): Promise<void>;
  setCandidateState(id: string, state: TopicLifecycle): Promise<void>;
  commitTransition(event: ReviewEvent & { state: TopicLifecycle }): Promise<void>;
  mergeClusters(targetId: string, sourceId: string, reviewerId: string): Promise<void>;
  splitCluster(clusterId: string, signalIds: string[], reviewerId: string): Promise<string>;
  addManualSignal(signal: NormalizedSignal): Promise<string>;
  schedulePublication(command: PublicationCommand & { scheduledFor: string }): Promise<{ storyId: string; revision: number }>;
}

export function validateWorkingDraft(draft: StoryDraft) {
 if (draft.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.slug)) throw new Error("Slug must contain lowercase words separated by hyphens");
 for (const [key, value] of Object.entries(draft)) {
  if (typeof value === "string" && value.length > 100000) throw new Error(`${key} is too long`);
 }
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

function confirmIndependentOrigins(confirmed: boolean) {
  if (!confirmed) throw new Error("Confirm that the sources have independent origins");
}

function availableEvidence(candidate: CandidateRecord) {
  return candidate.evidence.filter((item) => item.availability === "available");
}

function independentEvidence(candidate: CandidateRecord) {
  const origins = new Map<string, CandidateRecord["evidence"][number]>();
  for (const item of availableEvidence(candidate)) {
    const key = item.originKey ?? `source:${item.sourceDefinitionId}`;
    const existing = origins.get(key);
    const credible = (tier: string) => tier === "primary" || tier === "publication";
    const chosen = existing && credible(existing.trustTier) ? existing : item;
    origins.set(key, { ...chosen, allowlisted: Boolean(existing?.allowlisted || item.allowlisted) });
  }
  return origins.values();
}

export class EditorialService {
  constructor(private readonly store: EditorialStore, private readonly allowlistedEmails: ReadonlySet<string>) {}

  private async candidate(actor: EditorialActor | null, candidateId: string) {
    assertEditorialAccess(actor, this.allowlistedEmails);
    const candidate = await this.store.getCandidate(candidateId);
    if (!candidate) throw new Error("Candidate not found");
    return { actor, candidate };
  }

  async createWorkingStory(actor: EditorialActor | null) {
    assertEditorialAccess(actor, this.allowlistedEmails);
    if (!this.store.createWorkingStory) throw new Error("Story creation unavailable");
    return this.store.createWorkingStory(actor.id);
  }
  async prepareStarterDraft(actor: EditorialActor | null, key: string, receiptsChecked: boolean) {
    assertEditorialAccess(actor, this.allowlistedEmails);
    if (!receiptsChecked) throw new Error("Open both source receipts before importing this draft");
    const starter = starterForKey(key);
    validateStory(starter.draft);
    return this.store.commitStarterDraft({ reviewerId: actor.id, starter });
  }

  async saveDraft(actor: EditorialActor | null, candidateId: string, draft: StoryDraft, expectedVersion?: number) {
    const context = await this.candidate(actor, candidateId);
    validateWorkingDraft(draft);
    return this.store.commitDraft({ candidateId, expectedVersion, reviewerId: context.actor.id, draft: { ...draft, independentSourcesConfirmed: false } });
  }

  async publishStory(actor: EditorialActor | null, candidateId: string, draft: StoryDraft, expectedVersion?: number) {
    const context = await this.candidate(actor, candidateId);
    validateStory(draft);
    confirmIndependentOrigins(draft.independentSourcesConfirmed);
    const evidence = [...independentEvidence(context.candidate)];
    if (evidence.length < 2) throw new Error("A story requires two independent available sources");
    if (!evidence.some((item) => item.trustTier === "primary" || item.trustTier === "publication")) {
      throw new Error("A factual story requires at least one credible source");
    }
    const result = await this.store.commitPublication({
      candidateId, expectedVersion,
      reviewerId: context.actor.id,
      lifecycle: "published_story",
      publicationFormat: "story",
      draft,
    });
    return result;
  }

  async scheduleStory(actor: EditorialActor | null, candidateId: string, draft: StoryDraft, scheduledFor: string, now: string, expectedVersion?: number) {
    const context = await this.candidate(actor, candidateId);
    if (!["detected", "reviewing"].includes(context.candidate.state)) throw new Error("Scheduling requires an unpublished candidate; unpublish first");
    validateStory(draft);
    confirmIndependentOrigins(draft.independentSourcesConfirmed);
    const evidence = [...independentEvidence(context.candidate)];
    if (evidence.length < 2) throw new Error("A story requires two independent available sources");
    if (!evidence.some((item) => item.trustTier === "primary" || item.trustTier === "publication")) throw new Error("A factual story requires at least one credible source");
    const target = Date.parse(scheduledFor);
    if (!Number.isFinite(target) || target <= Date.parse(now)) throw new Error("Scheduled publication must be in the future");
    const result = await this.store.schedulePublication({
      candidateId, expectedVersion, reviewerId: context.actor.id, lifecycle: "published_story", publicationFormat: "story", draft,
      scheduledFor: new Date(target).toISOString(),
    });
    return result;
  }

  async changeSchedule(actor: EditorialActor | null, candidateId: string, draft: StoryDraft, expectedVersion: number, operation: "cancel_schedule" | "update_schedule") {
    const context = await this.candidate(actor, candidateId);
    if (operation === "update_schedule") {
      validateStory(draft); confirmIndependentOrigins(draft.independentSourcesConfirmed);
      const evidence = [...independentEvidence(context.candidate)];
      if (evidence.length < 2) throw new Error("A story requires two independent available sources");
      if (!evidence.some(item => ["primary", "publication"].includes(item.trustTier))) throw new Error("A factual story requires at least one credible source");
    }
    if (!this.store.changeSchedule) throw new Error("Schedule changes unavailable");
    return this.store.changeSchedule({ candidateId, reviewerId: context.actor.id, draft, expectedVersion, operation });
  }

  async publishBrief(actor: EditorialActor | null, candidateId: string, draft: BriefDraft, expectedVersion?: number) {
    const context = await this.candidate(actor, candidateId);
    validateBrief(draft);
    confirmIndependentOrigins(draft.independentSourcesConfirmed);
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
      candidateId, expectedVersion,
      reviewerId: context.actor.id,
      lifecycle: "published_brief",
      publicationFormat: "brief",
      draft,
    });
    return result;
  }

  private async transition(actor: EditorialActor | null, candidateId: string, state: TopicLifecycle, action: string, notes: string, expectedVersion?: number) {
    const context = await this.candidate(actor, candidateId);
    if (!notes.trim()) throw new Error("A review note is required");
    await this.store.commitTransition({ candidateId, reviewerId: context.actor.id, state, action, expectedVersion, notes: notes.trim() });
  }

  reject(actor: EditorialActor | null, candidateId: string, notes: string, expectedVersion?: number) { return this.transition(actor, candidateId, "rejected", "reject", notes, expectedVersion); }
  expire(actor: EditorialActor | null, candidateId: string, notes: string, expectedVersion?: number) { return this.transition(actor, candidateId, "expired", "expire", notes, expectedVersion); }
  unpublish(actor: EditorialActor | null, candidateId: string, notes: string, expectedVersion?: number) { return this.transition(actor, candidateId, "reviewing", "unpublish", notes, expectedVersion); }

  async merge(actor: EditorialActor | null, targetId: string, sourceId: string) {
    const target = await this.candidate(actor, targetId);
    const source = await this.candidate(actor, sourceId);
    if (![target.candidate, source.candidate].every((item) => ["detected", "reviewing"].includes(item.state))) throw new Error("Evidence edits require unpublished candidates; unpublish first");
    if (targetId === sourceId) throw new Error("A cluster cannot merge into itself");
    await this.store.mergeClusters(targetId, sourceId, target.actor.id);
  }

  async split(actor: EditorialActor | null, clusterId: string, signalIds: string[]) {
    const context = await this.candidate(actor, clusterId);
    if (!["detected", "reviewing"].includes(context.candidate.state)) throw new Error("Evidence edits require an unpublished candidate; unpublish first");
    const uniqueIds = [...new Set(signalIds)];
    if (uniqueIds.some((id) => !context.candidate.evidence.some((item) => item.id === id))) throw new Error("Selected evidence must belong to this candidate");
    if (uniqueIds.length === 0 || uniqueIds.length >= context.candidate.evidence.length) {
      throw new Error("A split must move some, but not all, evidence");
    }
    const newClusterId = await this.store.splitCluster(clusterId, uniqueIds, context.actor.id);
    return newClusterId;
  }

  async addManualSignal(actor: EditorialActor | null, input: ManualSignalInput, sourceDefinitionId: string, observedAt: string) {
    assertEditorialAccess(actor, this.allowlistedEmails);
    const source = await this.store.getSourceDefinition(sourceDefinitionId);
    if (!source) throw new Error("Select a registered publisher or creator source");
    const signal = normalizeManualSignal(input, source, observedAt);
    return this.store.addManualSignal(signal);
  }
}
