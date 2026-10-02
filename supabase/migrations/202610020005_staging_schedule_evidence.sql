-- Read-only schedule diagnostics; returns no Vault values or cron command text.
create or replace function public.ingestion_schedule_evidence()
returns jsonb language sql security definer set search_path = '' as $$
 select jsonb_build_object('name', job.jobname, 'schedule', job.schedule, 'active', job.active,
   'latestRun', (select jsonb_build_object('status', run.status, 'startedAt', run.start_time, 'finishedAt', run.end_time)
     from cron.job_run_details run where run.jobid=job.jobid order by run.start_time desc limit 1))
 from cron.job job where job.jobname='larper-ingestion-every-three-hours';
$$;
revoke all on function public.ingestion_schedule_evidence() from public, anon, authenticated;
grant execute on function public.ingestion_schedule_evidence() to service_role;
