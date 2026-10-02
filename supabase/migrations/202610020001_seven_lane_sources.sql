alter table public.source_definitions drop constraint if exists source_definitions_watchlist_beat_check;
alter table public.source_definitions add constraint source_definitions_watchlist_beat_check
 check (watchlist_beat in ('music','screen-culture','style','tech-gaming','internet-culture','books','f1'));
create unique index if not exists source_definitions_preset_key_unique
 on public.source_definitions ((config->>'presetKey')) where config->>'presetKey' is not null;

create or replace function public.source_has_usage_review(p_config jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare review jsonb := p_config->'usageReview';
begin
 if jsonb_typeof(review) is distinct from 'object' then return false; end if;
 if exists(select 1 from unnest(array['reviewedBy','termsUrl','basis','notes','reviewedAt']) field
   where jsonb_typeof(review->field) is distinct from 'string' or length(btrim(review->>field)) = 0) then return false; end if;
 if review->>'termsUrl' !~ '^https?://' then return false; end if;
 perform (review->>'reviewedAt')::timestamptz;
 return true;
exception when others then return false;
end;
$$;

create or replace function public.register_culture_sources(p_presets jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare preset jsonb; found_id uuid; configured jsonb; registered integer := 0;
begin
 -- Serialise repeated installs, including concurrent Studio requests.
 perform pg_advisory_xact_lock(hashtext('larper-culture-source-presets'));
 for preset in select value from jsonb_array_elements(p_presets) loop
   select id into found_id from public.source_definitions
     where config->>'presetKey' = preset->>'key'
     or (adapter_type = preset->>'adapterType' and (
       regexp_replace(config->>'url', '/$', '') = regexp_replace(preset->>'url', '/$', '')
       or config->>'url' in (select jsonb_array_elements_text(coalesce(preset->'aliases','[]')))
     )) order by (config->>'presetKey' = preset->>'key') desc nulls last, id limit 1 for update;
   configured := jsonb_build_object('url', preset->>'url', 'presetKey', preset->>'key',
     'originKey', preset->>'originKey', 'owner', preset->>'owner', 'domains', preset->'domains',
     'usageNotes', preset->>'usageNotes');
   if found_id is null then
     insert into public.source_definitions(name, adapter_type, config, trust_tier, locale, region,
       poll_minutes, allowlisted, active, watchlist_beat)
       values(preset->>'name', preset->>'adapterType', configured, preset->>'trustTier',
       preset->>'locale', preset->>'region', (preset->>'pollMinutes')::integer, false, false, preset->>'beat');
   else
     update public.source_definitions set
       config = configured || config || jsonb_build_object('presetKey', preset->>'key', 'url', preset->>'url'),
       watchlist_beat = coalesce(watchlist_beat, preset->>'beat')
       where id = found_id;
   end if;
   registered := registered + 1;
   found_id := null;
 end loop;
 return registered;
end;
$$;
revoke all on function public.register_culture_sources(jsonb) from public, anon, authenticated;
grant execute on function public.register_culture_sources(jsonb) to service_role;

-- Catalog snapshot; usage permission still requires review; all new entries remain paused.
select public.register_culture_sources($presets$[
  {
    "key": "bandcamp-daily",
    "name": "Bandcamp Daily",
    "beat": "music",
    "adapterType": "rss",
    "url": "https://daily.bandcamp.com/feed",
    "trustTier": "publication",
    "locale": "en",
    "region": "global",
    "pollMinutes": 180,
    "owner": "Bandcamp Daily",
    "originKey": "publisher:daily.bandcamp.com",
    "domains": [
      "daily.bandcamp.com"
    ],
    "usageNotes": "Links, feed metadata and original editorial summaries only; no article bodies or publisher media. Review current terms before automated collection.",
    "aliases": []
  },
  {
    "key": "rolling-stone-india",
    "name": "Rolling Stone India",
    "beat": "music",
    "adapterType": "rss",
    "url": "https://rollingstoneindia.com/feed/",
    "trustTier": "publication",
    "locale": "en-IN",
    "region": "india",
    "pollMinutes": 180,
    "owner": "Rolling Stone India",
    "originKey": "publisher:rollingstoneindia.com",
    "domains": [
      "rollingstoneindia.com"
    ],
    "usageNotes": "Links, feed metadata and original editorial summaries only; no article bodies or publisher media. Review current terms before automated collection.",
    "aliases": []
  },
  {
    "key": "pitchfork-news",
    "name": "Pitchfork News",
    "beat": "music",
    "adapterType": "rss",
    "url": "https://pitchfork.com/feed/feed-news/rss",
    "trustTier": "publication",
    "locale": "en",
    "region": "global",
    "pollMinutes": 180,
    "owner": "Pitchfork News",
    "originKey": "publisher:pitchfork.com",
    "domains": [
      "pitchfork.com"
    ],
    "usageNotes": "Links, feed metadata and original editorial summaries only; no article bodies or publisher media. Review current terms before automated collection.",
    "aliases": []
  },
  {
    "key": "letterboxd-journal",
    "name": "Letterboxd Journal",
    "beat": "screen-culture",
    "adapterType": "rss",
    "url": "https://letterboxd.com/journal/rss/",
    "trustTier": "publication",
    "locale": "en",
    "region": "global",
    "pollMinutes": 180,
    "owner": "Letterboxd Journal",
    "originKey": "publisher:letterboxd.com",
    "domains": [
      "letterboxd.com"
    ],
    "usageNotes": "Links, feed metadata and original editorial summaries only; no article bodies or publisher media. Review current terms before automated collection.",
    "aliases": []
  },
  {
    "key": "rogerebert",
    "name": "RogerEbert",
    "beat": "screen-culture",
    "adapterType": "rss",
    "url": "https://www.rogerebert.com/feed",
    "trustTier": "publication",
    "locale": "en",
    "region": "global",
    "pollMinutes": 180,
    "owner": "RogerEbert",
    "originKey": "publisher:rogerebert.com",
    "domains": [
      "rogerebert.com"
    ],
    "usageNotes": "Links, feed metadata and original editorial summaries only; no article bodies or publisher media. Review current terms before automated collection.",
    "aliases": []
  },
  {
    "key": "crunchyroll",
    "name": "Crunchyroll News",
    "beat": "screen-culture",
    "adapterType": "manual",
    "url": "https://www.crunchyroll.com/news",
    "trustTier": "publication",
    "locale": "en",
    "region": "global",
    "pollMinutes": 180,
    "owner": "Crunchyroll News",
    "originKey": "publisher:crunchyroll.com",
    "domains": [
      "crunchyroll.com"
    ],
    "usageNotes": "Links, feed metadata and original editorial summaries only; no article bodies or publisher media. Review current terms before automated collection.",
    "aliases": []
  },
  {
    "key": "thr-india",
    "name": "THR India",
    "beat": "screen-culture",
    "adapterType": "manual",
    "url": "https://www.hollywoodreporterindia.com/",
    "trustTier": "publication",
    "locale": "en-IN",
    "region": "india",
    "pollMinutes": 180,
    "owner": "THR India",
    "originKey": "publisher:hollywoodreporterindia.com",
    "domains": [
      "hollywoodreporterindia.com"
    ],
    "usageNotes": "Links, feed metadata and original editorial summaries only; no article bodies or publisher media. Review current terms before automated collection.",
    "aliases": []
  },
  {
    "key": "dazed",
    "name": "Dazed",
    "beat": "style",
    "adapterType": "rss",
    "url": "https://www.dazeddigital.com/rss",
    "trustTier": "publication",
    "locale": "en",
    "region": "global",
    "pollMinutes": 180,
    "owner": "Dazed",
    "originKey": "publisher:dazeddigital.com",
    "domains": [
      "dazeddigital.com"
    ],
    "usageNotes": "Links, feed metadata and original editorial summaries only; no article bodies or publisher media. Review current terms before automated collection.",
    "aliases": []
  },
  {
    "key": "hypebae",
    "name": "Hypebae",
    "beat": "style",
    "adapterType": "rss",
    "url": "https://hypebae.com/feed",
    "trustTier": "publication",
    "locale": "en",
    "region": "global",
    "pollMinutes": 180,
    "owner": "Hypebae",
    "originKey": "publisher:hypebae.com",
    "domains": [
      "hypebae.com"
    ],
    "usageNotes": "Links, feed metadata and original editorial summaries only; no article bodies or publisher media. Review current terms before automated collection.",
    "aliases": []
  },
  {
    "key": "highsnobiety",
    "name": "Highsnobiety",
    "beat": "style",
    "adapterType": "rss",
    "url": "https://www.highsnobiety.com/feeds/rss",
    "trustTier": "publication",
    "locale": "en",
    "region": "global",
    "pollMinutes": 180,
    "owner": "Highsnobiety",
    "originKey": "publisher:highsnobiety.com",
    "domains": [
      "highsnobiety.com"
    ],
    "usageNotes": "Links, feed metadata and original editorial summaries only; no article bodies or publisher media. Review current terms before automated collection.",
    "aliases": [
      "https://www.highsnobiety.com/feed/",
      "https://www.highsnobiety.com/feed"
    ]
  },
  {
    "key": "sneaker-news",
    "name": "Sneaker News",
    "beat": "style",
    "adapterType": "rss",
    "url": "https://sneakernews.com/feed/",
    "trustTier": "publication",
    "locale": "en",
    "region": "global",
    "pollMinutes": 180,
    "owner": "Sneaker News",
    "originKey": "publisher:sneakernews.com",
    "domains": [
      "sneakernews.com"
    ],
    "usageNotes": "Links, feed metadata and original editorial summaries only; no article bodies or publisher media. Review current terms before automated collection.",
    "aliases": []
  },
  {
    "key": "nice-kicks",
    "name": "Nice Kicks",
    "beat": "style",
    "adapterType": "rss",
    "url": "https://www.nicekicks.com/feed/",
    "trustTier": "publication",
    "locale": "en",
    "region": "global",
    "pollMinutes": 180,
    "owner": "Nice Kicks",
    "originKey": "publisher:nicekicks.com",
    "domains": [
      "nicekicks.com"
    ],
    "usageNotes": "Links, feed metadata and original editorial summaries only; no article bodies or publisher media. Review current terms before automated collection.",
    "aliases": []
  },
  {
    "key": "homegrown",
    "name": "Homegrown",
    "beat": "style",
    "adapterType": "manual",
    "url": "https://homegrown.co.in/",
    "trustTier": "publication",
    "locale": "en-IN",
    "region": "india",
    "pollMinutes": 180,
    "owner": "Homegrown",
    "originKey": "publisher:homegrown.co.in",
    "domains": [
      "homegrown.co.in"
    ],
    "usageNotes": "Links, feed metadata and original editorial summaries only; no article bodies or publisher media. Review current terms before automated collection.",
    "aliases": []
  },
  {
    "key": "eurogamer",
    "name": "Eurogamer",
    "beat": "tech-gaming",
    "adapterType": "rss",
    "url": "https://www.eurogamer.net/feed",
    "trustTier": "publication",
    "locale": "en",
    "region": "global",
    "pollMinutes": 180,
    "owner": "Eurogamer",
    "originKey": "publisher:eurogamer.net",
    "domains": [
      "eurogamer.net"
    ],
    "usageNotes": "Links, feed metadata and original editorial summaries only; no article bodies or publisher media. Review current terms before automated collection.",
    "aliases": []
  },
  {
    "key": "polygon",
    "name": "Polygon",
    "beat": "tech-gaming",
    "adapterType": "rss",
    "url": "https://www.polygon.com/feed/",
    "trustTier": "publication",
    "locale": "en",
    "region": "global",
    "pollMinutes": 180,
    "owner": "Polygon",
    "originKey": "publisher:polygon.com",
    "domains": [
      "polygon.com"
    ],
    "usageNotes": "Links, feed metadata and original editorial summaries only; no article bodies or publisher media. Review current terms before automated collection.",
    "aliases": []
  },
  {
    "key": "playstation-blog",
    "name": "PlayStation Blog",
    "beat": "tech-gaming",
    "adapterType": "rss",
    "url": "https://blog.playstation.com/feed/",
    "trustTier": "primary",
    "locale": "en",
    "region": "global",
    "pollMinutes": 180,
    "owner": "PlayStation Blog",
    "originKey": "publisher:blog.playstation.com",
    "domains": [
      "blog.playstation.com"
    ],
    "usageNotes": "Links, feed metadata and original editorial summaries only; no article bodies or publisher media. Review current terms before automated collection.",
    "aliases": []
  },
  {
    "key": "xbox-wire",
    "name": "Xbox Wire",
    "beat": "tech-gaming",
    "adapterType": "rss",
    "url": "https://news.xbox.com/en-us/feed/",
    "trustTier": "primary",
    "locale": "en",
    "region": "global",
    "pollMinutes": 180,
    "owner": "Xbox Wire",
    "originKey": "publisher:news.xbox.com",
    "domains": [
      "news.xbox.com"
    ],
    "usageNotes": "Links, feed metadata and original editorial summaries only; no article bodies or publisher media. Review current terms before automated collection.",
    "aliases": []
  },
  {
    "key": "know-your-meme",
    "name": "Know Your Meme",
    "beat": "internet-culture",
    "adapterType": "rss",
    "url": "https://knowyourmeme.com/newsfeed.rss",
    "trustTier": "publication",
    "locale": "en",
    "region": "global",
    "pollMinutes": 180,
    "owner": "Know Your Meme",
    "originKey": "publisher:knowyourmeme.com",
    "domains": [
      "knowyourmeme.com"
    ],
    "usageNotes": "Links, feed metadata and original editorial summaries only; no article bodies or publisher media. Review current terms before automated collection.",
    "aliases": []
  },
  {
    "key": "daily-dot",
    "name": "Daily Dot",
    "beat": "internet-culture",
    "adapterType": "rss",
    "url": "https://dailydot.com/feed",
    "trustTier": "publication",
    "locale": "en",
    "region": "global",
    "pollMinutes": 180,
    "owner": "Daily Dot",
    "originKey": "publisher:dailydot.com",
    "domains": [
      "dailydot.com"
    ],
    "usageNotes": "Links, feed metadata and original editorial summaries only; no article bodies or publisher media. Review current terms before automated collection.",
    "aliases": [
      "https://www.dailydot.com/feed",
      "https://www.dailydot.com/feed/"
    ]
  },
  {
    "key": "book-riot",
    "name": "Book Riot",
    "beat": "books",
    "adapterType": "rss",
    "url": "https://bookriot.com/feed/",
    "trustTier": "publication",
    "locale": "en",
    "region": "global",
    "pollMinutes": 180,
    "owner": "Book Riot",
    "originKey": "publisher:bookriot.com",
    "domains": [
      "bookriot.com"
    ],
    "usageNotes": "Links, feed metadata and original editorial summaries only; no article bodies or publisher media. Review current terms before automated collection.",
    "aliases": []
  },
  {
    "key": "reactor",
    "name": "Reactor",
    "beat": "books",
    "adapterType": "rss",
    "url": "https://reactormag.com/feed/",
    "trustTier": "publication",
    "locale": "en",
    "region": "global",
    "pollMinutes": 180,
    "owner": "Reactor",
    "originKey": "publisher:reactormag.com",
    "domains": [
      "reactormag.com"
    ],
    "usageNotes": "Links, feed metadata and original editorial summaries only; no article bodies or publisher media. Review current terms before automated collection.",
    "aliases": []
  },
  {
    "key": "literary-hub",
    "name": "Literary Hub",
    "beat": "books",
    "adapterType": "rss",
    "url": "https://lithub.com/feed/",
    "trustTier": "publication",
    "locale": "en",
    "region": "global",
    "pollMinutes": 180,
    "owner": "Literary Hub",
    "originKey": "publisher:lithub.com",
    "domains": [
      "lithub.com"
    ],
    "usageNotes": "Links, feed metadata and original editorial summaries only; no article bodies or publisher media. Review current terms before automated collection.",
    "aliases": []
  },
  {
    "key": "racefans",
    "name": "RaceFans",
    "beat": "f1",
    "adapterType": "rss",
    "url": "https://www.racefans.net/feed/",
    "trustTier": "publication",
    "locale": "en",
    "region": "global",
    "pollMinutes": 180,
    "owner": "RaceFans",
    "originKey": "publisher:racefans.net",
    "domains": [
      "racefans.net"
    ],
    "usageNotes": "Links, feed metadata and original editorial summaries only; no article bodies or publisher media. Review current terms before automated collection.",
    "aliases": []
  },
  {
    "key": "the-race",
    "name": "The Race",
    "beat": "f1",
    "adapterType": "rss",
    "url": "https://www.the-race.com/rss/",
    "trustTier": "publication",
    "locale": "en",
    "region": "global",
    "pollMinutes": 180,
    "owner": "The Race",
    "originKey": "publisher:the-race.com",
    "domains": [
      "the-race.com"
    ],
    "usageNotes": "Links, feed metadata and original editorial summaries only; no article bodies or publisher media. Review current terms before automated collection.",
    "aliases": []
  },
  {
    "key": "fia",
    "name": "FIA documents",
    "beat": "f1",
    "adapterType": "manual",
    "url": "https://www.fia.com/media-center/press_release/name/name/F1",
    "trustTier": "primary",
    "locale": "en",
    "region": "global",
    "pollMinutes": 180,
    "owner": "FIA documents",
    "originKey": "publisher:fia.com",
    "domains": [
      "fia.com"
    ],
    "usageNotes": "Links, feed metadata and original editorial summaries only; no article bodies or publisher media. Review current terms before automated collection.",
    "aliases": []
  }
]
$presets$::jsonb);

create or replace function public.guard_source_activation()
returns trigger language plpgsql set search_path = '' as $$
begin
 if new.active and new.adapter_type in ('rss','youtube') then
   if tg_op = 'INSERT' or not old.active or new.adapter_type is distinct from old.adapter_type or new.config->'usageReview' is distinct from old.config->'usageReview' then
     if not public.source_has_usage_review(new.config) then raise exception 'Record a usage review before activating automated collection'; end if;
   end if;
 end if;
 return new;
end;
$$;
drop trigger if exists source_activation_review on public.source_definitions;
create trigger source_activation_review before insert or update on public.source_definitions
 for each row execute function public.guard_source_activation();
