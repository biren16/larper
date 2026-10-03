import type { DiscoveryType, TopicMode } from "@/domain/discovery/types";
import type { EditorialService } from "./service";
import type { EditorialActor, StoryDraft } from "./types";

const DISCOVERY_TYPES = new Set<DiscoveryType>(["DROP", "LORE", "MEME", "TREND", "DEBATE", "COMEBACK", "PRODUCT", "EVENT", "PERSON", "AESTHETIC", "DRAMA", "RABBIT_HOLE"]);

function required(form: FormData, key: string): string {
  const value = String(form.get(key) ?? "").trim();
  if (!value) throw new Error(`${key} is required`);
  return value;
}

function list(form: FormData, key: string): string[] {
  return String(form.get(key) ?? "").split(",").map((value) => value.trim()).filter(Boolean);
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}

function storyTagsFromForm(form: FormData): string[] {
  return [...new Set([
      ...list(form, "tags").filter((tag) => !(form.get("nicheId") === "style" && form.get("styleSubtopicsPresent") === "true" && ["sneakers", "streetwear"].includes(tag.toLowerCase()))),
      ...(form.get("nicheId") === "style" ? form.getAll("styleSubtopics").map(String).filter((tag) => ["sneakers", "streetwear"].includes(tag)) : []),
    ])];
}

export function storyDraftFromForm(form: FormData): StoryDraft {
  const discoveryType = required(form, "discoveryType") as DiscoveryType;
  const mode = required(form, "mode") as TopicMode;
  if (!DISCOVERY_TYPES.has(discoveryType)) throw new Error("discoveryType is invalid");
  if (mode !== "current" && mode !== "deep-lore") throw new Error("mode is invalid");
  return {
    mediaId: String(form.get("mediaId") ?? "").trim() || null,
    nicheId: required(form, "nicheId"),
    slug: required(form, "slug"),
    title: required(form, "title"),
    hook: required(form, "hook"),
    summary: required(form, "summary"),
    whyItMatters: required(form, "whyItMatters"),
    lore: required(form, "lore"),
    beginnerContext: required(form, "beginnerContext"),
    conversationLine: required(form, "conversationLine"),
    discoveryType,
    mode,
    regions: list(form, "regions"),
    freshnessLabel: required(form, "freshnessLabel"),
    evidenceSummary: required(form, "evidenceSummary"),
    independentSourcesConfirmed: form.get("independentSourcesConfirmed") === "on",
    tags: storyTagsFromForm(form),
  };
}

export function editorialDate(value: string): string {
  if (/(?:Z|[+-]\d\d:\d\d)$/.test(value)) return value;
  return `${value}${/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(value) ? ":00" : ""}+05:30`;
}

export function createEditorialActions(dependencies: {
  service: EditorialService;
  getActor: () => Promise<EditorialActor | null>;
  now: () => string;
  invalidatePublicContent?: (content: { slug?: string }) => void | Promise<void>;
}) {
  return {
    saveDraft: async (form: FormData) => {
      try {
        const result = await dependencies.service.saveDraft(await dependencies.getActor(), required(form, "candidateId"), storyDraftFromForm(form));
        return { ok: true as const, storyId: result.storyId };
      } catch (error) { return { ok: false as const, error: message(error) }; }
    },
    publishStory: async (form: FormData) => {
      try {
        const candidateId = required(form, "candidateId");
        const result = await dependencies.service.publishStory(await dependencies.getActor(), candidateId, storyDraftFromForm(form));
        await dependencies.invalidatePublicContent?.({ slug: required(form, "slug") });
        return { ok: true as const, storyId: result.storyId };
      } catch (error) {
        return { ok: false as const, error: message(error) };
      }
    },
    publishBrief: async (form: FormData) => {
      try {
        const result = await dependencies.service.publishBrief(await dependencies.getActor(), required(form, "candidateId"), {
          mediaId: String(form.get("mediaId") ?? "").trim() || null,
          nicheId: required(form, "nicheId"),
          slug: required(form, "slug"),
          title: required(form, "title"),
          regions: list(form, "regions"),
          freshnessLabel: required(form, "freshnessLabel"),
          evidenceSummary: required(form, "evidenceSummary"),
          independentSourcesConfirmed: form.get("independentSourcesConfirmed") === "on",
          tags: storyTagsFromForm(form),
        });
        await dependencies.invalidatePublicContent?.({ slug: required(form, "slug") });
        return { ok: true as const, storyId: result.storyId };
      } catch (error) {
        return { ok: false as const, error: message(error) };
      }
    },
    transition: async (form: FormData) => {
      try {
        const actor = await dependencies.getActor();
        const candidateId = required(form, "candidateId");
        const notes = required(form, "notes");
        const action = required(form, "action");
        if (action === "reject") await dependencies.service.reject(actor, candidateId, notes);
        else if (action === "expire") await dependencies.service.expire(actor, candidateId, notes);
        else if (action === "unpublish") await dependencies.service.unpublish(actor, candidateId, notes);
        else throw new Error("action is invalid");
        await dependencies.invalidatePublicContent?.({ slug: String(form.get("slug") ?? "").trim() || undefined });
        return { ok: true as const };
      } catch (error) {
        return { ok: false as const, error: message(error) };
      }
    },
    merge: async (form: FormData) => {
      try {
        await dependencies.service.merge(await dependencies.getActor(), required(form, "targetId"), required(form, "sourceId"));
        return { ok: true as const };
      } catch (error) {
        return { ok: false as const, error: message(error) };
      }
    },
    split: async (form: FormData) => {
      try {
        const clusterId = await dependencies.service.split(await dependencies.getActor(), required(form, "clusterId"), list(form, "signalIds"));
        return { ok: true as const, clusterId };
      } catch (error) {
        return { ok: false as const, error: message(error) };
      }
    },
    addManualSignal: async (form: FormData) => {
      try {
        const signalId = await dependencies.service.addManualSignal(await dependencies.getActor(), {
          url: required(form, "url"),
          title: required(form, "title"),
          sourceName: String(form.get("sourceName") ?? ""),
          publishedAt: editorialDate(required(form, "publishedAt")),
          region: required(form, "region"),
          locale: String(form.get("locale") ?? "en-IN"),
          author: String(form.get("author") ?? "") || undefined,
          body: String(form.get("body") ?? "") || undefined,
          creatorOwnershipConfirmed: form.get("creatorOwnershipConfirmed") === "on",
          platform: String(form.get("platform") ?? "web") as import("@/backend/ingestion/manual").ManualPlatform,
          suggestedNicheId: String(form.get("suggestedNicheId") ?? "") || undefined,
          observationNote: String(form.get("observationNote") ?? "") || undefined,
          visibleMetrics: {
            views: String(form.get("visibleViews") ?? ""), likes: String(form.get("visibleLikes") ?? ""),
            comments: String(form.get("visibleComments") ?? ""), shares: String(form.get("visibleShares") ?? ""),
          },
        }, required(form, "sourceDefinitionId"), dependencies.now());
        return { ok: true as const, signalId };
      } catch (error) {
        return { ok: false as const, error: message(error) };
      }
    },
  };
}
