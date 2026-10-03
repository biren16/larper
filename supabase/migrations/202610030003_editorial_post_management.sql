-- Retained identities, private history and reversible management.
alter table public.topic_clusters add column trashed_at timestamptz, add column trashed_by uuid references public.profiles(id);
alter table public.stories add column trashed_at timestamptz, add column trashed_by uuid references public.profiles(id),
 add column original_published_at timestamptz, add column original_slug text, add column needs_review_at timestamptz, add column needs_review_reason text;
update public.stories set original_published_at=published_at, original_slug=slug where published_at is not null;
update public.stories s set original_published_at=historic.published_at,original_slug=historic.slug
from (select distinct on (story_id) story_id,(snapshot->>'published_at')::timestamptz published_at,snapshot->>'slug' slug from public.story_revisions where snapshot->>'published_at' is not null and snapshot->>'scheduled_for' is null and snapshot->>'lifecycle' in ('published_story','published_brief') order by story_id,revision) historic
where s.id=historic.story_id and s.original_published_at is null;
create table public.editorial_working_revisions (
 candidate_id uuid not null references public.topic_clusters(id), revision integer not null, content jsonb not null,
 editor_id uuid references public.profiles(id), created_at timestamptz not null default now(), primary key(candidate_id,revision)
);
alter table public.editorial_working_revisions enable row level security;
revoke all on public.editorial_working_revisions from public,anon,authenticated;
grant all on public.editorial_working_revisions to service_role;
insert into public.editorial_working_revisions select candidate_id,revision,content,editor_id,updated_at from public.editorial_working_drafts;
create function public.record_working_revision() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.editorial_working_revisions(candidate_id,revision,content,editor_id) values(new.candidate_id,new.revision,new.content,new.editor_id);
 return new;
end $$;
create trigger working_revision after insert or update on public.editorial_working_drafts for each row execute function public.record_working_revision();

-- Guard all writers, including compatibility RPCs, without changing historical functions.
create function public.guard_managed_story() returns trigger language plpgsql security definer set search_path='' as $$
declare candidate public.topic_clusters;
begin
 select * into candidate from public.topic_clusters where id=new.cluster_id;
 if candidate.trashed_at is not null and (new.lifecycle in ('published_story','published_brief') or new.scheduled_for is not null) then raise exception 'Trashed posts require Restore and fresh approval'; end if;
 if tg_op='UPDATE' then
  new.original_slug:=coalesce(old.original_slug,new.original_slug);
  new.original_published_at:=coalesce(old.original_published_at,new.original_published_at);
 end if;
 if new.original_slug is not null then new.slug:=new.original_slug; end if;
 if new.original_published_at is not null and new.lifecycle in ('published_story','published_brief') then new.published_at:=new.original_published_at; end if;
 new.first_detected_at:=least(new.first_detected_at,candidate.first_detected_at);
 return new;
end $$;
create trigger managed_story_guard before insert or update on public.stories for each row execute function public.guard_managed_story();
create function public.guard_managed_working() returns trigger language plpgsql security definer set search_path='' as $$
declare locked_slug text;
begin
 if exists(select 1 from public.topic_clusters where id=new.candidate_id and trashed_at is not null) then raise exception 'Restore this post before editing'; end if;
 select original_slug into locked_slug from public.stories where cluster_id=new.candidate_id;
 if locked_slug is not null then new.content:=new.content||jsonb_build_object('slug',locked_slug); end if;
 return new;
end $$;
create trigger managed_working_guard before insert or update on public.editorial_working_drafts for each row execute function public.guard_managed_working();

