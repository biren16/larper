begin;
create role service_role;
create role anon;
create role authenticated;
create table public.source_definitions (
 id uuid primary key default gen_random_uuid(), name text not null, adapter_type text not null,
 config jsonb not null default '{}', trust_tier text not null, locale text, region text,
 poll_minutes integer, allowlisted boolean, active boolean, watchlist_beat text,
 last_polled_at timestamptz, updated_at timestamptz default now()
);
insert into public.source_definitions values (
 '00000000-0000-0000-0000-000000000001', 'Existing race desk', 'rss',
 '{"url":"https://www.racefans.net/feed/","custom":"preserved"}', 'publication', 'en', 'global',
 360, true, false, 'f1', now() - interval '1 hour', now()
);
\i supabase/migrations/202610020001_seven_lane_sources.sql
-- Running installation twice must adopt the existing row and preserve operator settings.
\i supabase/migrations/202610020001_seven_lane_sources.sql

do $$
declare blocked boolean := false;
begin
 if (select count(*) from public.source_definitions) <> 25 then raise exception 'Preset install duplicated sources'; end if;
 if (select count(*) from public.source_definitions where adapter_type = 'rss') <> 21 then raise exception 'Missing RSS presets'; end if;
 if (select count(distinct watchlist_beat) from public.source_definitions) <> 7 then raise exception 'Missing beat'; end if;
 if not exists(select 1 from public.source_definitions where id = '00000000-0000-0000-0000-000000000001' and poll_minutes = 360 and allowlisted and not active and config->>'custom' = 'preserved' and config->>'presetKey' = 'racefans' and last_polled_at is not null) then raise exception 'Existing source settings were lost'; end if;
 if exists(select 1 from public.source_definitions where active) then raise exception 'Preset activated without review'; end if;
 begin
   update public.source_definitions set active = true where config->>'presetKey' = 'dazed';
 exception when others then blocked := position('usage review' in sqlerrm) > 0;
 end;
 if not blocked then raise exception 'Activation without usage review was allowed'; end if;
 update public.source_definitions set config = config || '{"usageReview":{"termsUrl":"https://example.com/terms","basis":"Feed metadata permitted","notes":"Links only","reviewedBy":"founder","reviewedAt":"2026-10-02T10:00:00Z"}}', active = true where config->>'presetKey' = 'dazed';
 if not exists(select 1 from public.source_definitions where config->>'presetKey' = 'dazed' and active) then raise exception 'Reviewed activation failed'; end if;
 begin
   update public.source_definitions set config = config - 'usageReview' where config->>'presetKey' = 'dazed';
   raise exception 'Review removal from an active source was allowed';
 exception when others then
   if position('usage review' in sqlerrm) = 0 then raise; end if;
 end;
end;
$$;
rollback;
