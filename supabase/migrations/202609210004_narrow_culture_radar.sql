alter table public.source_definitions
  add column if not exists watchlist_beat text check (watchlist_beat in ('f1', 'books', 'music', 'tech-gaming', 'internet-culture'));

alter table public.source_definitions drop constraint if exists source_definitions_adapter_type_check;
alter table public.source_definitions add constraint source_definitions_adapter_type_check
  check (adapter_type in ('rss', 'youtube', 'manual', 'trend'));

alter table public.raw_signals
  add column if not exists suggested_niche_id text references public.niches(id) on delete set null;

alter table public.topic_clusters
  add column if not exists editorial_stage text not null default 'watching'
  check (editorial_stage in ('watching', 'rising', 'confirmed'));

alter table public.stories
  add column if not exists conversation_line text not null default '';

create or replace function public.process_unclustered_signals()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  signal public.raw_signals;
  candidate_id uuid;
  matched_niche text;
  processed integer := 0;
  cluster_row record;
  source_score numeric;
  fresh_score numeric;
  momentum_score numeric;
  novelty_score numeric;
  india_score numeric;
  crossover_score numeric;
  confidence_score numeric;
begin
  for signal in
    select raw.* from public.raw_signals raw
    left join public.cluster_signals linked on linked.raw_signal_id = raw.id
    where linked.raw_signal_id is null and raw.availability = 'available' and raw.observed_at > now() - interval '7 days'
    order by raw.observed_at
  loop
    select niches.id into matched_niche
    from public.niches niches
    left join public.niche_aliases aliases on aliases.niche_id = niches.id
    where niches.status = 'active' and (
      position(lower(niches.name) in lower(signal.title || ' ' || coalesce(signal.body, ''))) > 0
      or position(lower(aliases.alias) in lower(signal.title || ' ' || coalesce(signal.body, ''))) > 0
    )
    order by length(coalesce(aliases.alias, niches.name)) desc
    limit 1;

    matched_niche := coalesce(signal.suggested_niche_id, matched_niche);

    select clusters.id into candidate_id
    from public.topic_clusters clusters
    where clusters.state in ('detected', 'reviewing')
      and clusters.niche_id is not distinct from matched_niche
      and clusters.updated_at > now() - interval '48 hours'
      and similarity(lower(clusters.title), lower(signal.title)) >= 0.32
    order by similarity(lower(clusters.title), lower(signal.title)) desc
    limit 1;

    if candidate_id is null then
      insert into public.topic_clusters(niche_id, title, normalized_terms, regions, state, editorial_stage, first_detected_at, last_checked_at)
      values (matched_niche, signal.title, regexp_split_to_array(lower(signal.title), '\s+'), array[signal.region], 'detected', 'watching', signal.observed_at, now())
      returning id into candidate_id;
    end if;

    insert into public.cluster_signals(cluster_id, raw_signal_id, match_score, match_reasons)
    values (
      candidate_id,
      signal.id,
      case when matched_niche is null then 55 else 72 end,
      array[
        'title_similarity',
        case when matched_niche is null then 'unassigned_niche' else 'niche_alias' end,
        case when signal.suggested_niche_id is null then 'automated_or_alias_match' else 'founder_selected_niche' end
      ]
    )
    on conflict do nothing;
    update public.topic_clusters set regions = array(select distinct unnest(regions || signal.region)), updated_at = now() where id = candidate_id;
    processed := processed + 1;
    candidate_id := null;
    matched_niche := null;
  end loop;

  for cluster_row in select id, niche_id from public.topic_clusters where state in ('detected', 'reviewing')
  loop
    select least(100, count(distinct raw.source_definition_id) * 25),
      greatest(0, 100 - extract(epoch from (now() - max(raw.observed_at))) / 1728),
      least(100, 50 + count(distinct raw.source_definition_id) * 10),
      least(100, count(*) filter (where lower(raw.region) in ('india', 'in')) * 35),
      case when count(*) filter (where lower(raw.region) in ('india', 'in')) > 0 and count(*) filter (where lower(raw.region) = 'global') > 0 then 100 else 30 end,
      least(100, count(distinct raw.source_definition_id) * 20 + count(distinct raw.source_definition_id) filter (where definitions.allowlisted) * 10)
    into source_score, fresh_score, novelty_score, india_score, crossover_score, confidence_score
    from public.cluster_signals links
    join public.raw_signals raw on raw.id = links.raw_signal_id
    join public.source_definitions definitions on definitions.id = raw.source_definition_id
    where links.cluster_id = cluster_row.id and raw.availability = 'available';

    with ranked as (
      select snapshots.raw_signal_id, public.metric_total(snapshots.metrics) total,
        row_number() over (partition by snapshots.raw_signal_id order by snapshots.captured_at desc) position
      from public.signal_snapshots snapshots
      join public.cluster_signals links on links.raw_signal_id = snapshots.raw_signal_id
      where links.cluster_id = cluster_row.id
    ), pairs as (
      select raw_signal_id, max(total) filter (where position = 1) latest, max(total) filter (where position = 2) previous
      from ranked where position <= 2 group by raw_signal_id
    )
    select coalesce(avg(case when previous is null or previous <= 0 then 0 else least(100, greatest(0, ((latest - previous) / previous) * 50)) end), 0)
    into momentum_score from pairs;

    update public.topic_clusters set
      momentum = coalesce(momentum_score, 0), source_diversity = coalesce(source_score, 0), freshness = coalesce(fresh_score, 0),
      novelty = coalesce(novelty_score, 0), india_relevance = coalesce(india_score, 0), crossover = coalesce(crossover_score, 0),
      heat = round((coalesce(momentum_score, 0) * .30 + coalesce(source_score, 0) * .20 + coalesce(fresh_score, 0) * .15
        + coalesce(novelty_score, 0) * .15 + coalesce(india_score, 0) * .10 + coalesce(crossover_score, 0) * .10)::numeric, 2),
      confidence = coalesce(confidence_score, 0), last_checked_at = now(), updated_at = now()
    where id = cluster_row.id;
  end loop;

  update public.topic_clusters clusters set state = 'expired', expires_at = now(), updated_at = now()
  where clusters.state in ('detected', 'reviewing') and not exists (
    select 1 from public.cluster_signals links join public.raw_signals raw on raw.id = links.raw_signal_id
    where links.cluster_id = clusters.id and raw.availability = 'available' and raw.observed_at > now() - interval '36 hours'
  );
  return processed;