create function public.manage_editorial_post(p_candidate_id uuid,p_reviewer_id uuid,p_expected_version integer,p_operation text,p_payload jsonb default '{}')
returns table(candidate_id uuid,revision integer) language plpgsql security definer set search_path='' as $$
declare c public.topic_clusters; s public.stories; working jsonb; target uuid; media text; snapshot jsonb;
begin
 select * into c from public.topic_clusters where id=p_candidate_id for update;
 if c.id is null then raise exception 'Candidate not found'; end if;
 if p_expected_version is null or c.editorial_version<>p_expected_version then raise exception 'EDITORIAL_CONFLICT: Reload before management'; end if;
 select * into s from public.stories where cluster_id=c.id for update;
 select content into working from public.editorial_working_drafts where editorial_working_drafts.candidate_id=c.id;
 target:=c.id;
 if p_operation='restore' then
  if c.trashed_at is null then raise exception 'Post is not in Trash'; end if;
  update public.topic_clusters set trashed_at=null,trashed_by=null,state='reviewing',editorial_stage='watching' where id=c.id;
  update public.stories set trashed_at=null,trashed_by=null,lifecycle='reviewing',published_at=null,scheduled_for=null,reviewed_by=null where id=s.id;
  if working is not null then update public.editorial_working_drafts set content=content||'{"independentSourcesConfirmed":false}',revision=editorial_working_drafts.revision+1,editor_id=p_reviewer_id,updated_at=now() where editorial_working_drafts.candidate_id=c.id; end if;
 elsif p_operation='trash' then
  if c.trashed_at is not null then raise exception 'Post is already in Trash'; end if;
  update public.topic_clusters set trashed_at=now(),trashed_by=p_reviewer_id,state='rejected',editorial_stage='watching' where id=c.id;
  update public.stories set trashed_at=now(),trashed_by=p_reviewer_id,lifecycle='reviewing',published_at=null,scheduled_for=null,reviewed_by=null where id=s.id;
 else
  if c.trashed_at is not null then raise exception 'Restore this post first'; end if;
  if p_operation='unpublish' then
   if s.lifecycle not in ('published_story','published_brief') then raise exception 'Post is not published'; end if;
   update public.topic_clusters set state='reviewing',editorial_stage='watching' where id=c.id;
   update public.stories set lifecycle='reviewing',published_at=null,scheduled_for=null,reviewed_by=null where id=s.id;
  elsif p_operation='cancel_schedule' then
   if s.scheduled_for is null then raise exception 'No pending schedule'; end if;
   update public.stories set scheduled_for=null,reviewed_by=null where id=s.id;
  elsif p_operation='change_niche' then
   if not exists(select 1 from public.niches where id=p_payload->>'nicheId' and status='active') then raise exception 'Choose an active niche'; end if;
   perform * from public.save_editorial_working_draft(c.id,p_reviewer_id,coalesce(working,'{}')||jsonb_build_object('nicheId',p_payload->>'nicheId'),c.editorial_version);
  elsif p_operation='restore_revision' then
   select content into snapshot from public.editorial_working_revisions r where r.candidate_id=c.id and r.revision=(p_payload->>'revision')::integer;
   if snapshot is null then raise exception 'Revision not found'; end if;
   perform * from public.save_editorial_working_draft(c.id,p_reviewer_id,snapshot||'{"independentSourcesConfirmed":false}',c.editorial_version);
  elsif p_operation='duplicate' then
   insert into public.topic_clusters(title,niche_id,state,editorial_stage,normalized_terms,regions,sensitive_flags,first_detected_at,last_checked_at)
   values(coalesce(working->>'title',c.title)||' (copy)',nullif(working->>'nicheId',''),'reviewing','watching',c.normalized_terms,c.regions,c.sensitive_flags,c.first_detected_at,c.last_checked_at) returning id into target;
   insert into public.cluster_signals(cluster_id,raw_signal_id,match_score,match_reasons) select target,raw_signal_id,match_score,match_reasons from public.cluster_signals where cluster_id=c.id;
   media:=nullif(working->>'mediaId','');
   if media is not null and not exists(select 1 from public.media_assets where id=media and (kind='larper' or commercial_use_allowed)) then media:=null; end if;
   perform * from public.save_editorial_working_draft(target,p_reviewer_id,coalesce(working,'{}')||jsonb_build_object('slug','','title',coalesce(working->>'title',c.title)||' (copy)','mediaId',media,'independentSourcesConfirmed',false),0);
  else raise exception 'Unknown management operation'; end if;
 end if;
 update public.topic_clusters set editorial_version=editorial_version+1,updated_at=now() where id=c.id;
 insert into public.review_events(cluster_id,story_id,reviewer_id,action,notes) values(c.id,s.id,p_reviewer_id,p_operation,case when target<>c.id then target::text else p_payload::text end);
 return query select target,(select editorial_version from public.topic_clusters where id=target);
