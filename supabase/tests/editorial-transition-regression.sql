begin;
create role service_role;
create table public.topic_clusters (id uuid primary key, state text, updated_at timestamptz);
create table public.stories (
  id uuid primary key, cluster_id uuid unique, lifecycle text, published_at timestamptz,
  scheduled_for timestamptz, last_updated_at timestamptz
);
create table public.review_events (
  cluster_id uuid, story_id uuid, reviewer_id uuid, action text,
  notes text check (notes <> 'fail audit')
);
insert into public.topic_clusters values ('00000000-0000-0000-0000-000000000101', 'published_story', now());
insert into public.stories values (
  '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000101',
  'published_story', now(), now() + interval '1 day', now()
);

\i supabase/migrations/202610010006_atomic_editorial_transitions.sql

do $$
begin
  begin
    perform public.transition_editorial_candidate(
      '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000301',
      'reviewing', 'unpublish', 'fail audit'
    );
  exception when check_violation then null;
  end;
  if (select lifecycle from public.stories) <> 'published_story' then
    raise exception 'Failed review event left a story unpublished';
  end if;
  perform public.transition_editorial_candidate(
    '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000301',
    'reviewing', 'unpublish', 'Evidence removed'
  );
  if (select lifecycle from public.stories) <> 'reviewing' or
     (select published_at from public.stories) is not null or
     (select scheduled_for from public.stories) is not null then
    raise exception 'Story stayed public or scheduled after unpublish';
  end if;
  if (select count(*) from public.review_events where action = 'unpublish' and story_id = '00000000-0000-0000-0000-000000000201') <> 1 then
    raise exception 'Unpublish audit is missing';
  end if;
end;
$$;
rollback;
