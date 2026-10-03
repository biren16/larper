-- Private merge candidates use the identity editors currently see, not the retained cluster title.
create or replace function public.search_editorial_merge_candidates(
 p_query text default '', p_exclude_id uuid default null, p_limit integer default 50
) returns table(id uuid, title text)
language sql stable security definer set search_path=public
as $$
 select c.id, coalesce(w.content->>'title', c.title) as title
 from public.topic_clusters c
 left join public.editorial_working_drafts w on w.candidate_id=c.id
 where c.trashed_at is null and c.state in ('detected','reviewing')
   and (p_exclude_id is null or c.id<>p_exclude_id)
   and position(lower(left(trim(coalesce(p_query,'')),100)) in lower(coalesce(w.content->>'title', c.title)))>0
 order by c.last_checked_at desc, c.id
 limit greatest(1,least(coalesce(p_limit,50),50));
$$;
revoke all on function public.search_editorial_merge_candidates(text,uuid,integer) from public,anon,authenticated;
grant execute on function public.search_editorial_merge_candidates(text,uuid,integer) to service_role;
