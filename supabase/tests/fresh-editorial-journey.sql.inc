insert into auth.users(id,email) values('00000000-0000-0000-0000-000000000401','founder@test.example');
do $$declare starter jsonb; candidate uuid; again uuid; source_id uuid; signal_id uuid; new_id uuid; reviewer uuid := '00000000-0000-0000-0000-000000000401'; original_links integer; begin
 for starter in select value from test_starters,jsonb_array_elements(content) loop
  candidate:=public.prepare_starter_draft(reviewer,starter);
  again:=public.prepare_starter_draft(reviewer,starter);
  if candidate<>again then raise exception 'Duplicate starter'; end if;
  perform * from public.save_editorial_draft(candidate,reviewer,starter->'draft');
  if not exists(select 1 from public.topic_clusters where id=candidate and state='reviewing' and editorial_stage='watching') then raise exception 'Wrong stage'; end if;
  perform * from public.publish_editorial_story(candidate,reviewer,'published_story','story',starter->'draft'||'{"independentSourcesConfirmed":true}'::jsonb);
  if not exists(select 1 from public.stories where cluster_id=candidate and lifecycle='published_story' and published_at is not null) then raise exception 'Publication missing'; end if;
  begin
   perform public.schedule_editorial_story(candidate,reviewer,starter->'draft'||'{"independentSourcesConfirmed":true}'::jsonb,now()+interval '1 hour');
   raise exception 'BUG: rescheduling unpublished a live story';
  exception when raise_exception then
   if sqlerrm not like '%unpublish first%' then raise; end if;
  end;
  select raw_signal_id into signal_id from public.cluster_signals where cluster_id=candidate limit 1;
  begin
   perform public.split_editorial_cluster(candidate,array[signal_id],reviewer);
   raise exception 'BUG: published split accepted';
  exception when raise_exception then
   if sqlerrm not like '%unpublished%' then raise; end if;
  end;
  perform public.transition_editorial_candidate(candidate,reviewer,'reviewing','unpublish','Staging regression');
  perform * from public.save_editorial_draft(candidate,reviewer,starter->'draft');
 end loop;
 if (select count(*) from public.stories where starter_key is not null and lifecycle='reviewing' and published_at is null)<>7 then raise exception 'Missing retained drafts'; end if;
 select cluster_id into candidate from public.stories where starter_key='music';
 select raw_signal_id into signal_id from public.cluster_signals where cluster_id=candidate limit 1;
 select count(*) into original_links from public.cluster_signals where cluster_id=candidate;
 begin
  perform public.split_editorial_cluster(candidate,array[gen_random_uuid()],reviewer);
  raise exception 'BUG: unrelated evidence accepted';
 exception when raise_exception then
  if sqlerrm not like '%belong%' then raise; end if;
 end;
 update public.stories set scheduled_for=now()+interval '1 hour',reviewed_by=reviewer where cluster_id=candidate;
 begin
  perform public.split_editorial_cluster(candidate,array[signal_id],gen_random_uuid());
  raise exception 'BUG: split audit failure accepted';
 exception when foreign_key_violation then null;
 end;
 if (select count(*) from public.cluster_signals where cluster_id=candidate)<>original_links then raise exception 'Partial split escaped rollback'; end if;
 new_id:=public.split_editorial_cluster(candidate,array[signal_id,signal_id],reviewer);
 if exists(select 1 from public.stories where cluster_id=candidate and scheduled_for is not null) then raise exception 'Split retained old schedule'; end if;
 update public.topic_clusters set sensitive_flags=array['minors'],regions=array['in'],first_detected_at='2001-01-01' where id=new_id;
 update public.stories set scheduled_for=now()+interval '1 hour',reviewed_by=reviewer where cluster_id=candidate;
 if (select count(*) from public.cluster_signals where cluster_id=new_id)<>1 then raise exception 'Wrong split evidence'; end if;
 -- Audit insert failure must roll back evidence and candidate changes as well.
 begin
  perform public.merge_editorial_clusters(candidate,new_id,gen_random_uuid());
  raise exception 'BUG: missing reviewer accepted';
 exception when foreign_key_violation then null;
 end;
 if (select count(*) from public.cluster_signals where cluster_id=new_id)<>1 then raise exception 'Partial merge escaped rollback'; end if;
 perform public.merge_editorial_clusters(candidate,new_id,reviewer);
 if (select count(*) from public.cluster_signals where cluster_id=candidate)<>original_links then raise exception 'Merge lost evidence'; end if;
 if not exists(select 1 from public.topic_clusters where id=candidate and 'minors'=any(sensitive_flags) and 'in'=any(regions) and first_detected_at='2001-01-01') then raise exception 'Merge lost review metadata'; end if;
 if exists(select 1 from public.stories where cluster_id=candidate and scheduled_for is not null) then raise exception 'Merge retained old schedule'; end if;
 if not exists(select 1 from public.stories where cluster_id=candidate and first_detected_at='2001-01-01') then raise exception 'Story lost merged first observation'; end if;
 if not exists(select 1 from public.topic_clusters where id=new_id and state='rejected') then raise exception 'Duplicate candidate not retired'; end if;
 if has_function_privilege('anon','public.merge_editorial_clusters(uuid,uuid,uuid)','EXECUTE') or has_function_privilege('authenticated','public.split_editorial_cluster(uuid,uuid[],uuid)','EXECUTE') then raise exception 'Evidence RPC exposed'; end if;
end $$;
set local role anon;
do $$begin if exists(select 1 from public.stories) then raise exception 'Private drafts exposed'; end if; end$$;
reset role;
