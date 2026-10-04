-- Verified 4 October 2026: /feed/rss redirects to /feed/ on the same publisher.
-- Preserve source identity, history, permission review and activation settings.
update public.source_definitions
set config=jsonb_set(config,'{url}','"https://www.indiewire.com/feed/"'::jsonb),updated_at=now()
where name='IndieWire Film & TV' and config->>'url'='https://www.indiewire.com/feed/rss';