end $$;
revoke all on function public.manage_editorial_post(uuid,uuid,integer,text,jsonb) from public,anon,authenticated;
grant execute on function public.manage_editorial_post(uuid,uuid,integer,text,jsonb) to service_role;

create or replace function public.reopen_stale_current_stories() returns integer language plpgsql security definer set search_path='' as $$
declare due public.stories; n integer:=0;
begin
 for due in select * from public.stories story where lifecycle='published_story' and mode='current' and published_at<=now()-interval '72 hours' and trashed_at is null and needs_review_at is null
 loop
  -- Match editorial and scheduler lock order; never block a private edit.
  perform id from public.topic_clusters where id=due.cluster_id for update skip locked;
  if not found then continue;end if;
  perform id from public.stories where id=due.id for update skip locked;
  if not found then continue;end if;
  update public.stories story set needs_review_at=now(),needs_review_reason='No available evidence observed in 36 hours; published over 72 hours ago. Add fresh evidence and approve an update.'
  where id=due.id and lifecycle='published_story' and mode='current' and published_at<=now()-interval '72 hours'
  and trashed_at is null and needs_review_at is null and not exists(select 1 from public.cluster_signals links join public.raw_signals raw on raw.id=links.raw_signal_id where links.cluster_id=story.cluster_id and raw.availability='available' and raw.observed_at>now()-interval '36 hours');
  if found then n:=n+1;end if;
 end loop;
 return n;
end $$;

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
  if candidate.trashed_at is not null then raise exception 'Restore this post before approval'; end if;
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
    first_detected_at = least(stories.first_detected_at, excluded.first_detected_at), last_checked_at = excluded.last_checked_at, published_at = now(), reviewed_by = p_reviewer_id
  returning * into published;

  if not (p_draft ? '__scheduledFor') then
    update public.stories set original_published_at=coalesce(original_published_at,published_at),original_slug=coalesce(original_slug,slug),needs_review_at=null,needs_review_reason=null where id=published.id returning * into published;
  end if;
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
create or replace function public.publish_due_stories()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  due public.stories;
  cluster_state text;
  available_source_count integer;
  credible_source_count integer;
  allowlisted_source_count integer;
  next_revision integer;
  published_count integer := 0;
  block_reason text;
begin
  for due in select * from public.stories where lifecycle = 'reviewing' and scheduled_for <= now()
  loop
    -- All editorial writers lock cluster before story; skip an edit already in progress.
    perform id from public.topic_clusters where id=due.cluster_id for update skip locked;
    if not found then continue; end if;
    select * into due from public.stories where id=due.id and lifecycle='reviewing' and scheduled_for<=now() for update skip locked;
    if not found then continue; end if;
    select state into cluster_state from public.topic_clusters where id = due.cluster_id;
    perform 1 from public.cluster_signals links join public.raw_signals raw on raw.id=links.raw_signal_id join public.source_definitions definitions on definitions.id=raw.source_definition_id where links.cluster_id=due.cluster_id for share of raw,definitions;
    select count(distinct public.source_origin_key(definitions.id, definitions.config)),
      count(distinct public.source_origin_key(definitions.id, definitions.config)) filter (where raw.trust_tier in ('primary', 'publication')),
      count(distinct public.source_origin_key(definitions.id, definitions.config)) filter (where definitions.allowlisted)
    into available_source_count, credible_source_count, allowlisted_source_count
    from public.cluster_signals links
    join public.raw_signals raw on raw.id = links.raw_signal_id
    join public.source_definitions definitions on definitions.id = raw.source_definition_id
    where links.cluster_id = due.cluster_id and raw.availability = 'available';

    block_reason := case
      when due.trashed_at is not null or exists(select 1 from public.topic_clusters where id=due.cluster_id and trashed_at is not null) then 'Post is in Trash'
      when due.publication_format='brief' and allowlisted_source_count<2 then 'Brief requires two allowlisted origins'
      when due.publication_format='brief' and exists(select 1 from public.topic_clusters where id=due.cluster_id and (heat<70 or confidence<80 or cardinality(sensitive_flags)>0)) then 'Brief no longer eligible'
      when due.media_id is not null and not exists(select 1 from public.media_assets where id=due.media_id and (kind='larper' or commercial_use_allowed)) then 'Cover rights no longer eligible'
      when cluster_state is distinct from 'reviewing' then 'Candidate is no longer under review'
      when available_source_count < 2 then 'Fewer than two available sources remain'
      when credible_source_count < 1 then 'No credible source remains'
      else null
    end;
    if block_reason is not null then
      update public.stories set scheduled_for = null, last_updated_at = now() where id = due.id;
      insert into public.review_events(cluster_id, story_id, reviewer_id, action, notes)
        values (due.cluster_id, due.id, due.reviewed_by, 'scheduled_publish_blocked', block_reason);
      continue;
    end if;

    update public.stories set lifecycle = case when publication_format = 'brief' then 'published_brief' else 'published_story' end,
      published_at = now(), scheduled_for = null, last_updated_at = now() where id = due.id returning * into due;
    update public.stories set original_published_at=coalesce(original_published_at,published_at),original_slug=coalesce(original_slug,slug),needs_review_at=null,needs_review_reason=null where id=due.id returning * into due;
    update public.topic_clusters set state = due.lifecycle, updated_at = now() where id = due.cluster_id;
    select coalesce(max(revision), 0) + 1 into next_revision from public.story_revisions where story_id = due.id;
    insert into public.story_revisions(story_id, revision, snapshot, editor_id) values (due.id, next_revision, to_jsonb(due), due.reviewed_by);
    insert into public.review_events(cluster_id, story_id, reviewer_id, action, notes)
      values (due.cluster_id, due.id, due.reviewed_by, 'scheduled_publish', 'Published automatically at the founder-approved time');
    published_count := published_count + 1;
  end loop;
  return published_count;
