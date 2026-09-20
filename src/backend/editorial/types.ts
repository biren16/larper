import type { DiscoveryType, SourceAvailability, SourceTrustTier, TopicLifecycle, TopicMode } from "@/domain/discovery/types";

export interface EditorialActor {
  id: string;
  email: string;
  role: "member" | "editor" | "founder";
}

export interface EvidenceRecord {
  id: string;
  sourceDefinitionId: string;
  trustTier: SourceTrustTier;
  allowlisted: boolean;
  availability: SourceAvailability;
}

export interface CandidateRecord {
  id: string;
  title: string;
  nicheId: string | null;
  state: TopicLifecycle;
  heat: number;
  confidence: number;
  sensitiveFlags: string[];
  evidence: EvidenceRecord[];
}

export interface StoryDraft {
  nicheId: string;
  slug: string;
  title: string;
  hook: string;
  summary: string;
  whyItMatters: string;
  lore: string;
  beginnerContext: string;
  discoveryType: DiscoveryType;
  mode: TopicMode;
  regions: string[];
  freshnessLabel: string;
  evidenceSummary: string;
  tags: string[];
}

export interface BriefDraft {
  nicheId: string;
  slug: string;
  title: string;
  regions: string[];
  freshnessLabel: string;
  evidenceSummary: string;
  tags: string[];
}
