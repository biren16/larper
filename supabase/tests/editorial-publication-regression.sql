-- Run from the repository root in an otherwise empty, disposable PostgreSQL database.
begin;
create role service_role;
create table public.topic_clusters (
  id uuid primary key, state text, editorial_stage text, niche_id text,
  confidence numeric, momentum numeric, source_diversity numeric, freshness numeric,
  novelty numeric, india_relevance numeric, crossover numeric, heat numeric,
  sensitive_flags text[], first_detected_at timestamptz, last_checked_at timestamptz,
  updated_at timestamptz
);
create table public.source_definitions (id uuid primary key, allowlisted boolean);
create table public.raw_signals (id uuid primary key, source_definition_id uuid, availability text, trust_tier text);
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
insert into public.source_definitions values
  ('00000000-0000-0000-0000-000000000201', true),
  ('00000000-0000-0000-0000-000000000202', true);
insert into public.raw_signals values
  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000201', 'available', 'publication'),
  ('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000202', 'unreachable', 'community');
insert into public.cluster_signals values
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000301'),
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000302');

\i supabase/migrations/202610010003_atomic_editorial_publication.sql

do $$
declare blocked boolean := false;
begin
  begin
    perform * from public.publish_editorial_story(
      '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000401',
      'published_story', 'story',
      '{"nicheId":"music","slug":"music-test","title":"Music test","regions":["global"],"tags":[],"independentSourcesConfirmed":true}'::jsonb
    );
  exception when others then
    blocked := position('two available sources' in sqlerrm) > 0;
  end;
  if not blocked then raise exception 'Publication was not blocked after evidence disappeared'; end if;
  if (select count(*) from public.stories) <> 0 or (select count(*) from public.review_events) <> 0 then
    raise exception 'Blocked publication left a story or review event';
  end if;
end;
$$;

update public.raw_signals set availability = 'available' where id = '00000000-0000-0000-0000-000000000302';
do $$
declare result record;
begin
  select * into result from public.publish_editorial_story(
    '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000401',
    'published_story', 'story',
    '{"nicheId":"music","slug":"music-test","title":"Music test","regions":["global"],"tags":[],"mediaId":"approved-cover","independentSourcesConfirmed":true}'::jsonb
  );
  if result.story_id is null then raise exception 'Eligible publication did not return a story'; end if;
  if (select media_id from public.stories where id = result.story_id) <> 'approved-cover' then
    raise exception 'Chosen cover did not persist on the story';
  end if;
  if (select snapshot->>'media_id' from public.story_revisions where story_id = result.story_id and revision = result.revision) <> 'approved-cover' then
    raise exception 'Chosen cover was missing from the revision snapshot';
  end if;
  if (select count(*) from public.review_events where action = 'publish_story' and story_id = result.story_id) <> 1 then
    raise exception 'Publication audit was not atomic';
  end if;
end;
$$;

do $$
declare result record;
begin
  select * into result from public.schedule_editorial_story(
    '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000401',
    '{"nicheId":"music","slug":"music-test","title":"Music test","regions":["global"],"tags":[],"independentSourcesConfirmed":true}'::jsonb,
    now() + interval '1 day'
  );
  if (select lifecycle from public.stories where id = result.story_id) <> 'reviewing' then
    raise exception 'Scheduled story was published early';
  end if;
  if (select count(*) from public.review_events where action = 'schedule_story' and story_id = result.story_id) <> 1 then
    raise exception 'Schedule approval was not audited';
  end if;
end;
$$;

update public.topic_clusters set heat = 60 where id = '00000000-0000-0000-0000-000000000101';
do $$
declare blocked boolean := false;
begin
  begin
    perform * from public.publish_editorial_story(
      '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000401',
      'published_brief', 'brief',
      '{"nicheId":"music","slug":"music-test","title":"Music test","regions":["global"],"tags":[],"independentSourcesConfirmed":true}'::jsonb
    );
  exception when others then
    blocked := position('Brief no longer meets' in sqlerrm) > 0;
  end;
  if not blocked then raise exception 'Ineligible brief published'; end if;
end;
$$;
rollback;
