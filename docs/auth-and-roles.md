# Auth, roles and route gating

## Model

- Supabase Auth with `@supabase/ssr` cookies. Email/password everywhere; Google OAuth on people-web only (button exists, provider must be configured in the Supabase dashboard). Apple deferred post-launch.
- Roles: `consumer` | `business` | `admin`, stored in `public.profiles.role` **and** mirrored into the JWT `app_metadata.role` by database triggers. `business` is requested by passing `options.data.role = 'business'` to `signUp` (business-web only); everything else becomes `consumer`; `admin` only via SQL.
- Read the role with `roleFromClaims(claims)` from `@org/supabase`.

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
- `/auth/*` and `/api/*` are skipped (callback, sign-out, webhooks, and a handy place to load a page without redirects)

business-web route groups under `src/app/(app)/`:

- `layout.tsx`: session required (defense in depth).
- `onboarding/`: merchant without a business. Admin → `/admin`; existing business → `/pendiente`.
- `pendiente/`: pending or rejected business copy; verified → `/inicio`.
- `(verified)/layout.tsx`: admin → `/admin`; no business → `/onboarding`; not verified → `/pendiente`. Everything a merchant does day to day (`inicio`, `cupones`, later `verificar`, `cuenta`) lives here.
- `admin/`: `notFound()` unless role is admin.

people-web route groups under `src/app/(app)/`:

- `layout.tsx`: session required (defense in depth).
- `(tabs)/`: the shell with `BottomNav` — `mapas/`, `contacto/` (placeholder), `cuenta/` (placeholder + sign-out). Pages use `pb-20`.
- `negocios/[id]/` and `negocios/[id]/cupones/[couponId]/`: full-screen pages with a back link, outside the tab shell.
- `inicio/`: redirects to `/mapas` (the business app and older callbacks still point here). Post-login `HOME` is `/mapas`.

The subscription gate (`/suscripcion/tarjeta` when no `subscriptions` row) arrives in Phase 6; until then the coupon detail shows an inline "Tu suscripción no está activa" card when `issue_coupon_token` raises `SUBSCRIPTION_INACTIVE`.

## Auth flows

- Server actions in `src/app/auth/actions.ts` (`loginAction`, `signupAction`, `googleAction`, `signOutAction`). They validate with zod from `@org/domain`, return `AuthActionState` (`{ error, fieldErrors, values }`) and `redirect()` on success.
- `next` query param → hidden input → validated as a same-app relative path before redirecting.
- `auth/callback/route.ts` exchanges the OAuth / email-confirmation code and redirects to a validated `next`.
- Sign-up without a session (email confirmation on) redirects to `/login?mensaje=confirma`.

## Gotchas

- Cookies are shared across `localhost` ports in dev.
- `getClaims()` is local verification: deleted users keep a valid token until expiry.
- Server Components that call `createServerSupabase()` become dynamic automatically; add `export const dynamic = 'force-dynamic'` on pages that must never be cached (admin, coupon list).
