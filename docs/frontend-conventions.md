# Frontend conventions (Next 16 + React 19 + @org/ui)

## Language and copy

- UI strings in Spanish (es-CO), code and identifiers in English. Labels for enums come from `@org/domain` (`categoryLabel`, `discountTypeLabels`, `verificationStatusLabels`, `subscriptionStatusLabels`, `redemptionReasonMessages`).
- Money via `formatCop` / `formatDiscount` from `@org/domain` (es-CO `Intl`).

## Components (`@org/ui`)

`Button` / `buttonClassName` (variants primary, secondary, ghost, danger; use `buttonClassName` on `next/link`), `ReloadButton`, `InputField`, `TextareaField`, `SelectField`, `FieldShell` + `fieldControlClassName`, `FormError`, `PageShell`, `TopBar` (left back link, title, right slot), `BackIcon`, `Brand` (+ `BrandMark`), `InstallHint`, `EmptyState`, `Toggle` (role=switch), `LoginForm`, `SignupForm`, `ProfileForm` / `PasswordForm` (+ `FormNotice`, the green success banner), `ContactLinks` (renders `CONTACT_LINKS`), `CouponCard`, `BottomNav` (+ `MapIcon`, `ChatIcon`, `UserIcon`, `QrIcon`), `CategoryChips`, `QrCode` (wraps `qrcode.react`).

- **`CouponCard` is the single coupon rendering.** The merchant editor renders it with `preview` and the consumer app renders the same component; never fork it.
- `@org/ui` may import `@org/domain` but nothing from Next (`next/link`, `next/image`); pass `href`s and let apps wrap with `Link` where needed. Use plain `<img>` for user uploads (no Next lint rule applies inside the package).
- `BottomNav` takes `currentPath` and a `LinkComponent`; apps pass `usePathname()` and `next/link` from a small `'use client'` wrapper (`apps/people-web/src/app/(app)/(tabs)/bottom-nav.tsx`). Pages under a tab shell add `pb-20` to `PageShell` so the bar never covers content.
- Add a `'use client'` directive only to components that use hooks or handlers.

`@org/maps` (on `@vis.gl/react-google-maps`): `useGeolocation` (one-shot, Bogotá fallback, `isFallback` + `locate()` for the "Usar mi ubicación" chip), `googleMapsDirectionsUrl` / `wazeUrl`, `BusinessMap` (pins + info window + fitted viewport; placeholder without a key, classic markers without a Map ID) and `PlaceAutocompleteInput` (Places New; wrap it in `FieldShell` and style it with `fieldControlClassName`; `onSelect` fills address, city, lat/lng and `googlePlaceId`). Read `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` / `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` in a **server** component and pass them as props (env inlining is not guaranteed inside transpiled packages). Each component wraps its own `APIProvider`; never render two on one page.

## Payments (people-web only)

- `@org/billing-wompi` is `server-only` and `scope:people`; construct it through `wompiClient()` in `src/lib/billing.ts`, never in client code. Card data is tokenized in the browser by `src/components/card-form.tsx` (JWE via `jose` with the key from `getTokenizationKey()`, falling back to plain JSON) using only `NEXT_PUBLIC_WOMPI_*`; the server receives a `tok_…` token, never the card. `CardForm` takes the server `action`, `submitLabel` and `intro` as props so `/suscripcion/tarjeta` (`startTrialAction`) and `/cuenta/tarjeta` (`updateCardAction`) share it; pages load Wompi's tokens with `getCardCaptureData()` and actions turn the token into a source with `capturePaymentSource()`.
- Charges go through `chargeSubscription()` (one row) whether the hourly run or the update-card action triggers them; it counts the payments already in the period so references never collide after `charge_attempts` is reset.
- Server code that writes `subscriptions`, `payments` or `wompi_events` uses `createAdminSupabase()` (service role). Route handlers under `src/app/api/` authenticate with a shared-secret header (`x-billing-secret`) or the Wompi checksum, never with cookies.
- Money values: the DB and Wompi use COP cents; the UI shows pesos with `formatCop`.

## PWA + push

