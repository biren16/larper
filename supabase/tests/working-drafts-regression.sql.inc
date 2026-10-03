-- Run inside the disposable full-schema journey after its authenticated test actor exists.
do $$
declare c uuid; reviewer uuid; result record; before_snapshot jsonb; initial_version integer; blocked boolean := false;
begin
 select id into reviewer from public.profiles limit 1;
 insert into public.topic_clusters(title,state) values('Incomplete private story','reviewing') returning id into c;
 select * into result from public.save_editorial_working_draft(c,reviewer,'{"title":"Unfinished","nicheId":"","slug":"","hook":""}',0);
 if result.revision<>1 then raise exception 'Working save did not advance version'; end if;
 if exists(select 1 from public.stories where cluster_id=c) then raise exception 'Incomplete save created a public snapshot'; end if;
 if not exists(select 1 from public.editorial_working_drafts where candidate_id=c and content->>'title'='Unfinished') then raise exception 'Working save lost writing'; end if;
 begin
  perform * from public.save_editorial_working_draft(c,reviewer,'{"title":"Stale"}',0);
 exception when others then
  if sqlerrm not like '%EDITORIAL_CONFLICT%' then raise; end if; blocked:=true;
 end;
 if not blocked then raise exception 'Stale save accepted'; end if;
 if (select content->>'title' from public.editorial_working_drafts where candidate_id=c)<>'Unfinished' then raise exception 'Conflict overwrote current writing'; end if;
 -- Existing live or approved scheduled snapshots must be byte-for-byte unchanged.
 for c,before_snapshot,initial_version in select s.cluster_id,to_jsonb(s),t.editorial_version from public.stories s join public.topic_clusters t on t.id=s.cluster_id loop
  perform * from public.save_editorial_working_draft(c,reviewer,'{"title":"Private edit","slug":"","nicheId":""}',initial_version);
  if (select to_jsonb(s) from public.stories s where cluster_id=c)<>before_snapshot then raise exception 'Working save mutated approved snapshot'; end if;
 end loop;
end; $$;
set local role anon;
do $$ begin
 begin perform 1 from public.editorial_working_drafts; raise exception 'Anonymous working draft access allowed';
 exception when insufficient_privilege then null; end;
 begin perform * from public.save_editorial_working_draft(null,null,'{}',0); raise exception 'Anonymous working mutation allowed';
 exception when insufficient_privilege then null; end;
end; $$;
reset role;
set local role authenticated;
do $$ begin
 begin perform 1 from public.editorial_working_drafts; raise exception 'Account working draft access allowed';
 exception when insufficient_privilege then null; end;
end; $$;
reset role;
-- Full versioned publication/schedule contract against a real starter's retained receipts.
do $$
declare c uuid; reviewer uuid := '00000000-0000-0000-0000-000000000401'; draft jsonb; v integer; result record; initial_slug text; original_date timestamptz; schedule timestamptz := now()+interval '1 day'; snapshot jsonb; blocked boolean:=false;
begin
 select s.cluster_id into c from public.stories s where starter_key='books';
 select value->'draft' into draft from test_starters,jsonb_array_elements(content) where value->>'key'='books';
 draft:=draft || '{"independentSourcesConfirmed":true}'::jsonb;
 select editorial_version into v from public.topic_clusters where id=c;
 select * into result from public.approve_editorial_version(c,reviewer,draft,v,'story',schedule,'schedule');
 select to_jsonb(s) into snapshot from public.stories s where cluster_id=c;
 perform * from public.save_editorial_working_draft(c,reviewer,draft || '{"title":"Private scheduled title"}'::jsonb,result.revision);
 if (select to_jsonb(s) from public.stories s where cluster_id=c)<>snapshot then raise exception 'Save changed approved scheduled version'; end if;
 begin perform * from public.save_editorial_draft(c,reviewer,draft); exception when others then if sqlerrm not like '%Approved snapshots%' then raise; end if; blocked:=true; end;
 if not blocked then raise exception 'Old app save altered schedule'; end if;
 select editorial_version into v from public.topic_clusters where id=c;
 select * into result from public.approve_editorial_version(c,reviewer,draft || '{"title":"Approved scheduled title"}'::jsonb,v,'story',null,'update_schedule');
 if (select scheduled_for from public.stories where cluster_id=c)<>schedule then raise exception 'Scheduled update changed release time'; end if;
 if (select title from public.stories where cluster_id=c)<>'Approved scheduled title' then raise exception 'Scheduled update did not approve new snapshot'; end if;
 select * into result from public.approve_editorial_version(c,reviewer,draft,result.revision,'story',null,'cancel_schedule');
 if exists(select 1 from public.stories where cluster_id=c and scheduled_for is not null) then raise exception 'Explicit schedule cancellation failed'; end if;
 select * into result from public.approve_editorial_version(c,reviewer,draft,result.revision,'story');
 select slug,published_at into initial_slug,original_date from public.stories where cluster_id=c;
 select to_jsonb(s) into snapshot from public.stories s where cluster_id=c;
 perform * from public.save_editorial_working_draft(c,reviewer,draft || '{"title":"Private live title"}'::jsonb,result.revision);
 if (select to_jsonb(s) from public.stories s where cluster_id=c)<>snapshot then raise exception 'Save changed live version'; end if;
 select editorial_version into v from public.topic_clusters where id=c;
 select * into result from public.approve_editorial_version(c,reviewer,draft || '{"title":"Approved live title","slug":"attempted-new-url"}'::jsonb,v,'story');
 if not exists(select 1 from public.stories where cluster_id=c and title='Approved live title' and slug=initial_slug and published_at=original_date) then raise exception 'Live update lost original URL/date'; end if;
 -- An approval error must leave both working/public/version untouched.
 select to_jsonb(s) into snapshot from public.stories s where cluster_id=c;
 blocked:=false;
 begin perform * from public.approve_editorial_version(c,reviewer,draft || '{"independentSourcesConfirmed":false}'::jsonb,result.revision,'story');
 exception when others then if sqlerrm not like '%confirm independent%' then raise; end if; blocked:=true; end;
 if not blocked then raise exception 'Approval bypass allowed'; end if;
 if (select to_jsonb(s) from public.stories s where cluster_id=c)<>snapshot or (select editorial_version from public.topic_clusters where id=c)<>result.revision then raise exception 'Failed approval partially committed'; end if;
