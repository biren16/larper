insert into public.niches (id, slug, name, description, curiosity_hook, parent_category, related_niche_ids, origin)
values
  ('internet-culture', 'internet-culture', 'Internet Culture', 'Memes, formats, slang, and online behavior with measurable movement.', 'Which joke escaped its original group chat?', 'Internet', array['gaming-tech', 'screen-culture'], 'ingested'),
  ('books', 'books', 'Books', 'Reading communities, publishing crossovers, adaptations, and breakout shelves.', 'What is suddenly filling reading lists?', 'Culture', array['f1', 'screen-culture'], 'ingested'),
  ('f1', 'f1', 'F1', 'Motorsport fandom, paddock culture, explainers, and crossover moments.', 'What moved beyond race weekend?', 'Sports', array['books', 'style'], 'ingested'),
  ('style', 'style', 'Style', 'Clothes, sneakers, beauty, and visual codes moving between communities.', 'Which look is crossing feeds?', 'Style', array['music', 'internet-culture'], 'ingested'),
  ('music', 'music', 'Music', 'Songs, scenes, fan behavior, live moments, and sounds gaining velocity.', 'Which sound is becoming a world?', 'Culture', array['style', 'screen-culture'], 'ingested'),
  ('screen-culture', 'screen-culture', 'Screen Culture', 'Film, series, anime, creators, and the discourse around them.', 'What are people watching into a personality?', 'Entertainment', array['internet-culture', 'books'], 'ingested'),
  ('gaming-tech', 'gaming-tech', 'Gaming & Tech', 'Games, devices, platforms, and the communities that give them meaning.', 'Which tool became a subculture?', 'Technology', array['internet-culture', 'music'], 'ingested'),
  ('food-places', 'food-places', 'Food & Places', 'Dishes, cafés, neighborhoods, and travel micro-scenes with cultural pull.', 'Where is everyone suddenly going?', 'Food', array['style', 'music'], 'ingested')
on conflict (id) do update set name = excluded.name, description = excluded.description, curiosity_hook = excluded.curiosity_hook,
  parent_category = excluded.parent_category, related_niche_ids = excluded.related_niche_ids, status = 'active', origin = 'ingested';

insert into public.niche_aliases(niche_id, alias, locale)
values ('internet-culture', 'meme', 'en'), ('internet-culture', 'brainrot', 'en'), ('books', 'booktok', 'en'),
  ('f1', 'formula 1', 'en'), ('style', 'sneakers', 'en'), ('music', 'album', 'en'),
  ('screen-culture', 'anime', 'en'), ('gaming-tech', 'gaming', 'en'), ('food-places', 'cafe', 'en')
on conflict do nothing;

insert into public.source_definitions(name, adapter_type, config, trust_tier, locale, region, poll_minutes, allowlisted, active)
values
  ('Founder manual intake', 'manual', '{}'::jsonb, 'watchlist', 'en-IN', 'india', 180, true, true),
  ('Approved India culture RSS template', 'rss', '{"url":"REPLACE_WITH_APPROVED_PUBLIC_FEED"}'::jsonb, 'publication', 'en-IN', 'india', 180, true, false),
  ('Approved global culture RSS template', 'rss', '{"url":"REPLACE_WITH_APPROVED_PUBLIC_FEED"}'::jsonb, 'publication', 'en', 'global', 180, true, false),
  ('Approved YouTube channel template', 'youtube', '{"channelId":"REPLACE_WITH_APPROVED_CHANNEL_ID"}'::jsonb, 'primary', 'en', 'global', 180, true, false)
on conflict do nothing;
