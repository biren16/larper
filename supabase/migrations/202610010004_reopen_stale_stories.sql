-- A current story is returned to review after 72 hours without recent evidence.
-- Deep lore has no live-freshness promise and is left published.
create or replace function public.reopen_stale_current_stories()
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  due public.stories;
  reopened integer := 0;
begin
  for due in
    select * from public.stories story
    where story.lifecycle = 'published_story'
      and story.mode = 'current'
      and story.published_at <= now() - interval '72 hours'
      and not exists (
        select 1 from public.cluster_signals links
        join public.raw_signals raw on raw.id = links.raw_signal_id
        where links.cluster_id = story.cluster_id
          and raw.availability = 'available'
          and raw.observed_at > now() - interval '36 hours'
      )
    for update of story skip locked
  loop
    update public.stories set lifecycle = 'reviewing', published_at = null,
      scheduled_for = null, last_updated_at = now() where id = due.id;
    update public.topic_clusters set state = 'reviewing', updated_at = now()
      where id = due.cluster_id;
    if due.reviewed_by is not null then
      insert into public.review_events(cluster_id, story_id, reviewer_id, action, notes)
        values (due.cluster_id, due.id, due.reviewed_by, 'stale_story_reopened',
          'Current story needs fresh evidence after 72 hours');
    end if;
    reopened := reopened + 1;
  end loop;
  return reopened;
end;
$$;

revoke all on function public.reopen_stale_current_stories() from public;
grant execute on function public.reopen_stale_current_stories() to service_role;
