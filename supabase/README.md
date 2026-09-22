# Supabase

Schema, policies and database functions live in `migrations/`. pgTAP tests live in `tests/`.

## Cloud project (current workflow)

```sh
pnpm supabase login                       # opens the browser; the token stays on your machine
pnpm supabase link --project-ref <ref>    # once per machine
pnpm db:push                              # apply migrations to the linked project
pnpm db:types:linked                      # regenerate packages/supabase/src/database.types.ts
pnpm supabase test db --linked            # run pgTAP tests against the linked project
```

Secrets the database needs, created once in the SQL editor of the cloud project (values are not in git):

```sql
select vault.create_secret('https://<people-web-domain>', 'people_web_url');
select vault.create_secret('<random 32+ bytes>', 'billing_cron_secret');
select vault.create_secret('<random 32+ bytes>', 'push_dispatch_secret');
select vault.create_secret('<random 32+ bytes>', 'qr_token_secret');
```

`billing_cron_secret` and `push_dispatch_secret` must match `BILLING_CRON_SECRET` and `PUSH_DISPATCH_SECRET` in the people-web environment. On the cloud project only `qr_token_secret` exists so far; the hourly billing job and the new-coupon push trigger stay silent until `people_web_url` and their secrets are created.

Promote the first admin: `update public.profiles set role = 'admin' where id = '<auth.users.id>';`

## Local stack (needs Docker)

```sh
pnpm db:start     # supabase start
pnpm db:reset     # apply migrations + seed.sql
pnpm db:types     # generate types from the local database
pnpm db:test      # pgTAP against the local database
```
