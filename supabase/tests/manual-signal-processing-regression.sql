-- Run from the repository root in an otherwise empty, disposable PostgreSQL database.
begin;
create extension if not exists pg_trgm with schema public;
create table public.source_definitions (id uuid primary key, adapter_type text, active boolean, updated_at timestamptz, allowlisted boolean);
create table public.niches (id text primary key, name text, status text);
create table public.niche_aliases (niche_id text, alias text);
create table public.raw_signals (
  id uuid primary key, source_definition_id uuid, title text, body text,
  suggested_niche_id text, region text, observed_at timestamptz,
  availability text, metrics jsonb
);
create table public.topic_clusters (
  id uuid primary key default gen_random_uuid(), niche_id text, title text,
  normalized_terms text[], regions text[], state text, editorial_stage text,
  first_detected_at timestamptz, last_checked_at timestamptz, updated_at timestamptz default now(),
  expires_at timestamptz, momentum numeric, source_diversity numeric, freshness numeric,
  novelty numeric, india_relevance numeric, crossover numeric, heat numeric, confidence numeric
);
create table public.cluster_signals (
  cluster_id uuid, raw_signal_id uuid unique, match_score numeric, match_reasons text[]
);
create table public.signal_snapshots (raw_signal_id uuid, metrics jsonb, captured_at timestamptz);
create function public.metric_total(input jsonb) returns numeric language sql immutable as $$ select 0::numeric $$;

insert into public.source_definitions values
  ('00000000-0000-0000-0000-000000000001', 'manual', false, now(), true);
insert into public.niches values ('music', 'Music', 'active');
insert into public.raw_signals values (
  '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',
  'Music release moves across feeds', null, 'music', 'global', now(), 'available', '{}'::jsonb
);

\i supabase/migrations/202610010002_repair_signal_processing.sql

do $$
begin
  if (select count(*) from public.cluster_signals where raw_signal_id = '00000000-0000-0000-0000-000000000002') <> 1 then
    raise exception 'Manual signal did not reach a candidate';
  end if;
  if not (select active from public.source_definitions where id = '00000000-0000-0000-0000-000000000001') then
    raise exception 'Manual intake was not activated';
  end if;
  if public.process_unclustered_signals() <> 0 then
    raise exception 'Repeated processing duplicated the manual signal';
  end if;
end;
$$;
rollback;
