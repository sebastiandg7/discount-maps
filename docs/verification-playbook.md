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

From a git worktree (not linked) set `SUPABASE_PROJECT_REF=rurjvcrmgtrznezvwkih` for the runner and add `--project-ref rurjvcrmgtrznezvwkih` next to `--linked` on every other CLI call.

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
- **Consumer map (list)**: sign in as `qa-consumer@discountmaps.test` → lands on `/mapas`. The pane denies geolocation, so expect the "Ubicación no disponible" chip and the Bogotá center; two "Pizzas del Norte" rows (one per branch, `4,9 km` / `7 km`), "Mapa no disponible" box, `BottomNav` with `aria-current="page"` on Mapas. Click "Postres" → "No hay negocios cerca"; "Todas" → rows back; "Los mejores descuentos" → rows keep, "pts" badge appears.
- **Business profile**: `/negocios/4c239686-fd9c-4904-b99f-2fba6d49ac26` → 2 `https://www.google.com/maps/dir/` and 2 `https://waze.com/ul` links, 3 coupon links under `/cupones/`, back link to `/mapas`.
- **Coupon QR**: open the 20 % coupon (`937b7ea5-…`). Assert `section[aria-label="Código QR"] svg`, the countdown in `[aria-live="polite"]`, and read the token from `[data-token]`. After ~65 s the token's 5th part (jti) changes and the countdown resets to ~85 s. Console and server logs stay clean.
- **Scanner without a camera**: mint a token by SQL impersonation (valid 90 s):
  `pnpm supabase db query "set local role authenticated; set local request.jwt.claims = '{\"sub\":\"00000000-0000-4000-8000-00000000c001\",\"role\":\"authenticated\"}'; select public.issue_coupon_token('937b7ea5-d9ef-40e3-a497-e36e8a808acf')" --linked --project-ref … --output-format json`.
  Clear cookies at `3001/api/x`, sign in as `qa-owner@…`, open `/verificar`: the pane blocks the camera, so the "No tenemos permiso…" status shows and the "Pegar código manualmente" form is open. Set the textarea through the native setter + `input` event, `requestSubmit()`, wait for `[role="status"]`: valid → "Cupón válido · QA Consumer · Martes de pizza"; "Escanear otro" + same token → "Este código ya fue redimido."; last hex char flipped → "El código no es válido."; `hola` → "El código no es un cupón de Discount Maps.". `select count(*) from public.redemptions where consumer_id = '…c001'` grows by one per valid scan.
- **Cross-app bounce**: cookies are shared across ports, so run the consumer recipes first. Opening `3001` with the consumer cookie lands on `3000/mapas`; `3000/inicio` redirects to `/mapas`.

## Playwright

Not installed yet (planned for Phase 9). Until then the recipes above are the e2e coverage.
