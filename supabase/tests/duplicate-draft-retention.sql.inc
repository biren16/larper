begin;
do $$
declare actor uuid:='00000000-0000-0000-0000-000000000098'; original uuid; copied record;
begin
 insert into auth.users(id,email) values(actor,'duplicate-retention@example.test');
 update profiles set role='founder' where id=actor;
 original:=create_editorial_working_story(actor);
 select * into copied from manage_editorial_post(original,actor,(select editorial_version from topic_clusters where id=original),'duplicate','{}');
 perform process_unclustered_signals();
 if not exists(select 1 from topic_clusters where id=copied.candidate_id and state='reviewing') then raise exception 'Collector expired actual management duplicate';end if;
 if not exists(select 1 from editorial_working_drafts where candidate_id=copied.candidate_id) then raise exception 'Duplicate writing lost';end if;
end $$;
rollback;
