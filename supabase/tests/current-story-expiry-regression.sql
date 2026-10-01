-- Run from the repository root in an otherwise empty, disposable PostgreSQL database.
begin;
create role service_role;
create table public.topic_clusters (id uuid primary key, state text, updated_at timestamptz);
create table public.stories (
  id uuid primary key, cluster_id uuid, lifecycle text, mode text,
  published_at timestamptz, last_updated_at timestamptz,
  scheduled_for timestamptz, reviewed_by uuid
);
create table public.raw_signals (id uuid primary key, availability text, observed_at timestamptz);
create table public.cluster_signals (cluster_id uuid, raw_signal_id uuid);
create table public.review_events (cluster_id uuid, story_id uuid, reviewer_id uuid, action text, notes text);

insert into public.topic_clusters values
  ('00000000-0000-0000-0000-000000000101', 'published_story', now()),
  ('00000000-0000-0000-0000-000000000102', 'published_story', now()),
  ('00000000-0000-0000-0000-000000000103', 'published_story', now());
insert into public.stories values
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000101', 'published_story', 'current', now() - interval '4 days', now(), null, '00000000-0000-0000-0000-000000000301'),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000102', 'published_story', 'current', now() - interval '4 days', now(), null, '00000000-0000-0000-0000-000000000301'),
  ('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000103', 'published_story', 'deep-lore', now() - interval '4 days', now(), null, '00000000-0000-0000-0000-000000000301');
insert into public.raw_signals values
  ('00000000-0000-0000-0000-000000000401', 'available', now() - interval '4 days'),
  ('00000000-0000-0000-0000-000000000402', 'available', now() - interval '1 day');
insert into public.cluster_signals values
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000401'),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000402'),
  ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000401');

\i supabase/migrations/202610010004_reopen_stale_stories.sql

do $$
begin
  if public.reopen_stale_current_stories() <> 1 then raise exception 'Expected one stale current story'; end if;
  if (select lifecycle from public.stories where id = '00000000-0000-0000-0000-000000000201') <> 'reviewing' then
    raise exception 'Stale current story remained public';
  end if;
  if (select state from public.topic_clusters where id = '00000000-0000-0000-0000-000000000101') <> 'reviewing' then
    raise exception 'Stale story did not return to the editorial queue';
  end if;
  if (select count(*) from public.stories where lifecycle = 'published_story') <> 2 then
    raise exception 'Fresh evidence or deep lore was incorrectly removed';
  end if;
  if (select count(*) from public.review_events where action = 'stale_story_reopened') <> 1 then
    raise exception 'Automatic re-review was not audited';
  end if;
end;
$$;
rollback;
