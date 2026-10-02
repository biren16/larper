-- Run from the repository root in an otherwise empty, disposable PostgreSQL database.
begin;
create role service_role;
create role anon;
create role authenticated;
create table public.topic_clusters (
  id uuid primary key, state text, editorial_stage text not null default 'watching'
    check (editorial_stage in ('watching', 'rising', 'confirmed')), niche_id text,
  confidence numeric, momentum numeric, source_diversity numeric, freshness numeric,
  novelty numeric, india_relevance numeric, crossover numeric, heat numeric,
  sensitive_flags text[], first_detected_at timestamptz, last_checked_at timestamptz,
  updated_at timestamptz
);
create table public.source_definitions (id uuid primary key default gen_random_uuid(), allowlisted boolean, config jsonb default '{}', name text default 'Publisher', adapter_type text default 'rss', trust_tier text default 'publication', locale text default 'en', region text default 'global');
create table public.raw_signals (id uuid primary key default gen_random_uuid(), source_definition_id uuid, availability text, trust_tier text,
 canonical_url text, source_type text, source_name text, title text, author text, body text, locale text, region text, published_at timestamptz,
 observed_at timestamptz default now(), metrics jsonb default '{}', sensitive_flags text[] default '{}', suggested_niche_id text,
 unique(source_definition_id, canonical_url));
 create table public.signal_snapshots (raw_signal_id uuid, metrics jsonb, captured_at timestamptz, unique(raw_signal_id,captured_at));
create table public.cluster_signals (cluster_id uuid, raw_signal_id uuid);
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

insert into public.topic_clusters values
  ('00000000-0000-0000-0000-000000000101', 'reviewing', 'confirmed', 'music', 88, 50, 50, 50, 50, 50, 50, 85, '{}', now(), now(), now());
insert into public.source_definitions(id, allowlisted) values
  ('00000000-0000-0000-0000-000000000201', true),
  ('00000000-0000-0000-0000-000000000202', true);
insert into public.raw_signals(id, source_definition_id, availability, trust_tier) values
  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000201', 'available', 'publication'),
  ('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000202', 'unreachable', 'community');
insert into public.cluster_signals values
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000301'),
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000302');


\i supabase/migrations/202610010003_atomic_editorial_publication.sql
\i supabase/migrations/202610020002_origins_and_private_drafts.sql
\i supabase/migrations/202610020008_draft_evidence_stage.sql
update public.source_definitions set config = '{"url":"https://www.one.example/feed","domains":["one.example"]}';
update public.raw_signals set availability = 'available';

do $$
declare saved record; blocked boolean := false; draft jsonb := '{"nicheId":"music","slug":"private-music","title":"Private music","hook":"Hook","summary":"Summary","whyItMatters":"Context","lore":"Lore","beginnerContext":"Beginner","conversationLine":"Conversation","freshnessLabel":"Deep lore","evidenceSummary":"Receipts","mode":"deep-lore","discoveryType":"LORE","regions":["global"],"tags":[],"independentSourcesConfirmed":true}';
begin
 select * into saved from public.save_editorial_draft('00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000401',draft);
 perform * from public.save_editorial_draft('00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000401',draft || '{"hook":"Updated hook"}');
 if (select count(*) from public.stories) <> 1 then raise exception 'Repeated draft save created duplicates'; end if;
 if (select editorial_stage from public.topic_clusters where id='00000000-0000-0000-0000-000000000101') <> 'confirmed' then raise exception 'Draft save changed the existing evidence stage'; end if;
 if not exists(select 1 from public.stories where id = saved.story_id and lifecycle = 'reviewing' and published_at is null and hook = 'Updated hook') then raise exception 'Draft persisted incorrectly'; end if;
 if (select count(*) from public.review_events where action = 'save_draft') <> 2 then raise exception 'Draft audit missing'; end if;
 if (select count(*) from public.story_revisions) <> 2 then raise exception 'Draft revisions missing'; end if;
 if has_function_privilege('anon','public.save_editorial_draft(uuid,uuid,jsonb)','execute') or has_function_privilege('authenticated','public.save_editorial_draft(uuid,uuid,jsonb)','execute') then raise exception 'Private draft RPC exposed'; end if;
 begin
  perform * from public.publish_editorial_story('00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000401','published_story','story',draft);
 exception when others then blocked := position('two available' in sqlerrm) > 0;
 end;
 if not blocked then raise exception 'Two feeds from one publisher satisfied corroboration'; end if;
 update public.source_definitions set config = '{"originKey":"publisher:two.example","domains":["two.example"]}' where id = '00000000-0000-0000-0000-000000000202';
 perform * from public.publish_editorial_story('00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000401','published_story','story',draft);
 blocked := false;
 begin
  perform * from public.save_editorial_draft('00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000401',draft);
 exception when others then blocked := position('unpublished' in sqlerrm) > 0;
 end;
 if not blocked or (select lifecycle from public.stories where id = saved.story_id) <> 'published_story' then raise exception 'Save draft unpublished a story'; end if;
end;
$$;