- Both apps: `public/sw.js` is hand-written and registered by `app/register-sw.tsx` from the root layout; `app/manifest.ts` serves `/manifest.webmanifest` (`id`, `start_url`, PNG + maskable + SVG icons, shortcuts); `proxy.ts` skips `sw.js`, the manifest and `/icons/` and lists `/sin-conexion` as public. The worker pre-caches `/sin-conexion` + two icons and answers failed **navigations** with that page; it caches nothing else (pages depend on the session cookie). Bump the `CACHE` name when the pre-cached files change. The offline page is inline-styled (no stylesheet offline). people-web's worker also handles push + notificationclick.
- Icons: `node scripts/generate-icons.mjs` (sharp, inline SVG "%" map pin) writes `icon-192/512`, `icon-maskable-512`, `apple-touch-icon-180`, `badge-72` and `icon.svg` into both `public/icons/`; `BrandMark` in `@org/ui` is the same drawing for the landings and `Brand`. Replace the PNGs (same names) when the brand assets arrive.
- `InstallHint` (`@org/ui`) only on the signed-out landings: it needs a user gesture for `beforeinstallprompt.prompt()`, shows the share-sheet copy on iOS Safari, and stores its dismissal in `localStorage` (wrapped in try/catch).
- `NotifyToggle` must call `Notification.requestPermission()` inside the click handler (user gesture), then `navigator.serviceWorker.ready` → `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })` with `NEXT_PUBLIC_VAPID_PUBLIC_KEY` converted to a `Uint8Array`. iOS Safari outside an installed PWA has no `PushManager`: show the install sheet instead of an error.
- Never import `web-push` outside `src/lib/push.ts` (`server-only`); the pure fan-out lives in `src/lib/push-dispatch.ts` so it can be unit-tested.

## Browser-only libraries

The QR scanner (`@yudiel/react-qr-scanner`) touches `navigator` at render time: load it from a client component with `next/dynamic(() => import(...).then(m => m.Scanner), { ssr: false })`. Camera and geolocation need a secure context (`localhost` or HTTPS); handle the `permission-denied` / `no-camera` error kinds with a manual fallback (see `/verificar`). Its ZXing WASM fallback (browsers without `BarcodeDetector`) is fetched from a CDN at runtime.

## Forms

Two patterns, pick by complexity:

1. **Simple forms** (auth, onboarding, account settings): plain `<form action={serverAction}>` with `useActionState`. The action returns `AuthActionState` = `{ error?, message?, fieldErrors?, values? }` (`message` is the success notice, rendered by `FormNotice`). **Always echo `values` back on validation failure and set `defaultValue={state.values?.x}`**: React 19 resets uncontrolled inputs after any action, so without this a validation error wipes the form. Settings forms that edit existing data merge `values` over the server-provided defaults (`{ ...values, ...state.values }`).
2. **Rich forms** (coupon editor): `react-hook-form` + `zodResolver(schema from @org/domain)` with `mode: 'onChange'`; `useWatch({ control })` feeds live previews; on submit build a `FormData` and call the server action inside `useTransition`. Numbers use `setValueAs: v => v === '' ? null : Number(v)`.

Server actions: validate again with the same zod schema, use `fieldErrorMap(error)` for per-field messages, write with the user-session client so RLS applies, `revalidatePath` then `redirect`. Map database errors to Spanish (`friendlyDbError` pattern; the `MIN_ACTIVE_COUPONS` trigger hint is already Spanish).

**Browser-driven reads** (nearby list, QR token issue/verify) are also server actions, returning a discriminated union such as `{ rows } | { error }`; the client calls them inside `useTransition` and keeps the result in local state. Both apps have a `server-only` `getSession()` memoized with React `cache()` (`src/lib/session.ts` in people-web, `src/lib/business.ts` in business-web). Guard route params with `isUuid` before they reach a uuid column.

File uploads go through the server action (`serverActions.bodySizeLimit: '4mb'` in `next.config.js`); validate type/size against `LOGO_MIME_TYPES` / `LOGO_MAX_BYTES`; storage paths are `<business_id>/<file>` so the owner-folder storage policy applies.

## Next 16 specifics

- `searchParams` and `params` are Promises: `const p = await searchParams`.
- `src/proxy.ts` instead of middleware; matcher must be a literal.
- Call `cookies()` before anything that can throw during prerender (done inside `createServerSupabase`).
- Set `turbopack.root` to the monorepo root in `next.config.js` (avoids picking up the parent checkout's lockfile).
- `transpilePackages` must list every `@org/*` package the app imports.
- Client components cannot import from `@org/supabase/server` (it is `server-only`).

## Testing

- Domain: jest, pure functions, table tests (`it.each`).
- UI: `@testing-library/react` with plain assertions (`toBeTruthy`, `getAttribute`); no jest-dom installed.
- Apps: one smoke render per app; no Playwright yet (Phase 9).
- Database rules: pgTAP, see [database.md](database.md).

## Style tokens

Defined in `packages/ui/src/theme.css`. Brand (`brand-50..700`), surfaces (`surface`, `surface-muted`, `line`), text (`ink`, `ink-muted`), semantic (`success`, `danger`), radii (`rounded-card`, `rounded-pill`). Mobile-first: `PageShell` is a `max-w-md` column with safe-area padding.
