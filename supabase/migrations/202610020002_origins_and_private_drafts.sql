-- Publisher/profile identity is shared by publication and scheduling gates.
create or replace function public.source_origin_key(p_id uuid, p_config jsonb)
returns text language sql immutable set search_path = '' as $$
 select coalesce(nullif(btrim(p_config->>'originKey'), ''),
   case when p_config->>'url' ~ '^https?://' then 'publisher:' ||
     regexp_replace(regexp_replace(lower(split_part(regexp_replace(p_config->>'url', '^https?://', ''), '/', 1)), '^www\.', ''), ':\d+$', '')
   when nullif(p_config->>'channelId','') is not null then 'creator:https://youtube.com/channel/' || (p_config->>'channelId')
   else 'source:' || p_id::text end);
$$;
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
  select count(distinct public.source_origin_key(definitions.id, definitions.config)),
    count(distinct public.source_origin_key(definitions.id, definitions.config)) filter (where raw.trust_tier in ('primary', 'publication')),
    count(distinct public.source_origin_key(definitions.id, definitions.config)) filter (where definitions.allowlisted)
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


create or replace function public.save_editorial_draft(p_candidate_id uuid, p_reviewer_id uuid, p_draft jsonb)
returns table(story_id uuid, revision integer)
language plpgsql security definer set search_path = '' as $$
declare candidate public.topic_clusters; saved public.stories; existing public.stories; next_revision integer;
begin
 select * into candidate from public.topic_clusters where id = p_candidate_id for update;
 if candidate.id is null then raise exception 'Candidate not found'; end if;
 select * into existing from public.stories where cluster_id = p_candidate_id for update;
 if candidate.state not in ('detected','reviewing') or existing.lifecycle in ('published_story','published_brief') or existing.published_at is not null then
   raise exception 'Draft saves require an unpublished candidate';
 end if;
 if exists(select 1 from unnest(array['nicheId','slug','title','hook','summary','whyItMatters','lore','beginnerContext','conversationLine','freshnessLabel','evidenceSummary']) field
   where jsonb_typeof(p_draft->field) is distinct from 'string' or coalesce(length(btrim(p_draft->>field)),0) = 0)
   or p_draft->>'slug' !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
   or jsonb_typeof(p_draft->'regions') is distinct from 'array' or jsonb_array_length(p_draft->'regions') = 0 then
   raise exception 'Complete the required draft fields, slug and regions';
 end if;
 insert into public.stories(cluster_id,niche_id,slug,title,hook,summary,why_it_matters,lore,beginner_context,conversation_line,
   discovery_type,mode,publication_format,lifecycle,regions,freshness_label,confidence,evidence_summary,signals,tags,
   first_detected_at,last_updated_at,last_checked_at,published_at,reviewed_by,media_id,scheduled_for)
 values(candidate.id,p_draft->>'nicheId',p_draft->>'slug',p_draft->>'title',p_draft->>'hook',p_draft->>'summary',
   p_draft->>'whyItMatters',p_draft->>'lore',p_draft->>'beginnerContext',p_draft->>'conversationLine',p_draft->>'discoveryType',p_draft->>'mode',
   'story','reviewing',array(select jsonb_array_elements_text(p_draft->'regions')),p_draft->>'freshnessLabel',candidate.confidence,
   p_draft->>'evidenceSummary','{}',array(select jsonb_array_elements_text(coalesce(p_draft->'tags','[]'))),candidate.first_detected_at,
   now(),candidate.last_checked_at,null,null,nullif(p_draft->>'mediaId',''),null)
 on conflict(cluster_id) do update set niche_id=excluded.niche_id,slug=excluded.slug,title=excluded.title,hook=excluded.hook,
   summary=excluded.summary,why_it_matters=excluded.why_it_matters,lore=excluded.lore,beginner_context=excluded.beginner_context,
   conversation_line=excluded.conversation_line,discovery_type=excluded.discovery_type,mode=excluded.mode,
   publication_format='story',lifecycle='reviewing',regions=excluded.regions,freshness_label=excluded.freshness_label,
   evidence_summary=excluded.evidence_summary,tags=excluded.tags,media_id=excluded.media_id,last_updated_at=now(),
   published_at=null,reviewed_by=null,scheduled_for=null
 returning * into saved;
 select coalesce(max(r.revision),0)+1 into next_revision from public.story_revisions r where r.story_id=saved.id;
 insert into public.story_revisions(story_id,revision,snapshot,editor_id) values(saved.id,next_revision,to_jsonb(saved),p_reviewer_id);
 update public.topic_clusters set state='reviewing',editorial_stage='reviewing',updated_at=now() where id=candidate.id;
 insert into public.review_events(cluster_id,story_id,reviewer_id,action,notes)
 values(candidate.id,saved.id,p_reviewer_id,'save_draft','Private draft; publication approval still required');
 return query select saved.id,next_revision;