end; $$;
-- Cancellation and brief publication persist current submitted writing, not only stored text.
do $$
declare c uuid; reviewer uuid := '00000000-0000-0000-0000-000000000401'; draft jsonb; working jsonb; v integer; result record;
begin
 select cluster_id into c from public.stories where starter_key='books';
 select value->'draft' into draft from test_starters,jsonb_array_elements(content) where value->>'key'='books';
 draft:=draft || '{"independentSourcesConfirmed":true}'::jsonb;
 perform public.transition_editorial_candidate(c,reviewer,'reviewing','unpublish','Isolated regression');
 select editorial_version into v from public.topic_clusters where id=c;
 select * into result from public.approve_editorial_version(c,reviewer,draft,v,'story',now()+interval '1 day','schedule');
 working:=draft || '{"hook":"New unsaved cancellation hook","lore":"New unsaved cancellation lore"}'::jsonb;
 select * into result from public.approve_editorial_version(c,reviewer,working,result.revision,'story',null,'cancel_schedule');
 if not exists(select 1 from public.editorial_working_drafts where candidate_id=c and content->>'hook'='New unsaved cancellation hook' and content->>'lore'='New unsaved cancellation lore') then raise exception 'Cancellation lost current writing'; end if;
 update public.topic_clusters set heat=85,confidence=90,sensitive_flags='{}' where id=c;
 update public.source_definitions set allowlisted=true where id in (select raw.source_definition_id from public.cluster_signals links join public.raw_signals raw on raw.id=links.raw_signal_id where links.cluster_id=c);
 select editorial_version into v from public.topic_clusters where id=c;
 working:=draft || '{"hook":"New unsaved brief hook","summary":"New full summary","lore":"New unsaved brief lore","mode":"deep-lore","discoveryType":"LORE"}'::jsonb;
 select * into result from public.approve_editorial_version(c,reviewer,
  draft - array['hook','summary','lore','whyItMatters','beginnerContext','conversationLine','mode','discoveryType'],v,'brief',null,'publish',working);
 if not exists(select 1 from public.editorial_working_drafts where candidate_id=c and content->>'hook'='New unsaved brief hook' and content->>'lore'='New unsaved brief lore' and content->>'summary'='New full summary' and content->>'mode'='deep-lore' and content->>'discoveryType'='LORE') then raise exception 'Brief replaced full current working copy'; end if;
 if not exists(select 1 from public.stories where cluster_id=c and publication_format='brief' and hook='') then raise exception 'Brief projection was not separate from working content'; end if;
 -- A reduced internal brief request still preserves previously saved long-form fields.
 select * into result from public.approve_editorial_version(c,reviewer,
  draft - array['hook','summary','lore','whyItMatters','beginnerContext','conversationLine','mode','discoveryType'],result.revision,'brief');
 if (select content->>'hook' from public.editorial_working_drafts where candidate_id=c)<>'New unsaved brief hook' then raise exception 'Reduced brief lost stored working text'; end if;
end; $$;
