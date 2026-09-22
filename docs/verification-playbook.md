# Verification playbook

How every phase has been verified so far. Reuse these recipes; add new ones as features land.

## Static checks (always, before committing)

```sh
NX_DAEMON=false pnpm nx format:write
NX_DAEMON=false CI=true pnpm nx run-many -t lint typecheck test build
```

**Stop the dev servers before `build`.** `next build` and `next dev` share `apps/<app>/.next`; building while a dev server runs corrupts its Turbopack cache (`Failed to restore task data`, every request hangs). Recovery: `preview_stop`, delete `apps/<app>/.next`, `preview_start` again.

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
- **Map canvas** (key + Map ID in `.env.local`): on `/mapas` and the profile, `[role=region][aria-label=Mapa]` has `data-markers="2"`, a `.gm-style` child and two `gmp-advanced-marker` elements once Google loads (`performance.getEntriesByType('resource')` shows `maps/vt` tile requests and `mapConfigs:batchGet` for the Map ID). Clicking a pin opens `.gm-style-iw` with the name, branch/distance and a `/negocios/<id>` link. The pane renders tiles only while the tab is visible; screenshots may need a second try. Without the key the `[role=img]` placeholder shows.
- **Address autocomplete** (merchant): on `/cuenta` open "Agregar sede", `#branch-address` has `role="combobox"`; type `Carrera 7 # 60-10` through the native setter → `[role=option]` items after ~300 ms; clicking one fills `#branch-city`, `#branch-lat`, `#branch-lng` and `input[name=googlePlaceId]`. A `[maps] autocomplete failed … Places API (New) has not been used` console error means the Google project still needs that API enabled.
- **Coupon QR**: open the 20 % coupon (`937b7ea5-…`). Assert `section[aria-label="Código QR"] svg`, the countdown in `[aria-live="polite"]`, and read the token from `[data-token]`. After ~65 s the token's 5th part (jti) changes and the countdown resets to ~85 s. Console and server logs stay clean.
- **Scanner without a camera**: mint a token by SQL impersonation (valid 90 s):
  `pnpm supabase db query "set local role authenticated; set local request.jwt.claims = '{\"sub\":\"00000000-0000-4000-8000-00000000c001\",\"role\":\"authenticated\"}'; select public.issue_coupon_token('937b7ea5-d9ef-40e3-a497-e36e8a808acf')" --linked --project-ref … --output-format json`.
  Clear cookies at `3001/api/x`, sign in as `qa-owner@…`, open `/verificar`: the pane blocks the camera, so the "No tenemos permiso…" status shows and the "Pegar código manualmente" form is open. Set the textarea through the native setter + `input` event, `requestSubmit()`, wait for `[role="status"]`: valid → "Cupón válido · QA Consumer · Martes de pizza"; "Escanear otro" + same token → "Este código ya fue redimido."; last hex char flipped → "El código no es válido."; `hola` → "El código no es un cupón de Discount Maps.". `select count(*) from public.redemptions where consumer_id = '…c001'` grows by one per valid scan.
