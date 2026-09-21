with desired(name, config) as (
  values
    ('Variety Film', '{"url":"https://variety.com/v/film/news/feed/"}'::jsonb),
    ('Screen Daily International', '{"url":"https://www.screendaily.com/1366.rss"}'::jsonb),
    ('IndieWire Film & TV', '{"url":"https://www.indiewire.com/feed/rss"}'::jsonb),
    ('World Screen TV Drama', '{"url":"https://worldscreen.com/tvdrama/feed/"}'::jsonb)
)
update public.source_definitions as source
set
  adapter_type = 'rss',
  config = desired.config,
  trust_tier = 'publication',
  locale = 'en',
  region = 'global',
  poll_minutes = 180,
  allowlisted = true,
  active = true,
  watchlist_beat = 'screen-culture',
  updated_at = now()
from desired
where lower(source.name) = lower(desired.name);

with desired(name, config) as (
  values
    ('Variety Film', '{"url":"https://variety.com/v/film/news/feed/"}'::jsonb),
    ('Screen Daily International', '{"url":"https://www.screendaily.com/1366.rss"}'::jsonb),
    ('IndieWire Film & TV', '{"url":"https://www.indiewire.com/feed/rss"}'::jsonb),
    ('World Screen TV Drama', '{"url":"https://worldscreen.com/tvdrama/feed/"}'::jsonb)
)
insert into public.source_definitions (
  name,
  adapter_type,
  config,
  trust_tier,
  locale,
  region,
  poll_minutes,
  allowlisted,
  active,
  watchlist_beat
)
select
  desired.name,
  'rss',
  desired.config,
  'publication',
  'en',
  'global',
  180,
  true,
  true,
  'screen-culture'
from desired
where not exists (
  select 1
  from public.source_definitions as source
  where lower(source.name) = lower(desired.name)
);
