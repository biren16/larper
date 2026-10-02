-- Required before the Screen Culture alias migration on a fresh database.
-- CLI seed data is applied after migrations, so aliases cannot depend on it.
-- Keep existing founder edits and operator settings intact on upgrades.
insert into public.niches (
  id, slug, name, description, curiosity_hook, parent_category,
  related_niche_ids, origin
)
values (
  'screen-culture', 'screen-culture', 'Screen Culture',
  'Film, series, anime, creators, and the discourse around them.',
  'What are people watching into a personality?', 'Entertainment',
  array['internet-culture', 'books'], 'ingested'
)
on conflict (id) do nothing;
