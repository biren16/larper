-- Private incomplete working copies. Existing stories remain approved snapshots.
alter table public.topic_clusters add column editorial_version integer not null default 0;
create table public.editorial_working_drafts (
 candidate_id uuid primary key references public.topic_clusters(id),
 content jsonb not null check (jsonb_typeof(content) = 'object'),
 revision integer not null default 1,
 editor_id uuid references public.profiles(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.editorial_working_drafts enable row level security;
revoke all on public.editorial_working_drafts from public, anon, authenticated;
grant all on public.editorial_working_drafts to service_role;
insert into public.editorial_working_drafts(candidate_id,content,editor_id)
select cluster_id,jsonb_build_object('mediaId',media_id,'nicheId',niche_id,'slug',slug,'title',title,'hook',hook,'summary',summary,
 'whyItMatters',why_it_matters,'lore',lore,'beginnerContext',beginner_context,'conversationLine',conversation_line,
 'discoveryType',discovery_type,'mode',mode,'regions',regions,'freshnessLabel',freshness_label,'evidenceSummary',evidence_summary,
 'tags',tags,'independentSourcesConfirmed',false),reviewed_by from public.stories where cluster_id is not null;

-- Include old app and scheduler mutations in the same editorial version token.
create function public.advance_editorial_version() returns trigger language plpgsql security definer set search_path='' as $$
begin
 update public.topic_clusters set editorial_version=editorial_version+1 where id=coalesce(new.cluster_id,old.cluster_id);
 return new;
end; $$;
create trigger stories_editorial_version after insert or update on public.stories for each row execute function public.advance_editorial_version();

create function public.save_editorial_working_draft(p_candidate_id uuid,p_reviewer_id uuid,p_draft jsonb,p_expected_version integer)
returns table(story_id uuid,revision integer) language plpgsql security definer set search_path='' as $$
declare version integer; saved_revision integer;
begin
 select editorial_version into version from public.topic_clusters where id=p_candidate_id for update;
 if version is null then raise exception 'Candidate not found'; end if;
 if p_expected_version is null or p_expected_version<>version then raise exception 'EDITORIAL_CONFLICT: Reload the latest version before saving'; end if;
 if jsonb_typeof(p_draft) is distinct from 'object' then raise exception 'Invalid working content'; end if;
 if coalesce(p_draft->>'slug','')<>'' and p_draft->>'slug' !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then raise exception 'Invalid slug'; end if;
 insert into public.editorial_working_drafts(candidate_id,content,editor_id)
 values(p_candidate_id,p_draft || '{"independentSourcesConfirmed":false}'::jsonb,p_reviewer_id)
 on conflict(candidate_id) do update set content=excluded.content,editor_id=excluded.editor_id,revision=editorial_working_drafts.revision+1,updated_at=now()
 returning editorial_working_drafts.revision into saved_revision;
 update public.topic_clusters set editorial_version=editorial_version+1 where id=p_candidate_id;
 return query select p_candidate_id,version+1;
end; $$;

-- Versioned approval wrapper delegates all existing source/brief/media guards.
create function public.approve_editorial_version(p_candidate_id uuid,p_reviewer_id uuid,p_draft jsonb,p_expected_version integer,
 p_format text,p_scheduled_for timestamptz default null,p_operation text default 'publish',p_working_draft jsonb default null)
returns table(story_id uuid,revision integer) language plpgsql security definer set search_path='' as $$
declare candidate public.topic_clusters; existing public.stories; result record; target timestamptz; effective jsonb; working_content jsonb;
begin
 select * into candidate from public.topic_clusters where id=p_candidate_id for update;
 if candidate.id is null then raise exception 'Candidate not found'; end if;
 if p_expected_version is null or candidate.editorial_version<>p_expected_version then raise exception 'EDITORIAL_CONFLICT: Reload the latest version before approval'; end if;
 select * into existing from public.stories where cluster_id=p_candidate_id for update;
 if p_operation='cancel_schedule' then
  if existing.scheduled_for is null then raise exception 'No pending schedule'; end if;
  perform * from public.save_editorial_working_draft(p_candidate_id,p_reviewer_id,p_draft,p_expected_version);
  update public.stories set scheduled_for=null where id=existing.id;
  insert into public.review_events(cluster_id,story_id,reviewer_id,action,notes) values(p_candidate_id,existing.id,p_reviewer_id,'cancel_schedule','Explicit schedule cancellation');
  return query select existing.id,(select editorial_version from public.topic_clusters where id=p_candidate_id); return;
 end if;
 if p_operation not in ('publish','schedule','update_schedule') then raise exception 'Invalid approval operation'; end if;
 effective := p_draft;
 if existing.published_at is not null then effective := effective || jsonb_build_object('slug',existing.slug); end if;
 target := case when p_operation='update_schedule' then existing.scheduled_for else p_scheduled_for end;
 if p_operation in ('schedule','update_schedule') then
  if target is null then raise exception 'No pending schedule'; end if;
  select * into result from public.schedule_editorial_story(p_candidate_id,p_reviewer_id,effective,target);
 else
  select * into result from public.publish_editorial_story(p_candidate_id,p_reviewer_id,
   case when p_format='brief' then 'published_brief' else 'published_story' end,p_format,effective);
  -- Preserve the original public URL and date on live updates.
  if existing.published_at is not null then update public.stories set slug=existing.slug,published_at=existing.published_at,scheduled_for=null where id=result.story_id;
  else update public.stories set scheduled_for=null where id=result.story_id; end if;
  update public.story_revisions set snapshot=(select to_jsonb(s) from public.stories s where s.id=result.story_id)
   where story_revisions.story_id=result.story_id and story_revisions.revision=result.revision;
 end if;
 -- The brief publication projection is intentionally smaller than the editor.
 -- Current submitted writing takes priority; legacy reduced requests merge stored fields.
 if p_working_draft is not null then
   working_content := p_working_draft;
 elsif p_format = 'brief' then
   select content into working_content from public.editorial_working_drafts
     where candidate_id = p_candidate_id;
   working_content := coalesce(working_content, '{}'::jsonb) || effective;
 else
   working_content := effective;
 end if;
 insert into public.editorial_working_drafts(candidate_id,content,editor_id)
 values(p_candidate_id,working_content || '{"independentSourcesConfirmed":false}'::jsonb,p_reviewer_id)
 on conflict(candidate_id) do update set content=excluded.content,editor_id=excluded.editor_id,revision=editorial_working_drafts.revision+1,updated_at=now();
 return query select result.story_id,(select editorial_version from public.topic_clusters where id=p_candidate_id);
end; $$;
revoke all on function public.save_editorial_working_draft(uuid,uuid,jsonb,integer), public.approve_editorial_version(uuid,uuid,jsonb,integer,text,timestamptz,text,jsonb) from public,anon,authenticated;
grant execute on function public.save_editorial_working_draft(uuid,uuid,jsonb,integer), public.approve_editorial_version(uuid,uuid,jsonb,integer,text,timestamptz,text,jsonb) to service_role;
create function public.transition_editorial_version(p_candidate_id uuid,p_reviewer_id uuid,p_state text,p_action text,p_notes text,p_expected_version integer)
returns void language plpgsql security definer set search_path='' as $$
declare version integer;
begin
 select editorial_version into version from public.topic_clusters where id=p_candidate_id for update;
 if version is null then raise exception 'Candidate not found'; end if;
 if p_expected_version is null or version<>p_expected_version then raise exception 'EDITORIAL_CONFLICT: Reload before changing lifecycle'; end if;
 perform public.transition_editorial_candidate(p_candidate_id,p_reviewer_id,p_state,p_action,p_notes);
 update public.topic_clusters set editorial_version=editorial_version+1 where id=p_candidate_id;
end; $$;
revoke all on function public.transition_editorial_version(uuid,uuid,text,text,text,integer) from public,anon,authenticated;
grant execute on function public.transition_editorial_version(uuid,uuid,text,text,text,integer) to service_role;
create function public.create_editorial_working_story(p_reviewer_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare candidate uuid;
begin
 insert into public.topic_clusters(title,state) values('Untitled story','reviewing') returning id into candidate;
 perform * from public.save_editorial_working_draft(candidate,p_reviewer_id,
 '{"title":"Untitled story","nicheId":"","slug":"","hook":"","summary":"","whyItMatters":"","lore":"","beginnerContext":"","conversationLine":"","discoveryType":"TREND","mode":"current","regions":["india","global"],"freshnessLabel":"","evidenceSummary":"","tags":[],"independentSourcesConfirmed":false}',0);
 return candidate;
end; $$;
revoke all on function public.create_editorial_working_story(uuid) from public,anon,authenticated;
grant execute on function public.create_editorial_working_story(uuid) to service_role;
-- Keep the previous app signature usable for unpublished drafts during rollback,
-- but never let its old Save control overwrite an approved scheduled snapshot.
alter function public.save_editorial_draft(uuid,uuid,jsonb) rename to save_editorial_legacy_draft;
revoke all on function public.save_editorial_legacy_draft(uuid,uuid,jsonb) from public,anon,authenticated,service_role;
create function public.save_editorial_draft(p_candidate_id uuid,p_reviewer_id uuid,p_draft jsonb)
returns table(story_id uuid,revision integer) language plpgsql security definer set search_path='' as $$
declare result record;
begin
 perform 1 from public.topic_clusters where id=p_candidate_id for update;
 if exists(select 1 from public.stories where cluster_id=p_candidate_id and
  (scheduled_for is not null or published_at is not null or lifecycle in ('published_story','published_brief'))) then
  raise exception 'Approved snapshots require the working draft editor';
 end if;
 select * into result from public.save_editorial_legacy_draft(p_candidate_id,p_reviewer_id,p_draft);
 insert into public.editorial_working_drafts(candidate_id,content,editor_id) values(p_candidate_id,p_draft || '{"independentSourcesConfirmed":false}'::jsonb,p_reviewer_id)
 on conflict(candidate_id) do update set content=excluded.content,editor_id=excluded.editor_id,revision=editorial_working_drafts.revision+1,updated_at=now();
 return query select result.story_id,result.revision;
end; $$;
revoke all on function public.save_editorial_draft(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.save_editorial_draft(uuid,uuid,jsonb) to service_role;
