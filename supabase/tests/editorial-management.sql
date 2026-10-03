-- Tests real transactions on isolated rows; every assertion rolls back on failure.
insert into auth.users(id,email) values('00000000-0000-0000-0000-000000000091','management@example.test');
update profiles set role='founder' where id='00000000-0000-0000-0000-000000000091';
do $$
declare actor uuid:='00000000-0000-0000-0000-000000000091'; candidate uuid; copy uuid; v integer; result record;
begin
 candidate:=public.create_editorial_working_story(actor);
 select editorial_version into v from topic_clusters where id=candidate;
 perform * from public.manage_editorial_post(candidate,actor,v,'trash','{}');
 if not exists(select 1 from topic_clusters where id=candidate and trashed_at is not null and trashed_by=actor and state='rejected') then raise exception 'Trash missing atomic actor/state'; end if;
 begin perform * from public.manage_editorial_post(candidate,actor,v,'restore','{}'); raise exception 'Stale restore accepted'; exception when others then if sqlerrm not like '%EDITORIAL_CONFLICT%' then raise; end if; end;
 select editorial_version into v from topic_clusters where id=candidate;
 perform * from public.manage_editorial_post(candidate,actor,v,'restore','{}');
 if not exists(select 1 from topic_clusters where id=candidate and trashed_at is null and state='reviewing') then raise exception 'Restore not private'; end if;
 select editorial_version into v from topic_clusters where id=candidate;
 select * into result from public.manage_editorial_post(candidate,actor,v,'duplicate','{}'); copy:=result.candidate_id;
 if copy=candidate or not exists(select 1 from editorial_working_drafts where candidate_id=copy and content->>'slug'='' and content->>'independentSourcesConfirmed'='false') then raise exception 'Duplicate reset missing'; end if;
 select editorial_version into v from topic_clusters where id=candidate;
 perform * from public.manage_editorial_post(candidate,actor,v,'change_niche','{"nicheId":"books"}');
 if not exists(select 1 from editorial_working_drafts where candidate_id=candidate and content->>'nicheId'='books') then raise exception 'Private niche missing'; end if;
 if not exists(select 1 from editorial_working_revisions where candidate_id=candidate) then raise exception 'Private revision history missing'; end if;
 select editorial_version into v from topic_clusters where id=candidate;
 perform * from manage_editorial_post(candidate,actor,v,'restore_revision','{"revision":1}');
 if not exists(select 1 from editorial_working_drafts where candidate_id=candidate and content->>'nicheId'='' and content->>'independentSourcesConfirmed'='false') then raise exception 'Revision restoration did not stay private';end if;
