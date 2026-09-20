create extension if not exists pg_net with schema extensions;

-- Before applying this schedule, create Vault secrets named project_url and ingestion_secret.
-- The URL should be the Supabase project URL; the secret must equal INGESTION_SECRET in the Edge Function.
select cron.schedule(
  'larper-ingestion-every-three-hours',
  '0 */3 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/ingest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'ingestion_secret')
    ),
    body := jsonb_build_object('trigger', 'supabase_cron')
  );
  $$
);