end;
$$;

create or replace function public.publish_editorial_story(p_candidate_id uuid, p_reviewer_id uuid, p_lifecycle text, p_publication_format text, p_draft jsonb)
returns table(story_id uuid, revision integer)
language plpgsql security definer set search_path = ''
as $$
declare published public.stories; next_revision integer; candidate public.topic_clusters;
begin
  if p_lifecycle not in ('published_story', 'published_brief') then raise exception 'Invalid publication lifecycle'; end if;
  if p_publication_format not in ('story', 'brief') then raise exception 'Invalid publication format'; end if;
  select * into candidate from public.topic_clusters where id = p_candidate_id for update;
  if candidate.id is null then raise exception 'Candidate not found'; end if;
  insert into public.stories (cluster_id, niche_id, slug, title, hook, summary, why_it_matters, lore, beginner_context, conversation_line, discovery_type, mode, publication_format, lifecycle, regions, freshness_label, confidence, evidence_summary, signals, tags, first_detected_at, last_updated_at, last_checked_at, published_at, reviewed_by)
  values (candidate.id, p_draft->>'nicheId', p_draft->>'slug', p_draft->>'title', coalesce(p_draft->>'hook', ''), coalesce(p_draft->>'summary', ''), coalesce(p_draft->>'whyItMatters', ''), coalesce(p_draft->>'lore', ''), coalesce(p_draft->>'beginnerContext', ''), coalesce(p_draft->>'conversationLine', ''), coalesce(p_draft->>'discoveryType', 'TREND'), coalesce(p_draft->>'mode', 'current'), p_publication_format, p_lifecycle, coalesce(array(select jsonb_array_elements_text(p_draft->'regions')), '{}'), p_draft->>'freshnessLabel', candidate.confidence, p_draft->>'evidenceSummary', jsonb_build_object('momentum', candidate.momentum, 'sourceDiversity', candidate.source_diversity, 'freshness', candidate.freshness, 'novelty', candidate.novelty, 'indiaRelevance', candidate.india_relevance, 'crossover', candidate.crossover), coalesce(array(select jsonb_array_elements_text(p_draft->'tags')), '{}'), candidate.first_detected_at, now(), candidate.last_checked_at, now(), p_reviewer_id)
  on conflict (cluster_id) do update set
    niche_id = excluded.niche_id, slug = excluded.slug, title = excluded.title, hook = excluded.hook, summary = excluded.summary, why_it_matters = excluded.why_it_matters, lore = excluded.lore, beginner_context = excluded.beginner_context, conversation_line = excluded.conversation_line, discovery_type = excluded.discovery_type, mode = excluded.mode, publication_format = excluded.publication_format, lifecycle = excluded.lifecycle, regions = excluded.regions, freshness_label = excluded.freshness_label, confidence = excluded.confidence, evidence_summary = excluded.evidence_summary, signals = excluded.signals, tags = excluded.tags, last_updated_at = now(), last_checked_at = excluded.last_checked_at, published_at = now(), reviewed_by = p_reviewer_id
  returning * into published;
  select coalesce(max(story_revisions.revision), 0) + 1 into next_revision from public.story_revisions where story_revisions.story_id = published.id;
  insert into public.story_revisions(story_id, revision, snapshot, editor_id) values (published.id, next_revision, to_jsonb(published), p_reviewer_id);
  update public.topic_clusters set state = p_lifecycle, editorial_stage = 'confirmed', updated_at = now() where id = candidate.id;
  return query select published.id, next_revision;
end;
$$;