end $$;
commit;
begin;
create temporary table management_ids(kind text,id uuid);
do $$
declare actor uuid:='00000000-0000-0000-0000-000000000091'; c uuid; c2 uuid; source1 uuid;source2 uuid;signal1 uuid;signal2 uuid;s public.stories;v integer;r record;content jsonb;original_date timestamptz;earliest timestamptz:=now()-interval '14 days';field_name text;changed jsonb;approved jsonb;
begin
 insert into source_definitions(name,adapter_type,trust_tier,config,allowlisted) values('One','manual','primary','{"originKey":"publisher:one.example"}',true) returning id into source1;
 insert into source_definitions(name,adapter_type,trust_tier,config,allowlisted) values('Two','manual','publication','{"originKey":"publisher:two.example"}',true) returning id into source2;
 insert into raw_signals(source_definition_id,canonical_url,source_type,source_name,title,published_at,observed_at,trust_tier) values(source1,'https://one.example/post','rss','One','First',now(),now()-interval '40 hours','primary') returning id into signal1;
 insert into raw_signals(source_definition_id,canonical_url,source_type,source_name,title,published_at,observed_at,trust_tier) values(source2,'https://two.example/post','rss','Two','Second',now(),now()-interval '40 hours','publication') returning id into signal2;
 c:=create_editorial_working_story(actor); c2:=create_editorial_working_story(actor);
 update topic_clusters set niche_id='books',first_detected_at=now()-interval '7 days',heat=90,confidence=90 where id=c;
 update topic_clusters set niche_id='books',first_detected_at=earliest where id=c2;
 insert into cluster_signals(cluster_id,raw_signal_id,match_score) values(c,signal1,80),(c2,signal2,80);
 content:='{"title":"Management public post","nicheId":"books","slug":"management-public-post","hook":"Hook","summary":"Summary","whyItMatters":"Why","lore":"Lore","beginnerContext":"Context","conversationLine":"Line","discoveryType":"TREND","mode":"current","regions":["global"],"freshnessLabel":"Live","evidenceSummary":"Two independent reports","tags":[],"independentSourcesConfirmed":true}';
 -- Existing draft story timestamp and cluster must converge through merge and publication.
 perform * from save_editorial_draft(c,actor,content);
 perform merge_editorial_clusters(c,c2,actor);
 select editorial_version into v from topic_clusters where id=c;
 select * into r from approve_editorial_version(c,actor,content,v,'story');
 select * into s from stories where cluster_id=c; original_date:=s.published_at;
 if s.first_detected_at<>earliest then raise exception 'Merge earliest observation lost on publication'; end if;
 if s.original_slug<>s.slug or s.original_published_at<>s.published_at then raise exception 'Public identity not captured'; end if;
 insert into management_ids values('published',s.id);
 insert into saves(user_id,story_id) values(actor,s.id);
 -- A change in any previously omitted publishable field must mark private edits.
 approved:=to_jsonb(s);
 foreach field_name in array array['discoveryType','mode','regions','freshnessLabel','evidenceSummary'] loop
  changed:=case field_name when 'discoveryType' then '"LORE"'::jsonb when 'mode' then '"deep-lore"'::jsonb when 'regions' then '["india"]'::jsonb when 'freshnessLabel' then '"Private freshness"'::jsonb else '"Private evidence assessment"'::jsonb end;
  select editorial_version into v from topic_clusters where id=c;
  perform * from save_editorial_working_draft(c,actor,jsonb_set(content,array[field_name],changed),v);
  if not exists(select 1 from jsonb_array_elements(list_editorial_posts('{}')->'items') p where p->>'id'=c::text and p->>'privateEdits'='true') then raise exception 'Private edit marker omitted field %',field_name;end if;
  if (select to_jsonb(story) from stories story where id=s.id)<>approved then raise exception 'Working-only % change modified approved snapshot',field_name;end if;
  select editorial_version into v from topic_clusters where id=c;
  perform * from save_editorial_working_draft(c,actor,content,v);
  if not exists(select 1 from jsonb_array_elements(list_editorial_posts('{}')->'items') p where p->>'id'=c::text and p->>'privateEdits'='false') then raise exception 'Private edit marker did not reset after % matched approval',field_name;end if;
 end loop;

 select editorial_version into v from topic_clusters where id=c;
 perform * from manage_editorial_post(c,actor,v,'change_niche','{"nicheId":"music"}');
 if (select niche_id from stories where id=s.id)<>'books' then raise exception 'Private niche mutated public snapshot'; end if;
 if not exists(select 1 from jsonb_array_elements(list_editorial_posts('{"search":"Management public post","niche":"music"}') ->'items') p where p->>'id'=c::text and p->>'privateEdits'='true') then raise exception 'Posts filters miss working niche'; end if;
 select editorial_version into v from topic_clusters where id=c;
 select * into r from manage_editorial_post(c,actor,v,'duplicate','{}');
 if (select count(*) from cluster_signals where cluster_id=r.candidate_id)<>2 or exists(select 1 from stories where cluster_id=r.candidate_id) then raise exception 'Duplicate evidence/approval identity incorrect';end if;
 select editorial_version into v from topic_clusters where id=c;
 perform * from manage_editorial_post(c,actor,v,'unpublish','{}');
 select editorial_version into v from topic_clusters where id=c;
 perform * from save_editorial_working_draft(c,actor,content||'{"slug":"changed-slug"}',v);
 if (select w.content->>'slug' from editorial_working_drafts w where candidate_id=c)<>'management-public-post' then raise exception 'Unpublished slug unlocked'; end if;
 select editorial_version into v from topic_clusters where id=c;
 perform * from approve_editorial_version(c,actor,content||'{"slug":"changed-slug"}',v,'story');
 if not exists(select 1 from stories where id=s.id and slug='management-public-post' and published_at=original_date) then raise exception 'Republish identity changed'; end if;
 select editorial_version into v from topic_clusters where id=c;
 perform * from manage_editorial_post(c,actor,v,'trash','{}');
 if not exists(select 1 from saves where story_id=s.id) or (select count(*) from cluster_signals where cluster_id=c)<>2 then raise exception 'Trash deleted retained references'; end if;
 begin perform * from publish_editorial_story(c,actor,'published_story','story',content);raise exception 'Trash published';exception when others then if sqlerrm not like '%Restore%' then raise;end if;end;
 select editorial_version into v from topic_clusters where id=c;
 perform * from manage_editorial_post(c,actor,v,'restore','{}');
 select editorial_version into v from topic_clusters where id=c;
 perform * from approve_editorial_version(c,actor,content,v,'story');
 if (select published_at from stories where id=s.id)<>original_date then raise exception 'Restored publication date changed'; end if;
 -- Ageing retains detail lifecycle/date and mode, adding a separate review flag.
 update stories set original_published_at=original_published_at where id=s.id;
 -- Use an isolated aged published record since original dates are immutable.
 c2:=create_editorial_working_story(actor);
 insert into stories(cluster_id,niche_id,slug,title,hook,summary,why_it_matters,lore,beginner_context,conversation_line,discovery_type,mode,publication_format,lifecycle,freshness_label,evidence_summary,published_at,reviewed_by)
 values(c2,'books','aged-management','Aged','H','S','W','L','B','C','TREND','current','story','published_story','Old','Old evidence',now()-interval '80 hours',actor) returning id into s.id;
 insert into management_ids values('aged',s.id);
 perform reopen_stale_current_stories();
 if not exists(select 1 from stories where id=s.id and needs_review_at is not null and lifecycle='published_story' and mode='current' and published_at is not null) then raise exception 'Ageing hid public detail or changed classification'; end if;
 -- Deep lore never receives the current-age flag.
 update stories set needs_review_at=null,mode='deep-lore' where id=s.id;
 perform reopen_stale_current_stories();
 if (select needs_review_at from stories where id=s.id) is not null then raise exception 'Deep lore incorrectly aged'; end if;
 -- A founder-approved release is blocked when an origin loses availability.
 select editorial_version into v from topic_clusters where id=c;
 perform * from manage_editorial_post(c,actor,v,'unpublish','{}');
 select editorial_version into v from topic_clusters where id=c;
 perform * from approve_editorial_version(c,actor,content,v,'story',now()+interval '1 hour','schedule');
 update stories set scheduled_for=now()-interval '1 minute' where cluster_id=c;
 update raw_signals set availability='deleted' where id=signal2;
 if publish_due_stories()<>0 then raise exception 'Ineligible scheduled post published';end if;
 if not exists(select 1 from review_events where cluster_id=c and action='scheduled_publish_blocked') then raise exception 'Scheduler reason not recorded';end if;
 -- Trash must cancel an existing schedule atomically.
 update raw_signals set availability='available' where id=signal2;
 select editorial_version into v from topic_clusters where id=c;
 perform * from approve_editorial_version(c,actor,content,v,'story',now()+interval '1 hour','schedule');
 select editorial_version into v from topic_clusters where id=c;
 perform * from manage_editorial_post(c,actor,v,'trash','{}');
 if exists(select 1 from stories where cluster_id=c and scheduled_for is not null) or publish_due_stories()<>0 then raise exception 'Trash schedule retained'; end if;
 approved:=(select to_jsonb(cluster) from topic_clusters cluster where id=c);
 insert into raw_signals(source_definition_id,canonical_url,source_type,source_name,title,published_at,observed_at,trust_tier,suggested_niche_id)
 values(source1,'https://one.example/after-trash','rss','One',(select title from topic_clusters where id=c),now(),now(),'primary','books') returning id into signal1;
 perform process_unclustered_signals();
 if exists(select 1 from cluster_signals where cluster_id=c and raw_signal_id=signal1) then raise exception 'Ingestion reused Trash candidate';end if;
 if (select to_jsonb(cluster) from topic_clusters cluster where id=c)<>approved then raise exception 'Ingestion rescored or changed Trash';end if;

