-- Local development seed. Runs on `supabase db reset` only; never on the cloud project.
-- Cloud secrets are created once by hand (see supabase/README.md).

select vault.create_secret('http://host.docker.internal:3000', 'people_web_url', 'Base URL of people-web reachable from Postgres');
select vault.create_secret('local-billing-cron-secret', 'billing_cron_secret', 'Shared secret for /api/billing/run');
select vault.create_secret('local-push-dispatch-secret', 'push_dispatch_secret', 'Shared secret for /api/push/new-coupon');
select vault.create_secret('local-qr-token-secret-change-me', 'qr_token_secret', 'HMAC key for coupon QR tokens');

-- Promote an admin after creating the user through the app or Studio:
--   update public.profiles set role = 'admin' where id = '<auth.users.id>';
