-- Draft workflow state and evidence stage are separate.
-- Preserve the existing evidence assessment on save; new starters begin watching.
-- Keep the watching/rising/confirmed constraint and all publication gates intact.

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
 update public.topic_clusters set state='reviewing',updated_at=now() where id=candidate.id;
 insert into public.review_events(cluster_id,story_id,reviewer_id,action,notes)
 values(candidate.id,saved.id,p_reviewer_id,'save_draft','Private draft; publication approval still required');
 return query select saved.id,next_revision;
end;
$$;
revoke all on function public.save_editorial_draft(uuid,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.save_editorial_draft(uuid,uuid,jsonb) to service_role;

create or replace function public.prepare_starter_draft(p_reviewer_id uuid, p_starter jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare candidate_id uuid; receipt jsonb; source_id uuid; signal_id uuid; draft jsonb := p_starter->'draft'; origins text[] := '{}'; source_config jsonb;
begin
 if p_starter->>'key' not in ('music','screen-culture','style','gaming-tech','internet-culture','books','f1')
   or draft->>'nicheId' is distinct from p_starter->>'key' or draft->>'mode' is distinct from 'deep-lore'
   or jsonb_typeof(p_starter->'receipts') is distinct from 'array' or jsonb_array_length(p_starter->'receipts') <> 2 then
   raise exception 'A scoped starter requires two researched receipts';
 end if;
 perform pg_advisory_xact_lock(hashtext('starter:' || (draft->>'slug')));
 select cluster_id into candidate_id from public.stories where starter_key=p_starter->>'key';
 -- Re-registration preserves founder edits and public state.
 if candidate_id is not null then return candidate_id; end if;
 if exists(select 1 from public.stories where slug=draft->>'slug') then raise exception 'Starter slug is already used by another story'; end if;
 insert into public.topic_clusters(niche_id,title,normalized_terms,regions,state,editorial_stage,first_detected_at,last_checked_at)
 values(draft->>'nicheId',draft->>'title',regexp_split_to_array(lower(draft->>'title'),'\s+'),
 array(select jsonb_array_elements_text(draft->'regions')),'reviewing','watching',now(),now()) returning id into candidate_id;
 for receipt in select value from jsonb_array_elements(p_starter->'receipts') loop
   select id,config into source_id,source_config from public.source_definitions where config->>'presetKey'=receipt->>'presetKey';
   if source_id is null then raise exception 'Register the seven-lane source presets first'; end if;
   origins := array_append(origins,public.source_origin_key(source_id,source_config));
   signal_id := public.record_manual_signal(source_id,jsonb_build_object(
     'canonicalUrl',receipt->>'url','title',receipt->>'title','author',receipt->>'author','body',receipt->>'assessment',
     'publishedAt',receipt->>'publishedAt','observedAt',now(),'region',draft->'regions'->>0,
     'sourceType','manual','suggestedNicheId',draft->>'nicheId','metrics','{}'::jsonb,'sensitiveFlags','[]'::jsonb));
   insert into public.cluster_signals(cluster_id,raw_signal_id,match_score,match_reasons)
   values(candidate_id,signal_id,72,array['founder_selected_related_coverage']) on conflict do nothing;
 end loop;
 if (select count(distinct value) from unnest(origins) value) < 2 then raise exception 'A starter needs two distinct origins'; end if;
 if not exists(select 1 from public.cluster_signals links join public.raw_signals raw on raw.id=links.raw_signal_id
   where links.cluster_id=candidate_id and raw.trust_tier in ('primary','publication')) then raise exception 'A starter needs credible evidence'; end if;
 perform * from public.save_editorial_draft(candidate_id,p_reviewer_id,draft || '{"independentSourcesConfirmed":false}'::jsonb);
 update public.stories set starter_key=p_starter->>'key' where cluster_id=candidate_id;
 return candidate_id;
end;
$$;
revoke all on function public.prepare_starter_draft(uuid,jsonb) from public, anon, authenticated;
grant execute on function public.prepare_starter_draft(uuid,jsonb) to service_role;
