-- SQL contract coverage only; these fixtures do not prove a deployed cron delivery.
begin;
create role service_role;
create role anon;
create role authenticated;
create schema cron;
create table cron.job(jobid bigint,jobname text,schedule text,active boolean,command text);
create table cron.job_run_details(jobid bigint,status text,start_time timestamptz,end_time timestamptz);
\i supabase/migrations/202610020005_staging_schedule_evidence.sql
insert into cron.job values(1,'larper-ingestion-every-three-hours','0 */3 * * *',true,'secret-command-never-returned');
insert into cron.job_run_details values(1,'failed',now()-interval '4 hours',now()-interval '4 hours'),(1,'succeeded',now()-interval '1 hour',now()-interval '59 minutes');
do $$ declare evidence jsonb; begin
 evidence := public.ingestion_schedule_evidence();
 if evidence->>'schedule' <> '0 */3 * * *' or evidence->'latestRun'->>'status' <> 'succeeded' then raise exception 'Schedule metadata or newest delivery missing'; end if;
 if evidence::text like '%secret%' then raise exception 'Schedule diagnostic leaked command text'; end if;
 if has_function_privilege('anon','public.ingestion_schedule_evidence()','execute') or has_function_privilege('authenticated','public.ingestion_schedule_evidence()','execute') then raise exception 'Privileged schedule diagnostic exposed'; end if;
end; $$;
rollback;