end $$;
-- PostgreSQL API-role evidence: only the deep-lore published detail remains visible.
grant usage on schema public to anon,authenticated;
grant select on public.stories to anon,authenticated;
grant select on management_ids to anon,authenticated;
set local role anon;
do $$ begin
 if exists(select 1 from stories where id=(select id from management_ids where kind='published')) then raise exception 'Anonymous Trash leak';end if;
 if not exists(select 1 from stories where id=(select id from management_ids where kind='aged')) then raise exception 'Published detail missing';end if;
 if has_table_privilege(current_user,'public.editorial_working_drafts','SELECT') or has_table_privilege(current_user,'public.editorial_working_revisions','SELECT') then raise exception 'Private content grant leaked';end if;
end $$;
reset role;
create or replace function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000091',true);
grant select on public.saves to authenticated;
set local role authenticated;
do $$ begin
 if (select count(*) from saves where story_id=(select id from management_ids where kind='published'))<>1 then raise exception 'Account save was lost';end if;
 if exists(select 1 from saves saved join stories story on story.id=saved.story_id where story.id=(select id from management_ids where kind='published')) then raise exception 'Saved content leaked through account join';end if;
 if exists(select 1 from stories where id=(select id from management_ids where kind='published')) then raise exception 'Account Trash leak';end if;end $$;
