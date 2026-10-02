begin;
create table public.niches (
  id text primary key, slug text unique not null, name text not null,
  description text not null, curiosity_hook text not null,
  parent_category text not null, related_niche_ids text[] not null default '{}',
  status text not null default 'active', origin text not null default 'ingested'
);
create table public.niche_aliases (
  niche_id text references public.niches(id), alias text, locale text,
  unique(niche_id, alias, locale)
);
create table public.source_definitions (watchlist_beat text);

-- Exercise the real historical alias migration without loading seed.sql first.
\i supabase/migrations/202609220001_bootstrap_screen_culture.sql
\i supabase/migrations/202609220003_screen_culture_sources.sql
do $$ begin
  if (select count(*) from public.niche_aliases where niche_id='screen-culture') <> 10 then
    raise exception 'Fresh database lost Screen Culture aliases';
  end if;
end $$;

-- A repeated install must preserve existing founder content and status.
update public.niches set name='Founder screen desk', status='inactive' where id='screen-culture';
\i supabase/migrations/202609220001_bootstrap_screen_culture.sql
\i supabase/migrations/202609220003_screen_culture_sources.sql
do $$ begin
  if (select count(*) from public.niches) <> 1 or not exists (
    select 1 from public.niches where id='screen-culture'
      and name='Founder screen desk' and status='inactive'
  ) then raise exception 'Bootstrap duplicated or overwrote an existing niche'; end if;
  if (select count(*) from public.niche_aliases) <> 10 then
    raise exception 'Repeated bootstrap duplicated aliases';
  end if;
end $$;
rollback;
