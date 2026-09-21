# Verification playbook

How every phase has been verified so far. Reuse these recipes; add new ones as features land.

## Static checks (always, before committing)

```sh
NX_DAEMON=false pnpm nx format:write
NX_DAEMON=false CI=true pnpm nx run-many -t lint typecheck test build
```

Warnings currently tolerated: "Unused eslint-disable directive" in generated jest configs, `no-non-null-assertion` in a few page files that rely on layout guarantees.

## Database

```sh
node scripts/pgtap-remote.mjs                 # all suites on the cloud project
pnpm supabase db advisors --linked --output-format json
```

Ad-hoc state checks with `pnpm supabase db query "..." --linked --output-format json`. To query _as a user_, prefix with `set local role authenticated; set local request.jwt.claims = '{"sub":"<uuid>","role":"authenticated"}';` (same statement string).

## Live checks with the in-app browser

1. Start a server: `preview_start` with `people-web` (3000) or `business-web` (3001) from `.claude/launch.json`. Wait ~6 s before the first navigation; if the first load fails, **close that tab and call `preview_start` again** (a tab whose first load failed stays broken). Closing the last tab stops the server.
2. Sign in with the QA fixtures (see [database.md](database.md)). To switch users without a sign-out button, load `http://localhost:3001/api/anything` (404 page, proxy skipped) and run `document.cookie` clearing for `sb-*` cookies from there, or sign out from the app.
3. Drive forms with `find` → `form_input`/`type`; for react-hook-form fields set values through the native setter and dispatch `input`/`change` events so React sees them.
4. The pane pins a tab to the origin it opened with; cross-app redirects (3000 ↔ 3001) may be blocked. Verify redirects deterministically instead: copy the `sb-*` cookie from `document.cookie` and replay requests from Node with `fetch(url, { headers: { cookie }, redirect: 'manual' })`, asserting on `status` + `location`.
5. Screenshot at `scale: 0.5–0.6` for layout checks; use `javascript_exec` with `document.body.innerText.slice(...)` for text assertions.

## Flow recipes

- **Role bounce**: consumer cookie → `GET 3001/inicio` returns 307 to `3000/inicio`; no cookie → 307 to `/login?next=%2Finicio`.
- **Onboarding**: log in as a fresh business user → lands on `/onboarding` → submit with ≥1 branch → `/pendiente`; admin at `/admin` approves → owner reaches `/inicio`.
- **Coupons**: `/cupones/nuevo` preview updates while typing; with 4 live coupons one can be deactivated, at 3 the switches lock; `businesses_public` lists the business.

## Playwright

Not installed yet (planned for Phase 9). Until then the recipes above are the e2e coverage.
