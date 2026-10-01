-- Run with psql from the repository root in a disposable PostgreSQL database.
-- The compact tables exercise the actual migration without live data.
begin;
create table public.topic_clusters (id uuid primary key, state text, updated_at timestamptz);
create table public.stories (
  id uuid primary key, cluster_id uuid, lifecycle text, publication_format text,
  scheduled_for timestamptz, published_at timestamptz, last_updated_at timestamptz,
  reviewed_by uuid
);
create table public.raw_signals (id uuid primary key, source_definition_id uuid, trust_tier text, availability text);
create table public.cluster_signals (cluster_id uuid, raw_signal_id uuid);
create table public.story_revisions (story_id uuid, revision integer, snapshot jsonb, editor_id uuid);
create table public.review_events (cluster_id uuid, story_id uuid, reviewer_id uuid, action text, notes text);

insert into public.topic_clusters(id, state) values
  ('00000000-0000-0000-0000-000000000101', 'reviewing'),
  ('00000000-0000-0000-0000-000000000102', 'reviewing'),
  ('00000000-0000-0000-0000-000000000103', 'rejected');
insert into public.stories(id, cluster_id, lifecycle, publication_format, scheduled_for, reviewed_by) values
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000101', 'reviewing', 'story', now() - interval '1 minute', '00000000-0000-0000-0000-000000000301'),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000102', 'reviewing', 'story', now() - interval '1 minute', '00000000-0000-0000-0000-000000000301'),
  ('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000103', 'reviewing', 'story', now() - interval '1 minute', '00000000-0000-0000-0000-000000000301');
insert into public.raw_signals(id, source_definition_id, trust_tier, availability) values
  ('00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000501', 'publication', 'available'),
  ('00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000000502', 'community', 'available'),
  ('00000000-0000-0000-0000-000000000403', '00000000-0000-0000-0000-000000000503', 'publication', 'available'),
  ('00000000-0000-0000-0000-000000000404', '00000000-0000-0000-0000-000000000504', 'community', 'unreachable');
insert into public.cluster_signals(cluster_id, raw_signal_id) values
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000401'),
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000402'),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000403'),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000404'),
  ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000401'),
  ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000402');

\i supabase/migrations/202610010001_guard_scheduled_publication.sql

do $$
declare published integer;
begin
  published := public.publish_due_stories();
  if published <> 1 then raise exception 'Expected one eligible story, published %', published; end if;
  if (select lifecycle from public.stories where id = '00000000-0000-0000-0000-000000000201') <> 'published_story' then
    raise exception 'Eligible story did not publish';
  end if;
  if (select lifecycle from public.stories where id = '00000000-0000-0000-0000-000000000202') <> 'reviewing' then
    raise exception 'Story with unavailable evidence published';
  end if;
  if (select scheduled_for from public.stories where id = '00000000-0000-0000-0000-000000000202') is not null then
    raise exception 'Blocked story still scheduled';
  end if;
  if (select lifecycle from public.stories where id = '00000000-0000-0000-0000-000000000203') <> 'reviewing' then
    raise exception 'Rejected cluster published';
  end if;
  if (select count(*) from public.review_events where action = 'scheduled_publish_blocked') <> 2 then
    raise exception 'Blocked publications were not audited';
  end if;
end;
$$;
rollback;
