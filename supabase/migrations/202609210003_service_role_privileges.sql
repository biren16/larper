-- service_role is used only by server-side Vercel code and the Supabase Edge
-- Function. Browser roles (anon and authenticated) receive no new access.
grant all privileges on table
  public.source_definitions,
  public.raw_signals,
  public.signal_snapshots,
  public.topic_clusters,
  public.cluster_signals,
  public.stories,
  public.story_revisions,
  public.ingestion_runs,
  public.source_failures,
  public.review_events
to service_role;

grant select on table public.niches to service_role;
