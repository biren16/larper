-- Disposable database path: founder lead + scheduled-source signal -> cluster -> publish -> unpublish.
begin;
create role service_role;
create extension if not exists pg_trgm with schema public;
create table public.source_definitions (
  id uuid primary key, adapter_type text, active boolean, updated_at timestamptz, allowlisted boolean
);
create table public.niches (id text primary key, name text, status text);
create table public.niche_aliases (niche_id text, alias text);
create table public.raw_signals (
  id uuid primary key, source_definition_id uuid, canonical_url text, title text, body text,
  suggested_niche_id text, region text, observed_at timestamptz, availability text,
  metrics jsonb, trust_tier text
);
create table public.topic_clusters (
  id uuid primary key default gen_random_uuid(), niche_id text, title text,
  normalized_terms text[], regions text[], state text, editorial_stage text,
  first_detected_at timestamptz, last_checked_at timestamptz, updated_at timestamptz default now(),
  expires_at timestamptz, momentum numeric, source_diversity numeric, freshness numeric,
  novelty numeric, india_relevance numeric, crossover numeric, heat numeric, confidence numeric,
  sensitive_flags text[] default '{}'
);
create table public.cluster_signals (
  cluster_id uuid, raw_signal_id uuid unique, match_score numeric, match_reasons text[]
);
create table public.signal_snapshots (raw_signal_id uuid, metrics jsonb, captured_at timestamptz);
create function public.metric_total(input jsonb) returns numeric language sql immutable as $$ select 0::numeric $$;
create table public.stories (
  id uuid primary key default gen_random_uuid(), cluster_id uuid unique, niche_id text,
  slug text, title text, hook text, summary text, why_it_matters text, lore text,
  beginner_context text, conversation_line text, discovery_type text, mode text,
  publication_format text, lifecycle text, regions text[], freshness_label text,
  confidence numeric, evidence_summary text, signals jsonb, tags text[],
  first_detected_at timestamptz, last_updated_at timestamptz, last_checked_at timestamptz,
  published_at timestamptz, reviewed_by uuid, scheduled_for timestamptz, media_id text
);
create table public.story_revisions (story_id uuid, revision integer, snapshot jsonb, editor_id uuid);
create table public.review_events (cluster_id uuid, story_id uuid, reviewer_id uuid, action text, notes text);

insert into public.source_definitions values
  ('00000000-0000-0000-0000-000000000101', 'manual', false, now(), true),
  ('00000000-0000-0000-0000-000000000102', 'rss', true, now(), true);
insert into public.niches values ('music', 'Music', 'active');
insert into public.raw_signals values
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000101', 'https://example.com/artist',
   'Music release reaches new communities', null, 'music', 'india', now(), 'available', '{}'::jsonb, 'community'),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000102', 'https://example.com/music-desk',
   'Music release reaches new communities', null, 'music', 'global', now(), 'available', '{}'::jsonb, 'publication');

\i supabase/migrations/202610010002_repair_signal_processing.sql
\i supabase/migrations/202610010003_atomic_editorial_publication.sql
\i supabase/migrations/202610010006_atomic_editorial_transitions.sql

do $$
declare candidate_id uuid; published record;
begin
  select cluster_id into candidate_id from public.cluster_signals where raw_signal_id = '00000000-0000-0000-0000-000000000201';
  if candidate_id is null or (select count(*) from public.cluster_signals where cluster_id = candidate_id) <> 2 then
    raise exception 'Manual and RSS signals did not form one candidate';
  end if;
  select * into published from public.publish_editorial_story(
    candidate_id, '00000000-0000-0000-0000-000000000301', 'published_story', 'story',
    '{"nicheId":"music","slug":"music-release","title":"Music release reaches new communities", "regions":["india","global"],"tags":["music"],"independentSourcesConfirmed":true}'::jsonb
  );
  if published.story_id is null or (select count(*) from public.stories where lifecycle = 'published_story') <> 1 then
    raise exception 'Reviewed candidate did not become public';
  end if;
  if (select count(*) from public.cluster_signals links join public.raw_signals raw on raw.id = links.raw_signal_id
      where links.cluster_id = candidate_id and raw.availability = 'available') <> 2 then
    raise exception 'Public story lost its evidence links';
  end if;
  perform public.transition_editorial_candidate(
    candidate_id, '00000000-0000-0000-0000-000000000301', 'reviewing', 'unpublish', 'Original source removed'
  );
  if (select count(*) from public.stories where lifecycle = 'published_story') <> 0 or
     (select count(*) from public.review_events where action = 'unpublish' and story_id = published.story_id) <> 1 then
    raise exception 'Unpublished story remained public or lacked an audit event';
  end if;
end;
$$;
rollback;
