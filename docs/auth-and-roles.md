# Auth, roles and route gating

## Model

- Supabase Auth with `@supabase/ssr` cookies. Email/password everywhere; Google OAuth on people-web only (button exists, provider must be configured in the Supabase dashboard). Apple deferred post-launch.
- Roles: `consumer` | `business` | `admin`, stored in `public.profiles.role` **and** mirrored into the JWT `app_metadata.role` by database triggers. `business` is requested by passing `options.data.role = 'business'` to `signUp` (business-web only); everything else becomes `consumer`; `admin` only via SQL.
- Read the role with `roleFromClaims(claims)` from `@org/supabase`.
- Confirmation-email and OAuth links (`emailRedirectTo` / `redirectTo`) use `requestOrigin()` from `@org/supabase/server`: the host the user is actually on (localhost, a Vercel preview, production), not an env var. Supabase only honours that URL if it matches **Auth → URL Configuration → Redirect URLs** in the dashboard; otherwise it silently sends the **Site URL** (which is how a Vercel sign-up once got a `localhost:3000` link). Every deployed hostname needs an entry there (e.g. `https://<app>.vercel.app/**`, or a wildcard for previews).

## Clients (`@org/supabase`)

| Import                                     | Use in                                             | Notes                                                                                                    |
| ------------------------------------------ | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `createBrowserSupabase()` from `./browser` | Client Components                                  | one per tab is fine                                                                                      |
| `createServerSupabase()` from `./server`   | Server Components, Server Actions, Route Handlers  | user session, RLS applies; calls `cookies()` **before** reading env so prerendering bails out to dynamic |
| `createAdminSupabase()` from `./server`    | trusted server code only (billing, webhooks, push) | service role, bypasses RLS, needs `SUPABASE_SECRET_KEY`                                                  |
| `updateSession(request)` from `./proxy`    | each app's `src/proxy.ts`                          | refreshes cookies, returns `{ userId, role, response, redirectTo }`                                      |

Per-request helpers in business-web: `getSession()` and `getOwnBusiness()` in `src/lib/business.ts` are wrapped in React `cache()`; call them freely inside one render.

## Gates

`src/proxy.ts` (Next 16 replaced `middleware.ts`; the exported function is `proxy`, matcher is a string literal, must be statically analyzable):

- unauthenticated + non-public path → `/login?next=<path>`
- people-web: `role === 'business'` → `NEXT_PUBLIC_BUSINESS_APP_URL/inicio`
- business-web: `role === 'consumer'` → `NEXT_PUBLIC_PEOPLE_APP_URL/inicio`; admins are allowed
- signed in on `/`, `/login`, `/registro` → `/inicio`
- `/auth/*` and `/api/*` are skipped (callback, sign-out, webhooks, and a handy place to load a page without redirects); `/sin-conexion` is public in both apps so the service worker can pre-cache it

business-web route groups under `src/app/(app)/`:

- `layout.tsx`: session required (defense in depth).
- `onboarding/`: merchant without a business. Admin → `/admin`; existing business → `/pendiente`.
- `pendiente/`: pending or rejected business copy; verified → `/inicio`.
- `(verified)/layout.tsx`: admin → `/admin`; no business → `/onboarding`; not verified → `/pendiente`. Everything a merchant does day to day (`inicio`, `cupones`, `verificar`, `contacto`, `cuenta`) lives here. `cuenta/` edits the business (owner RLS + `protect_business_verification`), branches (`add_branch`, delete guarded by `branches_min_one`), the profile and the password.
- `admin/`: `notFound()` unless role is admin.

people-web route groups under `src/app/(app)/`:

- `layout.tsx`: session required (defense in depth).
- `(tabs)/`: the shell with `BottomNav` — `mapas/`, `contacto/` (`ContactLinks`), `cuenta/` (subscription card with cancel, profile, password, sign-out). Pages use `pb-20`.
- `negocios/[id]/`, `negocios/[id]/cupones/[couponId]/` and `cuenta/tarjeta/` (update / reactivate card): full-screen pages with a back link, outside the tab shell. `cuenta/tarjeta` needs an existing `subscriptions` row (otherwise → `/suscripcion/tarjeta`).
- `inicio/`: redirects to `/mapas` (the business app and older callbacks still point here). Post-login `HOME` is `/mapas`.

- `(subscribe)/suscripcion/tarjeta/`: session required, **no** `subscriptions` row (otherwise → `/mapas`). This is the trial gate's destination.

Trial gate: `(app)/layout.tsx` looks up the consumer's `subscriptions` row (`getOwnSubscription`, cached per render) and redirects to `/suscripcion/tarjeta` when there is none; admins are exempt. An existing but lapsed subscription still enters the app — the coupon detail shows "Tu suscripción no está activa" when `issue_coupon_token` raises `SUBSCRIPTION_INACTIVE`, and `/cuenta` offers "Reactivar suscripción" (→ `/cuenta/tarjeta`).

Password change (`changePasswordAction` in both apps) calls `supabase.auth.updateUser({ password })` on the user-session client; Supabase rejects reusing the current password ("debe ser diferente"). Email changes are not self-service in the MVP.

## Auth flows

- Server actions in `src/app/auth/actions.ts` (`loginAction`, `signupAction`, `googleAction`, `signOutAction`). They validate with zod from `@org/domain`, return `AuthActionState` (`{ error, fieldErrors, values }`) and `redirect()` on success.
- `next` query param → hidden input → validated as a same-app relative path before redirecting.
- `auth/callback/route.ts` exchanges the OAuth / email-confirmation code and redirects to a validated `next`.
- Sign-up without a session (email confirmation on) redirects to `/login?mensaje=confirma`.

## Gotchas

- Cookies are shared across `localhost` ports in dev.
- `getClaims()` is local verification: deleted users keep a valid token until expiry.
- Server Components that call `createServerSupabase()` become dynamic automatically; add `export const dynamic = 'force-dynamic'` on pages that must never be cached (admin, coupon list).
