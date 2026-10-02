-- Keep a removal from the public feed and its review trail in one transaction.
create or replace function public.transition_editorial_candidate(
  p_candidate_id uuid, p_reviewer_id uuid, p_state text, p_action text, p_notes text
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  candidate public.topic_clusters;
  affected_story_id uuid;
begin
  if (p_state, p_action) not in (('rejected', 'reject'), ('expired', 'expire'), ('reviewing', 'unpublish')) then
    raise exception 'Invalid editorial transition';
  end if;
  if nullif(trim(p_notes), '') is null then raise exception 'A review note is required'; end if;
  select * into candidate from public.topic_clusters where id = p_candidate_id for update;
  if candidate.id is null then raise exception 'Candidate not found'; end if;

  update public.stories set lifecycle = 'reviewing', published_at = null,
    scheduled_for = null, last_updated_at = now()
    where cluster_id = p_candidate_id returning id into affected_story_id;
  update public.topic_clusters set state = p_state, updated_at = now() where id = p_candidate_id;
  insert into public.review_events(cluster_id, story_id, reviewer_id, action, notes)
    values (p_candidate_id, affected_story_id, p_reviewer_id, p_action, trim(p_notes));
end;
$$;

revoke all on function public.transition_editorial_candidate(uuid, uuid, text, text, text) from public;
grant execute on function public.transition_editorial_candidate(uuid, uuid, text, text, text) to service_role;
