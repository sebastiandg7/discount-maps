# Deploy runbook (Phase 10)

Two Vercel projects (one per app, root directories `apps/people-web` and `apps/business-web`) on top of the existing Supabase cloud project. Secrets never pass through an agent: the owner logs in and links, a script moves `.env.local` values into Vercel without printing them, and the owner pastes production-only values in the dashboards.

## 1. One-time setup (owner, from the repo root)

```sh
pnpm vercel login                                    # browser sign-in
cd apps/people-web && pnpm vercel link && cd ../..   # new project, e.g. discount-maps-people
cd apps/business-web && pnpm vercel link && cd ../.. # new project, e.g. discount-maps-business
```

Linking from inside each app folder makes Vercel store that folder as the project's **Root Directory** (required for the pnpm workspace: the install runs at the repo root, the build in the app). `.vercel/` is gitignored. Framework preset: Next.js, defaults otherwise.

Current state (2026-09-22): the owner linked with a repo-level link (`.vercel/repo.json` at the checkout root maps `apps/people-web` → `discount-maps-people`, `apps/business-web` → `discount-maps-business-web`, both with the Root Directory set, Node 24). Production URLs:

| App          | Vercel project               | URL                                             |
| ------------ | ---------------------------- | ----------------------------------------------- |
| people-web   | `discount-maps-people`       | `https://discount-maps-people.vercel.app`       |
| business-web | `discount-maps-business-web` | `https://discount-maps-business-web.vercel.app` |

Git auto-deploys need the GitHub repo connected to each project (Vercel dashboard → Project → Settings → Git); until then deploy from the CLI (§ 5). A new worktree needs the `.vercel/repo.json` copied in (or `pnpm vercel link --repo`).

## 2. Environment variables (agent, after the links exist)

```sh
node scripts/vercel-env-sync.mjs --people-url https://<people>.vercel.app --business-url https://<business>.vercel.app [--dry-run]
```

- Reads the variable **names** from `apps/*/.env.example` and the values from `apps/*/.env.local`, overrides the three URL variables with the deployed origins, and runs `vercel env add … --force --yes` per variable for `production` and `preview`. Values are piped, never echoed; non-`NEXT_PUBLIC_` names are stored as **sensitive** (hidden in the dashboard).
- Empty locally → skipped with a note; set those in the Vercel dashboard.
- Re-run whenever `.env.local` changes. To rotate a single secret, the owner edits it in the Vercel dashboard (Project → Settings → Environment Variables) and redeploys.

Per-app matrix: people-web takes every variable in its `.env.example` (Supabase, URLs, Maps, Wompi public + private, price, cron secret, VAPID trio, push secret); business-web takes Supabase, URLs and Maps only (`SUPABASE_SECRET_KEY` is optional there).

Synced on 2026-09-22 for both projects (production + preview) with the sandbox Wompi keys and the dev VAPID pair. The owner had also added variables by hand earlier; the sync overwrote the ones the apps use. Extra variables that the apps do **not** read remain in the dashboard and can be deleted: `NEXT_PUBLIC_PEOPLE_APP_URL` on the people project, and on the business project every Wompi / VAPID / billing / push variable plus `NEXT_PUBLIC_BUSINESS_APP_URL` (the merchant app never talks to Wompi; keeping its private keys there is needless exposure).

First deploy runs with the **Wompi sandbox keys** (decision 2026-09-22): no real charges; swap `NEXT_PUBLIC_WOMPI_PUBLIC_KEY`, `WOMPI_PRIVATE_KEY`, `WOMPI_INTEGRITY_SECRET`, `WOMPI_EVENTS_SECRET`, `WOMPI_API_URL` / `NEXT_PUBLIC_WOMPI_API_URL` (`https://production.wompi.co/v1`) in the dashboard when the production merchant is approved.

## 3. Supabase side (owner, SQL editor + Auth settings)

Vault secrets that make the hourly billing cron and the new-coupon push trigger real (values: the people-web origin, and the same strings as `BILLING_CRON_SECRET` / `PUSH_DISPATCH_SECRET` in `apps/people-web/.env.local`):

```sql
select vault.create_secret('https://discount-maps-people.vercel.app', 'people_web_url');
select vault.create_secret('<paste BILLING_CRON_SECRET from apps/people-web/.env.local>', 'billing_cron_secret');
select vault.create_secret('<paste PUSH_DISPATCH_SECRET from apps/people-web/.env.local>', 'push_dispatch_secret');
```

Auth → URL configuration: Site URL `https://discount-maps-people.vercel.app`; Redirect URLs add `https://discount-maps-people.vercel.app/auth/callback` and `https://discount-maps-business-web.vercel.app/auth/callback` (keep the localhost ones for development).

## 4. Third parties (owner)

- **Wompi** → Desarrolladores → URL de eventos: `https://discount-maps-people.vercel.app/api/wompi/webhook`.
- **Google Cloud** → the Maps key's HTTP referrer restrictions: add `https://discount-maps-people.vercel.app/*` and `https://discount-maps-business-web.vercel.app/*`.
- **Custom domains** (later): add them in each Vercel project, then repeat the URL updates above (env vars, Vault `people_web_url`, Supabase redirect URLs, Wompi events URL, Maps referrers).

## 5. Deploy and smoke test

`git push` to `main` deploys production; every PR gets a preview URL. Manual: `cd apps/people-web && pnpm vercel deploy --prod`.

Smoke (see [verification-playbook.md](verification-playbook.md) for the detailed recipes): landing → sign in as `qa-consumer@` → `/mapas` shows the map and Pizzas del Norte → coupon QR renders → `/cuenta`; business landing → `qa-owner@` → `/verificar` paste flow; `curl -I https://<people>.vercel.app/manifest.webmanifest` 200; `select * from cron.job_run_details order by start_time desc limit 3` shows the hourly run hitting `/api/billing/run` with status 200 once the Vault secrets exist.

## 6. Before real users

Delete the `@discountmaps.test` fixtures ([database.md](database.md)), generate production VAPID keys (`npx web-push generate-vapid-keys`, paste into Vercel), switch Wompi to production keys, and turn on Supabase's leaked-password protection (advisor warning).
