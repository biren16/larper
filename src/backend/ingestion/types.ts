import type { SourceAvailability, SourceTrustTier, SourceType } from "@/domain/discovery/types";

export type AdapterType = "rss" | "youtube" | "manual";

export interface SourceDefinition {
  id: string;
  name: string;
  adapterType: AdapterType;
  trustTier: SourceTrustTier;
  locale: string;
  region: string;
  allowlisted: boolean;
  config?: Record<string, unknown>;
}

export interface NormalizedSignal {
  sourceDefinitionId: string;
  canonicalUrl: string;
  externalId?: string;
  sourceType: SourceType;
  sourceName: string;
  author?: string;
  title: string;
  body?: string;
  locale: string;
  region: string;
  publishedAt: string;
  observedAt: string;
  trustTier: SourceTrustTier;
  availability: SourceAvailability;
  metrics: Record<string, number>;
  sensitiveFlags: string[];
}

export interface IngestionSummary {
  status: "succeeded" | "partial" | "failed";
  sourceCount: number;
  insertedCount: number;
  errorCount: number;
}
