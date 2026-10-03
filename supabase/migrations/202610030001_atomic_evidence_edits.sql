-- Evidence edits and their audit trail commit together. Published evidence must be unpublished first.
create or replace function public.merge_editorial_clusters(p_target_id uuid, p_source_id uuid, p_reviewer_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if p_target_id = p_source_id then raise exception 'A cluster cannot merge into itself'; end if;
 -- Stable lock order protects simultaneous inverse merges.
 perform id from public.topic_clusters where id in (p_target_id,p_source_id) order by id for update;
 if (select count(*) from public.topic_clusters where id in (p_target_id,p_source_id)) <> 2 then raise exception 'Candidate not found'; end if;
 perform id from public.stories where cluster_id in (p_target_id,p_source_id) order by id for update;
 if exists(select 1 from public.topic_clusters where id in (p_target_id,p_source_id) and state not in ('detected','reviewing'))
 or exists(select 1 from public.stories where cluster_id in (p_target_id,p_source_id) and (lifecycle in ('published_story','published_brief') or published_at is not null)) then
   raise exception 'Evidence edits require unpublished candidates; unpublish first';
 end if;
 insert into public.cluster_signals(cluster_id,raw_signal_id,match_score,match_reasons)
 select p_target_id,raw_signal_id,match_score,match_reasons from public.cluster_signals where cluster_id=p_source_id
 on conflict(cluster_id,raw_signal_id) do nothing;
 delete from public.cluster_signals where cluster_id=p_source_id;
 update public.topic_clusters target set
   sensitive_flags=array(select distinct unnest(target.sensitive_flags || source.sensitive_flags)),
   regions=array(select distinct unnest(target.regions || source.regions)),
   normalized_terms=array(select distinct unnest(target.normalized_terms || source.normalized_terms)),
   first_detected_at=least(target.first_detected_at,source.first_detected_at)
 from public.topic_clusters source where target.id=p_target_id and source.id=p_source_id;
 update public.topic_clusters set state=case when id=p_source_id then 'rejected' else 'reviewing' end,
   editorial_stage='watching',heat=0,confidence=0,updated_at=now() where id in(p_target_id,p_source_id);
 update public.stories story set scheduled_for=null, reviewed_by=null, last_updated_at=now(),first_detected_at=cluster.first_detected_at
 from public.topic_clusters cluster where story.cluster_id=cluster.id and cluster.id in(p_target_id,p_source_id);
 insert into public.review_events(cluster_id,reviewer_id,action,notes) values(p_target_id,p_reviewer_id,'merge',p_source_id::text);
end $$;

create or replace function public.split_editorial_cluster(p_cluster_id uuid,p_signal_ids uuid[],p_reviewer_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare candidate public.topic_clusters; new_id uuid; selected_count integer;
begin
 select * into candidate from public.topic_clusters where id=p_cluster_id for update;
 if candidate.id is null then raise exception 'Candidate not found'; end if;
 perform id from public.stories where cluster_id=p_cluster_id for update;
 if candidate.state not in ('detected','reviewing') or exists(select 1 from public.stories where cluster_id=p_cluster_id and (lifecycle in ('published_story','published_brief') or published_at is not null)) then
   raise exception 'Evidence edits require an unpublished candidate; unpublish first';
 end if;
 select count(distinct value) into selected_count from unnest(p_signal_ids) value;
 if selected_count=0 or selected_count >= (select count(*) from public.cluster_signals where cluster_id=p_cluster_id) then raise exception 'A split must move some, but not all, evidence'; end if;
 if selected_count <> (select count(*) from public.cluster_signals where cluster_id=p_cluster_id and raw_signal_id=any(p_signal_ids)) then raise exception 'Selected evidence must belong to this candidate'; end if;
 insert into public.topic_clusters(niche_id,title,normalized_terms,regions,state,editorial_stage,sensitive_flags,first_detected_at,last_checked_at)
 values(candidate.niche_id,candidate.title || ' (split)',candidate.normalized_terms,candidate.regions,'reviewing','watching',candidate.sensitive_flags,candidate.first_detected_at,now()) returning id into new_id;
 update public.cluster_signals set cluster_id=new_id where cluster_id=p_cluster_id and raw_signal_id=any(p_signal_ids);
 update public.topic_clusters set state='reviewing',editorial_stage='watching',heat=0,confidence=0,updated_at=now() where id=p_cluster_id;
 update public.stories set scheduled_for=null,reviewed_by=null,last_updated_at=now() where cluster_id=p_cluster_id;
 insert into public.review_events(cluster_id,reviewer_id,action,notes) values(p_cluster_id,p_reviewer_id,'split',new_id::text);
 return new_id;
end $$;
revoke all on function public.merge_editorial_clusters(uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function public.split_editorial_cluster(uuid,uuid[],uuid) from public,anon,authenticated;
grant execute on function public.merge_editorial_clusters(uuid,uuid,uuid) to service_role;
grant execute on function public.split_editorial_cluster(uuid,uuid[],uuid) to service_role;

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
  for due in select * from public.stories where lifecycle = 'reviewing' and scheduled_for <= now() 
  loop
    -- All editorial writers lock cluster before story; skip an edit already in progress.
    perform id from public.topic_clusters where id=due.cluster_id for update skip locked;
    if not found then continue; end if;
    select * into due from public.stories where id=due.id and lifecycle='reviewing' and scheduled_for<=now() for update skip locked;
    if not found then continue; end if;
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

create or replace function public.schedule_editorial_story(
  p_candidate_id uuid, p_reviewer_id uuid, p_draft jsonb, p_scheduled_for timestamptz
)
returns table(story_id uuid, revision integer)
language plpgsql security definer set search_path = ''
as $$
declare published record; scheduled public.stories;
begin
  perform id from public.topic_clusters where id=p_candidate_id for update;
  perform id from public.stories where cluster_id=p_candidate_id for update;
  if exists(select 1 from public.topic_clusters where id=p_candidate_id and state not in ('detected','reviewing'))
  or exists(select 1 from public.stories where cluster_id=p_candidate_id and (lifecycle in ('published_story','published_brief') or published_at is not null)) then
    raise exception 'Scheduling requires an unpublished candidate; unpublish first';
  end if;
  if p_scheduled_for <= now() then raise exception 'Scheduled publication must be in the future'; end if;
  select * into published from public.publish_editorial_story(
    p_candidate_id, p_reviewer_id, 'published_story', 'story',
    p_draft || jsonb_build_object('__scheduledFor', p_scheduled_for::text)
  );
  update public.stories set lifecycle = 'reviewing', published_at = null,
    scheduled_for = p_scheduled_for, last_updated_at = now()
    where id = published.story_id returning * into scheduled;
  update public.story_revisions set snapshot = to_jsonb(scheduled)
    where story_revisions.story_id = scheduled.id and story_revisions.revision = published.revision;
  update public.topic_clusters set state = 'reviewing', updated_at = now() where id = p_candidate_id;
  return query select scheduled.id, published.revision;
end;
$$;
