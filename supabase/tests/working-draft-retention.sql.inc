-- Collector preserves incomplete private writing without keeping untouched candidates forever.
begin;
do $$
declare actor uuid:='00000000-0000-0000-0000-000000000099'; fresh uuid; duplicate uuid; untouched uuid; original timestamptz:=now()-interval '9 days';
begin
 insert into auth.users(id,email) values(actor,'retention@example.test');
 update profiles set role='founder' where id=actor;
 fresh:=create_editorial_working_story(actor);
 perform * from save_editorial_working_draft(fresh,actor,'{"title":"Incomplete working text"}',(select editorial_version from topic_clusters where id=fresh));
 -- Release one has no duplication RPC; a second working-only record models its retained snapshot.
 duplicate:=create_editorial_working_story(actor);
 perform * from save_editorial_working_draft(duplicate,actor,'{"title":"Duplicate private text"}',(select editorial_version from topic_clusters where id=duplicate));
 insert into topic_clusters(title,state,first_detected_at) values('Untouched old candidate','detected',original) returning id into untouched;
 update topic_clusters set first_detected_at=original where id in(fresh,duplicate);
 perform process_unclustered_signals();
 if exists(select 1 from topic_clusters where id in(fresh,duplicate) and state='expired') then raise exception 'Collector expired unfinished private working drafts';end if;
 if not exists(select 1 from topic_clusters where id=untouched and state='expired') then raise exception 'Untouched candidate failed to expire';end if;
 if exists(select 1 from topic_clusters where id in(fresh,duplicate) and first_detected_at<>original) then raise exception 'Collector changed first observation';end if;
 if exists(select 1 from stories where cluster_id in(fresh,duplicate)) then raise exception 'Collector published private writing';end if;
end $$;
rollback;
