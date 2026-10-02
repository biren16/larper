-- Founder-triggered starter assembly. Receipts remain real publisher records;
-- importing never grants publication approval or fabricates popularity scores.
alter table public.stories add column if not exists starter_key text;
create unique index if not exists stories_starter_key_unique on public.stories(starter_key) where starter_key is not null;

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
 array(select jsonb_array_elements_text(draft->'regions')),'reviewing','reviewing',now(),now()) returning id into candidate_id;
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
