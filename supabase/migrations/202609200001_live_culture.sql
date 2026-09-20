create extension if not exists pgcrypto;
create extension if not exists pg_cron;

create table if not exists public.media_assets (
  id text primary key,
  src text not null,
  alt text not null check (length(trim(alt)) > 0),
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  focal_position text,
  created_at timestamptz not null default now()
);

create table if not exists public.niches (
  id text primary key,
  slug text not null unique,
  name text not null,
  description text not null,
  curiosity_hook text not null,
  parent_category text not null,
  related_niche_ids text[] not null default '{}',
  hero_media_id text references public.media_assets(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  origin text not null default 'ingested' check (origin in ('seed', 'ingested')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.niche_aliases (
  id uuid primary key default gen_random_uuid(),
  niche_id text not null references public.niches(id) on delete cascade,
  alias text not null,
  locale text not null default 'en',
  created_at timestamptz not null default now(),
  unique (niche_id, alias, locale)
);

create table if not exists public.source_definitions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  adapter_type text not null check (adapter_type in ('rss', 'youtube', 'manual')),
  config jsonb not null default '{}',
  trust_tier text not null check (trust_tier in ('primary', 'publication', 'community', 'watchlist')),
  locale text not null default 'en',
  region text not null default 'global',
  poll_minutes integer not null default 180 check (poll_minutes >= 15),
  allowlisted boolean not null default false,
  active boolean not null default true,
  last_polled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.raw_signals (
  id uuid primary key default gen_random_uuid(),
  source_definition_id uuid not null references public.source_definitions(id) on delete restrict,
  canonical_url text not null,
  external_id text,
  source_type text not null,
  source_name text not null,
  author text,
  title text not null,
  body text,
  locale text not null default 'en',
  region text not null default 'global',
  published_at timestamptz not null,
  observed_at timestamptz not null default now(),
  trust_tier text not null,
  availability text not null default 'available' check (availability in ('available', 'deleted', 'private', 'unreachable')),
  metrics jsonb not null default '{}',
  sensitive_flags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_definition_id, canonical_url)
);

create unique index raw_signals_external_identity on public.raw_signals(source_definition_id, external_id) where external_id is not null;

create table if not exists public.signal_snapshots (
  id uuid primary key default gen_random_uuid(),
  raw_signal_id uuid not null references public.raw_signals(id) on delete cascade,
  metrics jsonb not null default '{}',
  captured_at timestamptz not null default now(),
  unique (raw_signal_id, captured_at)
);

create table if not exists public.topic_clusters (
  id uuid primary key default gen_random_uuid(),
  niche_id text references public.niches(id) on delete set null,
  title text not null,
  normalized_terms text[] not null default '{}',
  regions text[] not null default '{}',
  state text not null default 'detected' check (state in ('detected', 'reviewing', 'published_story', 'published_brief', 'rejected', 'expired')),
  momentum numeric(5,2) not null default 0 check (momentum between 0 and 100),
  source_diversity numeric(5,2) not null default 0 check (source_diversity between 0 and 100),
  freshness numeric(5,2) not null default 0 check (freshness between 0 and 100),
  novelty numeric(5,2) not null default 0 check (novelty between 0 and 100),
  india_relevance numeric(5,2) not null default 0 check (india_relevance between 0 and 100),
  crossover numeric(5,2) not null default 0 check (crossover between 0 and 100),
  heat numeric(5,2) not null default 0 check (heat between 0 and 100),
  confidence numeric(5,2) not null default 0 check (confidence between 0 and 100),
  sensitive_flags text[] not null default '{}',
  first_detected_at timestamptz not null default now(),
  last_checked_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cluster_signals (
  cluster_id uuid not null references public.topic_clusters(id) on delete cascade,
  raw_signal_id uuid not null references public.raw_signals(id) on delete cascade,
  match_score numeric(5,2) not null check (match_score between 0 and 100),
  match_reasons text[] not null default '{}',
  created_at timestamptz not null default now(),
  primary key (cluster_id, raw_signal_id)
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'member' check (role in ('member', 'editor', 'founder')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  cluster_id uuid unique references public.topic_clusters(id) on delete set null,
  niche_id text not null references public.niches(id) on delete restrict,
  slug text not null unique,
  title text not null,
  hook text not null default '',
  summary text not null default '',
  why_it_matters text not null default '',
  lore text not null default '',
  beginner_context text not null default '',
  discovery_type text not null default 'TREND',
  mode text not null default 'current' check (mode in ('current', 'deep-lore')),
  publication_format text not null check (publication_format in ('story', 'brief')),
  lifecycle text not null default 'reviewing' check (lifecycle in ('detected', 'reviewing', 'published_story', 'published_brief', 'rejected', 'expired')),
  regions text[] not null default '{}',
  freshness_label text not null default '',
  confidence numeric(5,2) not null default 0 check (confidence between 0 and 100),
  evidence_summary text not null default '',
  signals jsonb not null default '{}',
  media_id text references public.media_assets(id) on delete set null,
  tags text[] not null default '{}',
  related_story_ids uuid[] not null default '{}',
  first_detected_at timestamptz not null default now(),
  last_updated_at timestamptz not null default now(),
  last_checked_at timestamptz not null default now(),
  published_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.story_revisions (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  revision integer not null check (revision > 0),
  snapshot jsonb not null,
  editor_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (story_id, revision)
);

create table if not exists public.follows (
  user_id uuid not null references public.profiles(id) on delete cascade,
  niche_id text not null references public.niches(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, niche_id)
);

create table if not exists public.saves (
  user_id uuid not null references public.profiles(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, story_id)
);

create table if not exists public.interaction_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  anonymous_id text,
  event_name text not null,
  story_id uuid references public.stories(id) on delete set null,
  niche_id text references public.niches(id) on delete set null,
  properties jsonb not null default '{}',
  created_at timestamptz not null default now(),
  check (user_id is not null or anonymous_id is not null)
);

create table if not exists public.ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  trigger text not null,
  status text not null check (status in ('running', 'succeeded', 'partial', 'failed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  source_count integer not null default 0,
  inserted_count integer not null default 0,
  error_count integer not null default 0,
  details jsonb not null default '{}'
);

create table if not exists public.source_failures (
  id uuid primary key default gen_random_uuid(),
  source_definition_id uuid not null references public.source_definitions(id) on delete cascade,
  ingestion_run_id uuid references public.ingestion_runs(id) on delete set null,
  error_code text not null,
  message text not null,
  retryable boolean not null default true,
  occurred_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.review_events (
  id uuid primary key default gen_random_uuid(),
  cluster_id uuid references public.topic_clusters(id) on delete set null,
  story_id uuid references public.stories(id) on delete set null,
  reviewer_id uuid not null references public.profiles(id) on delete restrict,
  action text not null,
  notes text,
  created_at timestamptz not null default now(),
  check (cluster_id is not null or story_id is not null)
);

create index stories_feed_order on public.stories(lifecycle, published_at desc);
create index raw_signals_observed on public.raw_signals(observed_at desc);
create index topic_clusters_queue on public.topic_clusters(state, heat desc, confidence desc);

alter table public.media_assets enable row level security;
alter table public.niches enable row level security;
alter table public.niche_aliases enable row level security;
alter table public.source_definitions enable row level security;
alter table public.raw_signals enable row level security;
alter table public.signal_snapshots enable row level security;
alter table public.topic_clusters enable row level security;
alter table public.cluster_signals enable row level security;
alter table public.profiles enable row level security;
alter table public.stories enable row level security;
alter table public.story_revisions enable row level security;
alter table public.follows enable row level security;
alter table public.saves enable row level security;
alter table public.interaction_events enable row level security;
alter table public.ingestion_runs enable row level security;
alter table public.source_failures enable row level security;
alter table public.review_events enable row level security;

-- Published content is publicly readable; operational and draft records remain service-role only.
create policy "active niches are publicly readable" on public.niches for select using (status = 'active');
create policy "media is publicly readable" on public.media_assets for select using (true);
create policy "published content is publicly readable" on public.stories for select using (lifecycle in ('published_story', 'published_brief'));

create policy "users read their profile" on public.profiles for select using (auth.uid() = id);
create policy "users update their profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "users read own follows" on public.follows for select using (auth.uid() = user_id);
create policy "users add own follows" on public.follows for insert with check (auth.uid() = user_id);
create policy "users remove own follows" on public.follows for delete using (auth.uid() = user_id);
create policy "users read own saves" on public.saves for select using (auth.uid() = user_id);
create policy "users add own saves" on public.saves for insert with check (auth.uid() = user_id);
create policy "users remove own saves" on public.saves for delete using (auth.uid() = user_id);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name) values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
