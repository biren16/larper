export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      niches: Table<{ id: string; slug: string; name: string; description: string; curiosity_hook: string; parent_category: string; related_niche_ids: string[]; hero_media_id: string | null; status: string; origin: string; created_at: string; updated_at: string }>;
      media_assets: Table<{ id: string; src: string; alt: string; width: number; height: number; focal_position: string | null; created_at: string }>;
      source_definitions: Table<{ id: string; name: string; adapter_type: string; config: Json; trust_tier: string; locale: string; region: string; poll_minutes: number; allowlisted: boolean; active: boolean; last_polled_at: string | null; created_at: string; updated_at: string }>;
      raw_signals: Table<{ id: string; source_definition_id: string; canonical_url: string; external_id: string | null; source_type: string; source_name: string; author: string | null; title: string; body: string | null; locale: string; region: string; published_at: string; observed_at: string; trust_tier: string; availability: string; metrics: Json; sensitive_flags: string[]; created_at: string; updated_at: string }>;
      signal_snapshots: Table<{ id: string; raw_signal_id: string; metrics: Json; captured_at: string }>;
      topic_clusters: Table<{ id: string; niche_id: string | null; title: string; normalized_terms: string[]; regions: string[]; state: string; momentum: number; source_diversity: number; freshness: number; novelty: number; india_relevance: number; crossover: number; heat: number; confidence: number; sensitive_flags: string[]; first_detected_at: string; last_checked_at: string; expires_at: string | null; created_at: string; updated_at: string }>;
      cluster_signals: Table<{ cluster_id: string; raw_signal_id: string; match_score: number; match_reasons: string[]; created_at: string }>;
      stories: Table<{ id: string; cluster_id: string | null; niche_id: string; slug: string; title: string; hook: string; summary: string; why_it_matters: string; lore: string; beginner_context: string; discovery_type: string; mode: string; publication_format: string; lifecycle: string; regions: string[]; freshness_label: string; confidence: number; evidence_summary: string; signals: Json; media_id: string | null; tags: string[]; related_story_ids: string[]; first_detected_at: string; last_updated_at: string; last_checked_at: string; published_at: string | null; reviewed_by: string | null; created_at: string; updated_at: string }>;
      story_revisions: Table<{ id: string; story_id: string; revision: number; snapshot: Json; editor_id: string; created_at: string }>;
      niche_aliases: Table<{ id: string; niche_id: string; alias: string; locale: string; created_at: string }>;
      profiles: Table<{ id: string; display_name: string | null; role: string; created_at: string; updated_at: string }>;
      follows: Table<{ user_id: string; niche_id: string; created_at: string }>;
      saves: Table<{ user_id: string; story_id: string; created_at: string }>;
      interaction_events: Table<{ id: string; user_id: string | null; anonymous_id: string | null; event_name: string; story_id: string | null; niche_id: string | null; properties: Json; created_at: string }>;
      ingestion_runs: Table<{ id: string; trigger: string; status: string; started_at: string; finished_at: string | null; source_count: number; inserted_count: number; error_count: number; details: Json }>;
      source_failures: Table<{ id: string; source_definition_id: string; ingestion_run_id: string | null; error_code: string; message: string; retryable: boolean; occurred_at: string; resolved_at: string | null }>;
      review_events: Table<{ id: string; cluster_id: string | null; story_id: string | null; reviewer_id: string; action: string; notes: string | null; created_at: string }>;
    };
    Views: Record<string, never>;
    Functions: {
      publish_editorial_story: {
        Args: { p_candidate_id: string; p_reviewer_id: string; p_lifecycle: string; p_publication_format: string; p_draft: Json };
        Returns: Array<{ story_id: string; revision: number }>;
      };
      process_unclustered_signals: { Args: Record<never, never>; Returns: number };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
