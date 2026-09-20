-- Only evidence attached to a published story is publicly readable.
-- Draft clusters, operational health, and snapshot history remain server-only.
create or replace function public.is_public_story_cluster(target_cluster_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.stories
    where cluster_id = target_cluster_id
      and lifecycle in ('published_story', 'published_brief')
  );
$$;

revoke all on function public.is_public_story_cluster(uuid) from public;
grant execute on function public.is_public_story_cluster(uuid) to anon, authenticated;

create policy "published cluster evidence links are publicly readable"
on public.cluster_signals for select
using (public.is_public_story_cluster(cluster_id));

create policy "published story evidence is publicly readable"
on public.raw_signals for select
using (
  availability = 'available'
  and exists (
    select 1 from public.cluster_signals link
    where link.raw_signal_id = raw_signals.id
      and public.is_public_story_cluster(link.cluster_id)
  )
);
