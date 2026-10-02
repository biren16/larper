-- Recheck founder-approved scheduled stories when the release time arrives.
-- A source may become unavailable, or a candidate may be rejected, after scheduling.
create or replace function public.publish_due_stories()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  due public.stories;
  cluster_state text;
  available_source_count integer;
  credible_source_count integer;
  next_revision integer;
  published_count integer := 0;
  block_reason text;
begin
  for due in select * from public.stories where lifecycle = 'reviewing' and scheduled_for <= now() for update skip locked
  loop
    select state into cluster_state from public.topic_clusters where id = due.cluster_id;
    select count(distinct public.source_origin_key(definitions.id, definitions.config)),
      count(distinct public.source_origin_key(definitions.id, definitions.config)) filter (where raw.trust_tier in ('primary', 'publication'))
    into available_source_count, credible_source_count
    from public.cluster_signals links
    join public.raw_signals raw on raw.id = links.raw_signal_id
    join public.source_definitions definitions on definitions.id = raw.source_definition_id
    where links.cluster_id = due.cluster_id and raw.availability = 'available';

    block_reason := case
      when cluster_state is distinct from 'reviewing' then 'Candidate is no longer under review'
      when available_source_count < 2 then 'Fewer than two available sources remain'
      when credible_source_count < 1 then 'No credible source remains'
      else null
    end;
    if block_reason is not null then
      update public.stories set scheduled_for = null, last_updated_at = now() where id = due.id;
      insert into public.review_events(cluster_id, story_id, reviewer_id, action, notes)
        values (due.cluster_id, due.id, due.reviewed_by, 'scheduled_publish_blocked', block_reason);
      continue;
    end if;

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
