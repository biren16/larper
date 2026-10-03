begin;
do $$ declare role_name text; begin foreach role_name in array array['anon','authenticated','service_role'] loop if not exists(select 1 from pg_roles where rolname=role_name) then execute format('create role %I',role_name); end if; end loop; end $$;
create schema auth; create schema storage; create schema extensions; create schema cron;
create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$select null::uuid$$;
create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table cron.job(jobid bigint generated always as identity primary key, jobname text unique, schedule text, command text, active boolean default true);
create table cron.job_run_details(jobid bigint, status text, start_time timestamptz, end_time timestamptz);
create function cron.schedule(text,text,text) returns bigint language plpgsql as $$declare result bigint; begin insert into cron.job(jobname,schedule,command) values($1,$2,$3) on conflict(jobname) do update set schedule=excluded.schedule,command=excluded.command returning jobid into result; return result; end$$;
