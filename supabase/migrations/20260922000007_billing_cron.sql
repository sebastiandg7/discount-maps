-- Hourly billing run: Postgres asks people-web to charge due subscriptions.
-- Both Vault secrets must exist or the job is a no-op (nothing to call yet):
--   select vault.create_secret('https://<people-web host>', 'people_web_url');
--   select vault.create_secret('<same value as BILLING_CRON_SECRET>', 'billing_cron_secret');

select cron.schedule(
  'billing-run-hourly',
  '0 * * * *',
  $job$
    select net.http_post(
      url     := (select decrypted_secret from vault.decrypted_secrets where name = 'people_web_url') || '/api/billing/run',
      headers := jsonb_build_object(
                   'Content-Type', 'application/json',
                   'x-billing-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'billing_cron_secret')),
      body    := jsonb_build_object('triggered_at', now())
    )
    where exists (select 1 from vault.decrypted_secrets where name = 'people_web_url')
      and exists (select 1 from vault.decrypted_secrets where name = 'billing_cron_secret');
  $job$
);