end;
$$;
revoke all on function public.save_editorial_draft(uuid,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.save_editorial_draft(uuid,uuid,jsonb) to service_role;

create or replace function public.keep_first_observation()
returns trigger language plpgsql set search_path = '' as $$
begin new.observed_at := old.observed_at; return new; end;
$$;
create trigger raw_signal_first_observation before update on public.raw_signals
 for each row execute function public.keep_first_observation();

create or replace function public.record_manual_signal(p_source_id uuid, p_signal jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare source public.source_definitions; signal_id uuid; observation_time timestamptz; host text;
begin
 select * into source from public.source_definitions where id=p_source_id for share;
 if source.id is null then raise exception 'Select a registered publisher or creator'; end if;
 host := lower(split_part(regexp_replace(p_signal->>'canonicalUrl','^https?://',''), '/', 1));
 if p_signal->>'canonicalUrl' !~ '^https?://' or not exists(select 1 from jsonb_array_elements_text(coalesce(source.config->'domains','[]')) domain
   where host=domain or host like '%.' || domain) then raise exception 'URL does not belong to the selected publisher or creator'; end if;
 observation_time := (p_signal->>'observedAt')::timestamptz;
 insert into public.raw_signals(source_definition_id,canonical_url,source_type,source_name,title,author,body,locale,region,
   published_at,observed_at,trust_tier,availability,metrics,sensitive_flags,suggested_niche_id)
 values(source.id,p_signal->>'canonicalUrl',p_signal->>'sourceType',source.name,p_signal->>'title',p_signal->>'author',p_signal->>'body',
   source.locale,coalesce(nullif(p_signal->>'region',''),source.region),(p_signal->>'publishedAt')::timestamptz,observation_time,
   case when source.config->>'creatorProfileUrl' is not null then 'watchlist' else source.trust_tier end,
   'available',coalesce(p_signal->'metrics','{}'),array(select jsonb_array_elements_text(coalesce(p_signal->'sensitiveFlags','[]'))),p_signal->>'suggestedNicheId')
 on conflict(source_definition_id,canonical_url) do update set title=excluded.title,author=excluded.author,body=excluded.body,
   locale=excluded.locale,region=excluded.region,published_at=excluded.published_at,trust_tier=excluded.trust_tier,
   availability=excluded.availability,metrics=excluded.metrics,sensitive_flags=excluded.sensitive_flags,suggested_niche_id=excluded.suggested_niche_id
 returning id into signal_id;
 insert into public.signal_snapshots(raw_signal_id,metrics,captured_at) values(signal_id,coalesce(p_signal->'metrics','{}'),observation_time)
 on conflict(raw_signal_id,captured_at) do update set metrics=excluded.metrics;
 return signal_id;
end;
$$;
revoke all on function public.record_manual_signal(uuid,jsonb) from public, anon, authenticated;
grant execute on function public.record_manual_signal(uuid,jsonb) to service_role;

create unique index if not exists source_definitions_creator_origin_unique
 on public.source_definitions ((config->>'originKey')) where config->>'creatorProfileUrl' is not null;
create or replace function public.register_manual_creator(p_profile_url text,p_name text,p_domain text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare found_id uuid; identity_key text := 'creator:' || p_profile_url;
begin
 perform pg_advisory_xact_lock(hashtext(identity_key));
 select id into found_id from public.source_definitions where config->>'originKey'=identity_key;
 if found_id is not null then return found_id; end if;
 insert into public.source_definitions(name,adapter_type,trust_tier,config,locale,region,poll_minutes,allowlisted,active,watchlist_beat)
 values(p_name,'manual','watchlist',jsonb_build_object('originKey',identity_key,'creatorProfileUrl',p_profile_url,'url',p_profile_url,
   'owner',p_name,'domains',jsonb_build_array(p_domain)),'en','global',180,false,false,'internet-culture') returning id into found_id;
 return found_id;
end;
$$;
revoke all on function public.register_manual_creator(text,text,text) from public, anon, authenticated;
grant execute on function public.register_manual_creator(text,text,text) to service_role;