-- Manual observations keep their original freshness and server-owned trust/name.
do $$
declare first_id uuid; second_id uuid;
begin
 first_id := public.record_manual_signal('00000000-0000-0000-0000-000000000201',
 '{"canonicalUrl":"https://one.example/story","title":"Manual lead","sourceType":"manual","publishedAt":"2026-09-01T00:00:00Z","observedAt":"2026-09-02T00:00:00Z","metrics":{"likes":10},"trustTier":"primary","sourceName":"Forged"}');
 second_id := public.record_manual_signal('00000000-0000-0000-0000-000000000201',
 '{"canonicalUrl":"https://one.example/story","title":"Manual lead again","sourceType":"manual","publishedAt":"2026-09-01T00:00:00Z","observedAt":"2026-10-02T00:00:00Z","metrics":{"likes":20}}');
 if first_id <> second_id then raise exception 'Repeated link created another signal'; end if;
 if not exists(select 1 from public.raw_signals where id = first_id and observed_at = '2026-09-02T00:00:00Z' and trust_tier = 'publication' and source_name = 'Publisher' and metrics->>'likes' = '20') then raise exception 'Freshness or trust/name changed'; end if;
 if (select count(*) from public.signal_snapshots where raw_signal_id = first_id) <> 2 then raise exception 'Manual snapshots missing'; end if;
end;
$$;

-- Release-time corroboration is rechecked after origin consolidation.
\i supabase/migrations/202610020006_release_origin_recheck.sql
update public.topic_clusters set state = 'reviewing';
update public.stories set lifecycle = 'reviewing', published_at = null;
select * from public.schedule_editorial_story('00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000401',
 '{"nicheId":"music","slug":"private-music","title":"Private music","hook":"Hook","summary":"Summary","whyItMatters":"Context","lore":"Lore","beginnerContext":"Beginner","conversationLine":"Conversation","freshnessLabel":"Deep lore","evidenceSummary":"Receipts","mode":"deep-lore","discoveryType":"LORE","regions":["global"],"tags":[],"independentSourcesConfirmed":true}', now() + interval '1 hour');
update public.stories set scheduled_for = now() - interval '1 minute';
update public.source_definitions set config = '{"originKey":"publisher:one.example","domains":["one.example"]}';
do $$ begin
 if public.publish_due_stories() <> 0 or exists(select 1 from public.stories where lifecycle <> 'reviewing') then raise exception 'Scheduled release counted two feeds from the same origin'; end if;
 if not exists(select 1 from public.review_events where action = 'scheduled_publish_blocked') then raise exception 'Missing scheduled origin rejection audit'; end if;
end; $$;

-- A genuinely independent, still-approved schedule can release normally.
update public.source_definitions set config = '{"originKey":"publisher:two.example","domains":["two.example"]}' where id='00000000-0000-0000-0000-000000000202';
update public.stories set scheduled_for = now() - interval '1 minute';
do $$ declare released integer; begin
 released := public.publish_due_stories();
 if released <> 1 or not exists(select 1 from public.stories where lifecycle='published_story') then raise exception 'Independent scheduled release was blocked'; end if;
end; $$;

-- Registering a publisher website as a creator must reuse its origin and record.
alter table public.source_definitions add column poll_minutes integer, add column active boolean, add column watchlist_beat text;
\i supabase/migrations/202610020007_manual_creator_identity.sql
do $$ declare creator_id uuid; signal_id uuid; website_id uuid; legacy_id uuid; blocked boolean := false; begin
 creator_id := public.register_manual_creator('https://one.example','Website author','one.example');
 if creator_id <> '00000000-0000-0000-0000-000000000201' then raise exception 'Publisher website became a second creator identity'; end if;
 signal_id := public.record_manual_signal(creator_id,'{"canonicalUrl":"https://one.example/story","title":"Same receipt","sourceType":"manual","publishedAt":"2026-09-01T00:00:00Z","observedAt":"2026-10-02T12:00:00Z"}');
 if (select count(*) from public.raw_signals where canonical_url='https://one.example/story') <> 1 or
   (select observed_at from public.raw_signals where id=signal_id) <> '2026-09-02T00:00:00Z' then raise exception 'Website alias duplicated receipt or freshness'; end if;
 website_id := public.register_manual_creator('https://artist.example','Artist website','artist.example');
 if public.source_origin_key(website_id,(select config from public.source_definitions where id=website_id)) <> 'publisher:artist.example' then raise exception 'Website creator uses another origin namespace'; end if;
 if (select trust_tier from public.source_definitions where id=website_id) <> 'watchlist' then raise exception 'Unknown website creator promoted'; end if;
 insert into public.source_definitions(name,trust_tier,config) values('Legacy generic social source','primary','{"domains":["instagram.com"]}') returning id into legacy_id;
 begin
  perform public.record_manual_signal(legacy_id,'{"canonicalUrl":"https://instagram.com/reel/abc","title":"Unattributed reel","sourceType":"manual","publishedAt":"2026-09-01T00:00:00Z","observedAt":"2026-10-02T12:00:00Z"}');
 exception when others then blocked := position('creator profile' in sqlerrm) > 0;
 end;
 if not blocked then raise exception 'Generic social publisher bypassed creator trust'; end if;
 if has_function_privilege('authenticated','public.register_manual_creator(text,text,text)','execute') or
   has_function_privilege('anon','public.record_manual_signal(uuid,jsonb)','execute') then raise exception 'Manual intake RPC bypassed founder authentication'; end if;
end; $$;

alter table public.stories enable row level security;
create policy published_only on public.stories for select using(lifecycle in ('published_story','published_brief'));
grant usage on schema public to anon;
grant select on public.stories to anon;
update public.stories set lifecycle = 'reviewing', published_at = null;
set local role anon;
do $$ begin if exists(select 1 from public.stories) then raise exception 'Private draft publicly readable'; end if; end; $$;
reset role;
rollback;