- **Cross-app bounce**: cookies are shared across ports, so run the consumer recipes first. Opening `3001` with the consumer cookie lands on `3000/mapas`; `3000/inicio` redirects to `/mapas`.
- **Trial gate + card capture**: sign in as a consumer without a `subscriptions` row (`qa-consumer2@` / `qa-consumer3@` had none originally; create another with the SQL pattern in database.md) → `/mapas` redirects to `/suscripcion/tarjeta` with Wompi's permalinks in the two checkboxes. Fill the React-controlled inputs through the native setter + `input` event: holder, `4242424242424242` (approves) or `4111111111111111` (declines at charge time), `1230`, `123`, click both checkboxes, submit → `/mapas?bienvenida=1`; `select card_brand, card_last4, wompi_payment_source_id from public.subscriptions where consumer_id = …` is filled.
- **Billing run without the cron**: force the trial due (`update public.subscriptions set trial_ends_at = now() - interval '1 minute', next_charge_at = now() - interval '1 minute' where consumer_id = …`), then `POST http://localhost:3000/api/billing/run` with header `x-billing-secret: <BILLING_CRON_SECRET from .env.local>` (a scratch Node script that reads the env file keeps the value out of the transcript). Expect `{"charged":1}` and a `payments` row `pending` with a `wompi_transaction_id`. Sandbox transactions settle a few seconds later; after 2 minutes a second run reports `reconciled` and the subscription is `active` (period end +1 month, attempts 0) or `past_due` (attempts 1, `next_charge_at` +2 days). A wrong header returns 401.
- **Push without a device**: `curl -I http://localhost:3000/manifest.webmanifest` / `/sw.js` / `/icons/icon-192.png` → 200 with the right types. On `/negocios/[id]` as a consumer: `(await navigator.serviceWorker.getRegistration()).active.state === 'activated'`, the `[role=switch]` reflects the `business_followers` row; clicking it off calls `unfollowBusinessAction`; clicking it on in the pane ends in "Las notificaciones están bloqueadas…" because `Notification.permission` is `denied` there. To exercise dispatch, insert a `business_followers` row plus two fake `push_subscriptions` for the consumer (one at `https://updates.push.services.mozilla.com/wpush/v2/<garbage>`, one at an unreachable host, any valid-looking `p256dh`/`auth`), then `POST /api/push/new-coupon` with `x-push-secret` and `{coupon_id, business_id}` of a live coupon: expect `{"followers":1,"sent":0,"failed":1,"stale":[…]}` and the Mozilla row deleted. Wrong secret → 401, non-uuid ids → 400, inactive coupon → `skipped`. Delete the fixtures afterwards.
- **Contacto**: `/contacto` on either app lists the three `CONTACT_LINKS` anchors (Instagram and TikTok with `target="_blank"`, `mailto:` without).
- **Consumer Cuenta**: `/cuenta` as `qa-consumer@` shows the `SubscriptionCard` (`[data-status]`), the profile form and the "Cambiar contraseña" details. Set `#phone` and `requestSubmit()` the form → `[role=status]` "Datos guardados."; new password = current (`QaPassw0rd!` twice) → "La nueva contraseña debe ser diferente a la actual."; mismatched confirmation → `#confirm-error`. Click "Cancelar suscripción" → `[role=alertdialog]` names the access-end date → "Sí, cancelar" → chip `canceled`, `next_charge_at` null, `issue_coupon_token` still works until the date. "Reactivar suscripción" → `/cuenta/tarjeta` (title "Reactivar suscripción"); fill the React-controlled card inputs through the native setter (`4242…`, `1230`, `123`, both checkboxes) → `/cuenta?tarjeta=reactivada`, status back to `trialing`/`active` with the new source. For an **expired** canceled row (`qa-consumer3@`) the same flow lands on `?tarjeta=cobro`, status `past_due` with "Estamos procesando el cobro…", a `pending` payment with a new reference; after 2 minutes `POST /api/billing/run` reports `reconciled: 1` and the row is `active` with `current_period_end` +1 month.
- **Merchant Cuenta**: `/cuenta` as `qa-owner@` (after clearing the consumer cookie at `3001/api/x`): sections "Tu empresa", "Sedes", "Tu perfil". NIT `abc` → `#nit-error` and the other values survive; valid save → "Datos de la empresa guardados."; "Agregar sede" (`#branch-name`, `#branch-address`, lat/lng via native setter) → "Sede agregada." and a third row; `button[aria-label="Quitar Sede QA"]` → back to two. "Quitar" is disabled with one branch and the trigger answers `MIN_BRANCHES` by SQL (pgTAP `0007`). Restore the description afterwards.
- **PWA shell** (either app, signed out): `/` shows the `BrandMark` landing; `fetch('/manifest.webmanifest')` has `id`, `start_url`, 4 icons (one `maskable`) and 2 shortcuts; `HEAD` on `/icons/icon-192.png`, `/icons/icon-maskable-512.png`, `/icons/apple-touch-icon-180.png`, `/icons/icon.svg`, `/sw.js`, `/sin-conexion` → 200; `navigator.serviceWorker.getRegistration()` is `activated` at scope `/` and `caches.open('dm-shell-v1')` (business: `dm-business-shell-v1`) holds `/sin-conexion` + the two icons. Offline fallback: `preview_stop` the dev server, navigate to any page → "Sin conexión" with "Reintentar" (inline-styled). Lighthouse ≥ v12 has no PWA category; real installs need the HTTPS URL and a phone. `InstallHint` only appears when Chrome fires `beforeinstallprompt` (not in the pane) or on iOS Safari; the unit test covers both.
- **Webhook without a tunnel**: build a `transaction.updated` event for a real pending transaction (id, status, `amount_in_cents` = 2 000 000, reference), sign it as `SHA256(id + status + amount + timestamp + WOMPI_EVENTS_SECRET)` (upper-case) in `signature.checksum` and `X-Event-Checksum`, `POST /api/wompi/webhook`: first call `{"ok":true,"result":"applied"}`, same event again `{"duplicate":true}`, altered amount → 401. Three declined outcomes on `4111` (force `next_charge_at` between runs) end in `status = canceled`, `canceled_at` set.

## Playwright

Not installed yet (planned for Phase 9). Until then the recipes above are the e2e coverage.
