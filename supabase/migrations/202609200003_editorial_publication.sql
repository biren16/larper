-- One transaction records the published edition, immutable revision, and cluster state.
create or replace function public.publish_editorial_story(
  p_candidate_id uuid,
  p_reviewer_id uuid,
  p_lifecycle text,
  p_publication_format text,
  p_draft jsonb
)
returns table(story_id uuid, revision integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  published public.stories;
  next_revision integer;
  candidate public.topic_clusters;
begin
  if p_lifecycle not in ('published_story', 'published_brief') then raise exception 'Invalid publication lifecycle'; end if;
  if p_publication_format not in ('story', 'brief') then raise exception 'Invalid publication format'; end if;
  select * into candidate from public.topic_clusters where id = p_candidate_id for update;
  if candidate.id is null then raise exception 'Candidate not found'; end if;

  insert into public.stories (
    cluster_id, niche_id, slug, title, hook, summary, why_it_matters, lore, beginner_context,
    discovery_type, mode, publication_format, lifecycle, regions, freshness_label, confidence,
    evidence_summary, signals, tags, first_detected_at, last_updated_at, last_checked_at, published_at, reviewed_by
  ) values (
    candidate.id, p_draft->>'nicheId', p_draft->>'slug', p_draft->>'title', coalesce(p_draft->>'hook', ''),
    coalesce(p_draft->>'summary', ''), coalesce(p_draft->>'whyItMatters', ''), coalesce(p_draft->>'lore', ''),
    coalesce(p_draft->>'beginnerContext', ''), coalesce(p_draft->>'discoveryType', 'TREND'),
    coalesce(p_draft->>'mode', 'current'), p_publication_format, p_lifecycle,
    coalesce(array(select jsonb_array_elements_text(p_draft->'regions')), '{}'), p_draft->>'freshnessLabel',
    candidate.confidence, p_draft->>'evidenceSummary',
    jsonb_build_object('momentum', candidate.momentum, 'sourceDiversity', candidate.source_diversity,
      'freshness', candidate.freshness, 'novelty', candidate.novelty, 'indiaRelevance', candidate.india_relevance,
      'crossover', candidate.crossover),
    coalesce(array(select jsonb_array_elements_text(p_draft->'tags')), '{}'), candidate.first_detected_at,
    now(), candidate.last_checked_at, now(), p_reviewer_id
  )
  on conflict (cluster_id) do update set
    niche_id = excluded.niche_id, slug = excluded.slug, title = excluded.title, hook = excluded.hook,
    summary = excluded.summary, why_it_matters = excluded.why_it_matters, lore = excluded.lore,
    beginner_context = excluded.beginner_context, discovery_type = excluded.discovery_type, mode = excluded.mode,
    publication_format = excluded.publication_format, lifecycle = excluded.lifecycle, regions = excluded.regions,
    freshness_label = excluded.freshness_label, confidence = excluded.confidence,
    evidence_summary = excluded.evidence_summary, signals = excluded.signals, tags = excluded.tags,
    last_updated_at = now(), last_checked_at = excluded.last_checked_at, published_at = now(), reviewed_by = p_reviewer_id
  returning * into published;

  select coalesce(max(story_revisions.revision), 0) + 1 into next_revision
  from public.story_revisions where story_revisions.story_id = published.id;
  insert into public.story_revisions(story_id, revision, snapshot, editor_id)
  values (published.id, next_revision, to_jsonb(published), p_reviewer_id);
  update public.topic_clusters set state = p_lifecycle, updated_at = now() where id = candidate.id;
  return query select published.id, next_revision;
end;
$$;

revoke all on function public.publish_editorial_story(uuid, uuid, text, text, jsonb) from public;
grant execute on function public.publish_editorial_story(uuid, uuid, text, text, jsonb) to service_role;
