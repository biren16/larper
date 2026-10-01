-- Final evidence check, publication, revision and audit share one database transaction.
create or replace function public.publish_editorial_story(
  p_candidate_id uuid, p_reviewer_id uuid, p_lifecycle text, p_publication_format text, p_draft jsonb
)
returns table(story_id uuid, revision integer)
language plpgsql security definer set search_path = ''
as $$
declare
  published public.stories;
  candidate public.topic_clusters;
  source_count integer;
  credible_count integer;
  allowlisted_count integer;
  next_revision integer;
  review_action text;
  review_notes text;
begin
  if p_lifecycle not in ('published_story', 'published_brief') then raise exception 'Invalid publication lifecycle'; end if;
  if p_publication_format not in ('story', 'brief') then raise exception 'Invalid publication format'; end if;
  if p_draft->>'independentSourcesConfirmed' is distinct from 'true' then
    raise exception 'Editor must confirm independent original sources';
  end if;

  select * into candidate from public.topic_clusters where id = p_candidate_id for update;
  if candidate.id is null then raise exception 'Candidate not found'; end if;
  if candidate.state not in ('detected', 'reviewing', 'published_story', 'published_brief') then
    raise exception 'Candidate cannot be published in its current state';
  end if;

  -- Hold evidence rows until commit so availability cannot change after validation.
  perform 1 from public.cluster_signals links
    join public.raw_signals raw on raw.id = links.raw_signal_id
    where links.cluster_id = p_candidate_id for share of raw;
  perform 1 from public.cluster_signals links
    join public.raw_signals raw on raw.id = links.raw_signal_id
    join public.source_definitions definitions on definitions.id = raw.source_definition_id
    where links.cluster_id = p_candidate_id for share of definitions;
  select count(distinct raw.source_definition_id),
    count(distinct raw.source_definition_id) filter (where raw.trust_tier in ('primary', 'publication')),
    count(distinct raw.source_definition_id) filter (where definitions.allowlisted)
  into source_count, credible_count, allowlisted_count
  from public.cluster_signals links
  join public.raw_signals raw on raw.id = links.raw_signal_id
  join public.source_definitions definitions on definitions.id = raw.source_definition_id
  where links.cluster_id = p_candidate_id and raw.availability = 'available';
  if source_count < 2 then raise exception 'Publication requires two available sources'; end if;
  if credible_count < 1 then raise exception 'Publication requires a credible source'; end if;
  if p_publication_format = 'brief' and (
    candidate.heat < 70 or candidate.confidence < 80 or allowlisted_count < 2
    or coalesce(array_length(candidate.sensitive_flags, 1), 0) > 0
  ) then raise exception 'Brief no longer meets publication requirements'; end if;

  insert into public.stories (
    cluster_id, niche_id, slug, title, hook, summary, why_it_matters, lore, beginner_context,
    conversation_line, discovery_type, mode, publication_format, lifecycle, regions,
    freshness_label, confidence, evidence_summary, signals, tags, first_detected_at,
    last_updated_at, last_checked_at, published_at, reviewed_by, media_id
  ) values (
    candidate.id, p_draft->>'nicheId', p_draft->>'slug', p_draft->>'title',
    coalesce(p_draft->>'hook', ''), coalesce(p_draft->>'summary', ''),
    coalesce(p_draft->>'whyItMatters', ''), coalesce(p_draft->>'lore', ''),
    coalesce(p_draft->>'beginnerContext', ''), coalesce(p_draft->>'conversationLine', ''),
    coalesce(p_draft->>'discoveryType', 'TREND'), coalesce(p_draft->>'mode', 'current'),
    p_publication_format, p_lifecycle,
    coalesce(array(select jsonb_array_elements_text(p_draft->'regions')), '{}'),
    p_draft->>'freshnessLabel', candidate.confidence, p_draft->>'evidenceSummary',
    jsonb_build_object('momentum', candidate.momentum, 'sourceDiversity', candidate.source_diversity,
      'freshness', candidate.freshness, 'novelty', candidate.novelty,
      'indiaRelevance', candidate.india_relevance, 'crossover', candidate.crossover),
    coalesce(array(select jsonb_array_elements_text(p_draft->'tags')), '{}'),
    candidate.first_detected_at, now(), candidate.last_checked_at, now(), p_reviewer_id,
    nullif(p_draft->>'mediaId', '')
  )
  on conflict (cluster_id) do update set
    niche_id = excluded.niche_id, slug = excluded.slug, title = excluded.title,
    hook = excluded.hook, summary = excluded.summary, why_it_matters = excluded.why_it_matters,
    lore = excluded.lore, beginner_context = excluded.beginner_context,
    conversation_line = excluded.conversation_line, discovery_type = excluded.discovery_type,
    mode = excluded.mode, publication_format = excluded.publication_format,
    lifecycle = excluded.lifecycle, regions = excluded.regions,
    freshness_label = excluded.freshness_label, confidence = excluded.confidence,
    evidence_summary = excluded.evidence_summary, signals = excluded.signals,
    tags = excluded.tags, media_id = excluded.media_id, last_updated_at = now(),
    last_checked_at = excluded.last_checked_at, published_at = now(), reviewed_by = p_reviewer_id
  returning * into published;

  select coalesce(max(story_revisions.revision), 0) + 1 into next_revision
  from public.story_revisions where story_revisions.story_id = published.id;
  insert into public.story_revisions(story_id, revision, snapshot, editor_id)
    values (published.id, next_revision, to_jsonb(published), p_reviewer_id);
  update public.topic_clusters set state = p_lifecycle, editorial_stage = 'confirmed', updated_at = now()
    where id = candidate.id;

  review_action := case
    when p_draft ? '__scheduledFor' then 'schedule_story'
    when p_publication_format = 'brief' then 'publish_brief'
    else 'publish_story'
  end;
  review_notes := case when review_action = 'schedule_story'
    then p_draft->>'__scheduledFor' || '; Editor confirmed independent original sources'
    else 'Editor confirmed independent original sources' end;
  insert into public.review_events(cluster_id, story_id, reviewer_id, action, notes)
    values (candidate.id, published.id, p_reviewer_id, review_action, review_notes);
  return query select published.id, next_revision;
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
