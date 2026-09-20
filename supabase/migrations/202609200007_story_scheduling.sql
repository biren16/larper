alter table public.stories add column if not exists scheduled_for timestamptz;
create index if not exists stories_scheduled on public.stories(scheduled_for) where scheduled_for is not null;

create or replace function public.schedule_editorial_story(p_candidate_id uuid, p_reviewer_id uuid, p_draft jsonb, p_scheduled_for timestamptz)
returns table(story_id uuid, revision integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  published record;
  scheduled public.stories;
begin
  if p_scheduled_for <= now() then raise exception 'Scheduled publication must be in the future'; end if;
  select * into published from public.publish_editorial_story(p_candidate_id, p_reviewer_id, 'published_story', 'story', p_draft);
  update public.stories set lifecycle = 'reviewing', published_at = null, scheduled_for = p_scheduled_for, last_updated_at = now()
  where id = published.story_id returning * into scheduled;
  update public.story_revisions set snapshot = to_jsonb(scheduled)
  where story_revisions.story_id = scheduled.id and story_revisions.revision = published.revision;
  update public.topic_clusters set state = 'reviewing', updated_at = now() where id = p_candidate_id;
  return query select scheduled.id, published.revision;
end;
$$;

create or replace function public.publish_due_stories()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  due public.stories;
  next_revision integer;
  published_count integer := 0;
begin
  for due in select * from public.stories where lifecycle = 'reviewing' and scheduled_for <= now() for update skip locked
  loop
    update public.stories set lifecycle = case when publication_format = 'brief' then 'published_brief' else 'published_story' end,
      published_at = now(), scheduled_for = null, last_updated_at = now() where id = due.id returning * into due;
    update public.topic_clusters set state = due.lifecycle, updated_at = now() where id = due.cluster_id;
    select coalesce(max(revision), 0) + 1 into next_revision from public.story_revisions where story_id = due.id;
    insert into public.story_revisions(story_id, revision, snapshot, editor_id) values (due.id, next_revision, to_jsonb(due), due.reviewed_by);
    insert into public.review_events(cluster_id, story_id, reviewer_id, action, notes)
      values (due.cluster_id, due.id, due.reviewed_by, 'scheduled_publish', 'Published automatically at the founder-approved time');
    published_count := published_count + 1;
  end loop;
  return published_count;
end;
$$;

revoke all on function public.schedule_editorial_story(uuid, uuid, jsonb, timestamptz) from public;
grant execute on function public.schedule_editorial_story(uuid, uuid, jsonb, timestamptz) to service_role;
revoke all on function public.publish_due_stories() from public;
grant execute on function public.publish_due_stories() to service_role;

select cron.schedule('larper-publish-scheduled-stories', '*/5 * * * *', $$select public.publish_due_stories();$$);
