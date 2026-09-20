create extension if not exists pg_trgm;
create unique index if not exists source_definitions_name_unique on public.source_definitions(lower(name));

create or replace function public.metric_total(input jsonb)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select coalesce(sum(case when value ~ '^[0-9]+(?:\.[0-9]+)?$' then value::numeric else 0 end), 0)
  from jsonb_each_text(coalesce(input, '{}'::jsonb));
$$;

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

    select clusters.id into candidate_id
    from public.topic_clusters clusters
    where clusters.state in ('detected', 'reviewing')
      and clusters.niche_id is not distinct from matched_niche
      and clusters.updated_at > now() - interval '48 hours'
      and similarity(lower(clusters.title), lower(signal.title)) >= 0.32
    order by similarity(lower(clusters.title), lower(signal.title)) desc
    limit 1;

    if candidate_id is null then
      insert into public.topic_clusters(niche_id, title, normalized_terms, regions, state, first_detected_at, last_checked_at)
      values (matched_niche, signal.title, regexp_split_to_array(lower(signal.title), '\s+'), array[signal.region], 'detected', signal.observed_at, now())
      returning id into candidate_id;
    end if;

    insert into public.cluster_signals(cluster_id, raw_signal_id, match_score, match_reasons)
    values (candidate_id, signal.id, case when matched_niche is null then 55 else 72 end, array['title_similarity', case when matched_niche is null then 'unassigned_niche' else 'niche_alias' end])
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

revoke all on function public.process_unclustered_signals() from public;
grant execute on function public.process_unclustered_signals() to service_role;