end;
$$;

create function public.list_editorial_posts(p_query jsonb default '{}') returns jsonb language sql stable security definer set search_path='' as $$
with posts as (
 select c.id,coalesce(w.content->>'title',c.title) title,nullif(coalesce(w.content->>'nicheId',c.niche_id),'') "nicheId",
 case when c.trashed_at is not null then 'trash' when s.lifecycle in ('published_story','published_brief') then 'published' when s.scheduled_for is not null then 'scheduled' else 'draft' end status,
 greatest(c.updated_at,coalesce(w.updated_at,c.updated_at)) "lastEditedAt",c.editorial_version "editorialVersion",s.scheduled_for "scheduledFor",
 w.content->>'mediaId' "mediaId",s.slug, s.needs_review_reason "needsReview",
 s.id is not null and exists(select 1 from jsonb_each(coalesce(w.content,'{}')) f where f.key in ('title','nicheId','slug','hook','summary','whyItMatters','lore','beginnerContext','conversationLine','mediaId','tags') and f.value is distinct from case f.key when 'nicheId' then to_jsonb(s.niche_id) when 'whyItMatters' then to_jsonb(s.why_it_matters) when 'beginnerContext' then to_jsonb(s.beginner_context) when 'conversationLine' then to_jsonb(s.conversation_line) when 'mediaId' then coalesce(to_jsonb(s.media_id),'null'::jsonb) else to_jsonb(s)->f.key end) "privateEdits"
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

alter policy "published content is publicly readable" on public.stories using (trashed_at is null and lifecycle in ('published_story','published_brief'));

-- Repeating setup must not reopen or return a discarded starter.
alter function public.prepare_starter_draft(uuid,jsonb) rename to prepare_retained_starter_draft;
revoke all on function public.prepare_retained_starter_draft(uuid,jsonb) from public,anon,authenticated,service_role;
create function public.prepare_starter_draft(p_reviewer_id uuid,p_starter jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare existing public.topic_clusters;
begin
 perform pg_advisory_xact_lock(hashtext('starter:' || (p_starter->'draft'->>'slug')));
 select c.* into existing from public.topic_clusters c join public.stories s on s.cluster_id=c.id where s.starter_key=p_starter->>'key' for update of c;
 if existing.trashed_at is not null then raise exception 'Starter is in Trash; Restore privately before continuing'; end if;
 return public.prepare_retained_starter_draft(p_reviewer_id,p_starter);
end $$;
revoke all on function public.prepare_starter_draft(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.prepare_starter_draft(uuid,jsonb) to service_role;
