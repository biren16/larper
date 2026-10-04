-- Collected evidence is an inbox candidate until writing begins. Preserve all snapshots and identities.
create or replace function public.list_editorial_posts(p_query jsonb default '{}') returns jsonb language sql stable security definer set search_path='' as $$
with posts as (
 select c.id,coalesce(w.content->>'title',c.title) title,nullif(coalesce(w.content->>'nicheId',c.niche_id),'') "nicheId",
 case when c.trashed_at is not null then 'trash' when s.lifecycle in ('published_story','published_brief') then 'published' when s.scheduled_for is not null then 'scheduled' when w.candidate_id is not null or s.id is not null then 'draft' else 'candidate' end status,
 greatest(c.updated_at,coalesce(w.updated_at,c.updated_at)) "lastEditedAt",c.editorial_version "editorialVersion",s.scheduled_for "scheduledFor",
 w.content->>'mediaId' "mediaId",s.slug, s.needs_review_reason "needsReview",
 s.id is not null and exists(select 1 from unnest(array['title','nicheId','slug','hook','summary','whyItMatters','lore','beginnerContext','conversationLine','mediaId','tags','discoveryType','mode','regions','freshnessLabel','evidenceSummary']) f(key) where coalesce(w.content->f.key,'null'::jsonb) is distinct from case f.key when 'nicheId' then to_jsonb(s.niche_id) when 'whyItMatters' then to_jsonb(s.why_it_matters) when 'beginnerContext' then to_jsonb(s.beginner_context) when 'conversationLine' then to_jsonb(s.conversation_line) when 'mediaId' then coalesce(to_jsonb(s.media_id),'null'::jsonb) when 'discoveryType' then to_jsonb(s.discovery_type) when 'freshnessLabel' then to_jsonb(s.freshness_label) when 'evidenceSummary' then to_jsonb(s.evidence_summary) else to_jsonb(s)->f.key end) "privateEdits"
 from public.topic_clusters c left join public.stories s on s.cluster_id=c.id left join public.editorial_working_drafts w on w.candidate_id=c.id
), filtered as (
 select * from posts where (case coalesce(p_query->>'tab','all') when 'all' then status<>'trash' when 'needs_review' then "needsReview" is not null and status='published' else status=p_query->>'tab' end)
 and (coalesce(p_query->>'search','')='' or position(lower(p_query->>'search') in lower(title))>0)
 and (coalesce(p_query->>'niche','')='' or "nicheId"=p_query->>'niche')
 and (coalesce(p_query->>'from','')='' or "lastEditedAt"::date >= (p_query->>'from')::date)
 and (coalesce(p_query->>'to','')='' or "lastEditedAt"::date <= (p_query->>'to')::date)
), page as (select * from filtered order by "lastEditedAt" desc,id limit 20 offset (greatest(1,coalesce((p_query->>'page')::integer,1))-1)*20)
select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(page)) from page),'[]'),'total',(select count(*) from filtered));
$$;
revoke all on function public.list_editorial_posts(jsonb) from public,anon,authenticated;
grant execute on function public.list_editorial_posts(jsonb) to service_role;

