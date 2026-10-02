-- Keep creator websites and registered publishers in one origin namespace.
create or replace function public.is_social_creator_domain(p_host text)
returns boolean language sql immutable set search_path = '' as $$
 select lower(p_host) ~ '(^|\.)(instagram\.com|tiktok\.com|x\.com|twitter\.com|youtube\.com|youtu\.be|reddit\.com)$';
$$;
create or replace function public.register_manual_creator(p_profile_url text,p_name text,p_domain text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare found_id uuid; identity_key text; domain text := lower(p_domain); social boolean;
begin
 if p_profile_url !~ '^https?://' or btrim(p_name) = '' or
   regexp_replace(lower(split_part(regexp_replace(p_profile_url,'^https?://',''), '/', 1)), '^www\.', '') <> domain
 then raise exception 'Enter a valid creator profile and domain'; end if;
 social := public.is_social_creator_domain(domain);
 identity_key := case when social then 'creator:' || p_profile_url else 'publisher:' || domain end;
 perform pg_advisory_xact_lock(hashtext(identity_key));
 if not social then
   select definitions.id into found_id from public.source_definitions definitions
   where definitions.config->>'creatorProfileUrl' is null and
     (public.source_origin_key(definitions.id,definitions.config) = identity_key or exists(
       select 1 from jsonb_array_elements_text(coalesce(definitions.config->'domains','[]')) registered_domain
       where domain = registered_domain or domain like '%.' || registered_domain))
   order by definitions.id limit 1;
   if found_id is not null then return found_id; end if;
 end if;
 select id into found_id from public.source_definitions where config->>'originKey'=identity_key order by id limit 1;
 if found_id is not null then return found_id; end if;
 insert into public.source_definitions(name,adapter_type,trust_tier,config,locale,region,poll_minutes,allowlisted,active,watchlist_beat)
 values(p_name,'manual','watchlist',jsonb_build_object('originKey',identity_key,'creatorProfileUrl',p_profile_url,'url',p_profile_url,
   'owner',p_name,'domains',jsonb_build_array(domain)),'en','global',180,false,false,'internet-culture') returning id into found_id;
 return found_id;
end;
$$;
revoke all on function public.register_manual_creator(text,text,text) from public, anon, authenticated;
grant execute on function public.register_manual_creator(text,text,text) to service_role;

-- Repair any website creator records registered before this migration without changing IDs/history.
update public.source_definitions set config = config || jsonb_build_object('originKey','publisher:' ||
 regexp_replace(lower(split_part(regexp_replace(config->>'creatorProfileUrl','^https?://',''), '/', 1)), '^www\.', ''))
where config->>'creatorProfileUrl' is not null and not public.is_social_creator_domain(
 lower(split_part(regexp_replace(config->>'creatorProfileUrl','^https?://',''), '/', 1)));

create or replace function public.record_manual_signal(p_source_id uuid, p_signal jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare source public.source_definitions; signal_id uuid; observation_time timestamptz; host text;
begin
 select * into source from public.source_definitions where id=p_source_id for share;
 if source.id is null then raise exception 'Select a registered publisher or creator'; end if;
 host := lower(split_part(regexp_replace(p_signal->>'canonicalUrl','^https?://',''), '/', 1));
 if p_signal->>'canonicalUrl' !~ '^https?://' or not exists(select 1 from jsonb_array_elements_text(coalesce(source.config->'domains','[]')) domain
   where host=domain or host like '%.' || domain) then raise exception 'URL does not belong to the selected publisher or creator'; end if;
 if public.is_social_creator_domain(host) and source.config->>'creatorProfileUrl' is null then
   raise exception 'Register a creator profile before manual social capture'; end if;
 observation_time := (p_signal->>'observedAt')::timestamptz;
 insert into public.raw_signals(source_definition_id,canonical_url,source_type,source_name,title,author,body,locale,region,
   published_at,observed_at,trust_tier,availability,metrics,sensitive_flags,suggested_niche_id)
 values(source.id,p_signal->>'canonicalUrl',p_signal->>'sourceType',source.name,p_signal->>'title',p_signal->>'author',p_signal->>'body',
   source.locale,coalesce(nullif(p_signal->>'region',''),source.region),(p_signal->>'publishedAt')::timestamptz,observation_time,
   case when source.config->>'creatorProfileUrl' is not null then 'watchlist' else source.trust_tier end,
   'available',coalesce(p_signal->'metrics','{}'),array(select jsonb_array_elements_text(coalesce(p_signal->'sensitiveFlags','[]'))),p_signal->>'suggestedNicheId')
 on conflict(source_definition_id,canonical_url) do update set title=excluded.title,author=excluded.author,body=excluded.body,
   locale=excluded.locale,region=excluded.region,published_at=excluded.published_at,trust_tier=excluded.trust_tier,
   availability=excluded.availability,metrics=excluded.metrics,sensitive_flags=excluded.sensitive_flags,suggested_niche_id=excluded.suggested_niche_id
 returning id into signal_id;
 insert into public.signal_snapshots(raw_signal_id,metrics,captured_at) values(signal_id,coalesce(p_signal->'metrics','{}'),observation_time)
 on conflict(raw_signal_id,captured_at) do update set metrics=excluded.metrics;
 return signal_id;
end;
$$;
revoke all on function public.record_manual_signal(uuid,jsonb) from public, anon, authenticated;
grant execute on function public.record_manual_signal(uuid,jsonb) to service_role;
