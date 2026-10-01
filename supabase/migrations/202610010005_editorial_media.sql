-- Existing local seed artwork remains LARPer-owned. Uploaded covers require rights metadata.
alter table public.media_assets
  add column if not exists kind text not null default 'larper'
    check (kind in ('larper', 'uploaded')),
  add column if not exists source_url text,
  add column if not exists credit_line text,
  add column if not exists license_code text,
  add column if not exists commercial_use_allowed boolean not null default true,
  add column if not exists modification_allowed boolean not null default true,
  add column if not exists social_use_allowed boolean not null default true,
  add column if not exists object_path text;

alter table public.media_assets
  add constraint uploaded_media_has_rights check (
    kind = 'larper' or (
      source_url is not null and credit_line is not null and license_code is not null
      and object_path is not null and commercial_use_allowed
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('editorial-media', 'editorial-media', true, 400000, array['image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
