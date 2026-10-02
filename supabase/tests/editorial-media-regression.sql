-- Run from the repository root in a disposable PostgreSQL database.
begin;
create schema storage;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table public.media_assets (
  id text primary key, src text not null, alt text not null, width integer not null,
  height integer not null, focal_position text, created_at timestamptz default now()
);
insert into public.media_assets(id, src, alt, width, height)
values ('seed', '/media/seed.png', 'Seed art', 1200, 800);

\i supabase/migrations/202610010005_editorial_media.sql

do $$
declare rejected boolean := false;
begin
  if (select kind from public.media_assets where id = 'seed') <> 'larper' then
    raise exception 'Existing art lost its LARPer classification';
  end if;
  begin
    insert into public.media_assets(id, src, alt, width, height, kind)
    values ('unlicensed', 'https://example.com/image.webp', 'Image', 1200, 800, 'uploaded');
  exception when check_violation then rejected := true;
  end;
  if not rejected then raise exception 'Unlicensed upload was accepted'; end if;
  rejected := false;
  begin
    insert into public.media_assets(id, src, alt, width, height, kind, source_url, credit_line, license_code, object_path)
    values ('empty-rights', 'https://example.com/image.webp', 'Image', 1200, 800,
      'uploaded', 'https://example.com/original', ' ', ' ', 'candidate/empty.webp');
  exception when check_violation then rejected := true;
  end;
  if not rejected then raise exception 'Blank rights record was accepted'; end if;
  insert into public.media_assets(
    id, src, alt, width, height, kind, source_url, credit_line, license_code,
    commercial_use_allowed, modification_allowed, social_use_allowed, object_path
  ) values (
    'approved', 'https://example.com/image.webp', 'Image', 1200, 800,
    'uploaded', 'https://example.com/original', 'Photo by Artist', 'permission',
    true, false, false, 'candidate/approved.webp'
  );
  if (select file_size_limit from storage.buckets where id = 'editorial-media') <> 400000 then
    raise exception 'Media bucket size limit is missing';
  end if;
end;
$$;
rollback;