reset role;
rollback;

-- Merge choices/search use the current private title, with a fallback for legacy clusters.
do $$
declare actor uuid:='00000000-0000-0000-0000-000000000091'; c uuid; legacy uuid; v integer;
begin
 c:=create_editorial_working_story(actor);
 select editorial_version into v from topic_clusters where id=c;
 update topic_clusters set title='Historical cluster title' where id=c;
 perform * from save_editorial_working_draft(c,actor,'{"title":"Renamed 50% working story"}',v);
 if not exists(select 1 from search_editorial_merge_candidates('Renamed 50%',null,50) x where x.id=c and x.title='Renamed 50% working story') then raise exception 'Current working title not searchable'; end if;
 if exists(select 1 from search_editorial_merge_candidates('Historical cluster',null,50) x where x.id=c) then raise exception 'Historical title incorrectly searched'; end if;
 if exists(select 1 from search_editorial_merge_candidates('Renamed',c,50) x where x.id=c) then raise exception 'Current candidate not excluded'; end if;
 if not exists(select 1 from search_editorial_merge_candidates('',null,50) x where x.id=c and x.title='Renamed 50% working story') then raise exception 'Initial choices use stale title'; end if;
 insert into topic_clusters(title,state) values('Legacy title fallback','reviewing') returning id into legacy;
 if not exists(select 1 from search_editorial_merge_candidates('Legacy title fallback',null,50) x where x.id=legacy) then raise exception 'Legacy title fallback not searchable'; end if;
 update topic_clusters set trashed_at=now() where id=c;
 if exists(select 1 from search_editorial_merge_candidates('Renamed',null,50) x where x.id=c) then raise exception 'Trash leaked into search'; end if;
 if has_function_privilege('anon','public.search_editorial_merge_candidates(text,uuid,integer)','EXECUTE') or has_function_privilege('authenticated','public.search_editorial_merge_candidates(text,uuid,integer)','EXECUTE') then raise exception 'Private merge search exposed to readers'; end if;
 if not has_function_privilege('service_role','public.search_editorial_merge_candidates(text,uuid,integer)','EXECUTE') then raise exception 'Editorial service search unavailable'; end if;
end $$;

set role service_role;
do $$ begin
 if not exists(select 1 from public.search_editorial_merge_candidates('Legacy title fallback',null,50)) then raise exception 'Service role cannot execute private merge search'; end if;
end $$;
reset role;
