alter table public.source_definitions
  drop constraint if exists source_definitions_watchlist_beat_check;

alter table public.source_definitions
  add constraint source_definitions_watchlist_beat_check
  check (watchlist_beat in ('f1', 'books', 'music', 'tech-gaming', 'internet-culture', 'screen-culture'));

insert into public.niche_aliases (niche_id, alias, locale)
values
  ('screen-culture', 'film', 'en'),
  ('screen-culture', 'films', 'en'),
  ('screen-culture', 'movie', 'en'),
  ('screen-culture', 'movies', 'en'),
  ('screen-culture', 'cinema', 'en'),
  ('screen-culture', 'tv', 'en'),
  ('screen-culture', 'television', 'en'),
  ('screen-culture', 'series', 'en'),
  ('screen-culture', 'streaming', 'en'),
  ('screen-culture', 'show', 'en')
on conflict (niche_id, alias, locale) do nothing;
