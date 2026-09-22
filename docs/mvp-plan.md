# Discount Maps — MVP Plan & Progress

> Living document. Every completed step is ticked in the same commit as the code that completes it.
> Decisions that change during implementation go in the [Decision log](#decision-log) at the bottom.
> Working knowledge (conventions, workflows, gotchas) lives in the sibling docs indexed by [AGENTS.md](../AGENTS.md).

## Progress

### Phase 0 — Workspace hygiene + foundations — **Done 2026-09-20** (local Supabase stack pending Docker install)

- [x] 0. Create `docs/mvp-plan.md` and replace README boilerplate
- [x] 1. `.gitignore` env/supabase entries; remove `error.log`
- [x] 2. CI on pnpm without Nx Cloud
- [x] 3. Tailwind v4 in both apps, es-CO layouts, placeholder pages
- [x] 4. Generate `@org/domain`, `@org/supabase`, `@org/ui`, `@org/maps`, `@org/billing-wompi`; wire deps, tags, boundaries
- [x] 5. Supabase CLI + `supabase init`; root `db:*` scripts (`supabase start` blocked: Docker not installed on dev machine; cloud project will be linked instead)
- [x] 6. `.env.example` per app
- [x] 7. Verify: lint/typecheck/test/build green; Tailwind renders

### Phase 1 — Schema + auth + roles — **Done 2026-09-21**

- [x] 1. `0001_init.sql` + `0002_grants.sql` + `0003_hardening.sql` pushed to the cloud project; types generated with `db:types:linked`
- [x] 2. `@org/supabase` clients, `proxy.ts`, login / sign-up / callback, role gates (Google button wired; provider config pending in dashboard)
- [x] 3. pgTAP RLS tests passing on the linked project (via `supabase db query --file`); `@org/domain` tests (50 passing); `db advisors` down to 5 intentional warnings
- [x] 4. Verify: migrations pushed, pgTAP green on the linked project, live login as consumer on people-web, consumer bounced from business-web, anonymous bounced to login (replayed session cookie from Node)

### Phase 2 — Business onboarding + admin verification — **Done 2026-09-21** (address autocomplete deferred to Phase 4, pending Google Maps key)

- [x] 1. `/onboarding` with logo upload and multi-branch entry (address + city + lat/lng with "Usar mi ubicación"; Places autocomplete swaps in once the Maps key exists)
- [x] 2. `/pendiente` (pending/rejected copy); `/admin` approve/reject with history; `(verified)` route group gates the merchant area
- [x] 3. Verify: pgTAP `0003_branches` green; live run on the cloud project: owner onboarding with 2 branches → pending → admin approve → owner reaches /inicio

### Phase 3 — Coupons CRUD + 3-active rule + live preview — **Done 2026-09-21**

- [x] 1. `@org/ui` `CouponCard` (+5 RTL tests), `Toggle`, `TopBar`; business shell (`BottomNav` moves to Phase 4 with the consumer app)
- [x] 2. `/cupones` list with toggles + ≥3 banner; `/cupones/nuevo` and `/cupones/[id]` with react-hook-form + `useWatch` live preview, image upload, delete
- [x] 3. Verify: pgTAP `0004_coupons_min_active` (8 assertions) green; live: 4 coupons created through the editor, one deactivated, remaining switches lock at 3, `businesses_public` lists the business with 3 live coupons

### Phase 4 — Consumer maps + business profile — **Done 2026-09-22 except the map canvas** (Google Maps key + Map ID still missing, see [external-dependencies.md](external-dependencies.md))

- [x] 1. `@org/maps` (`useGeolocation`, `googleMapsDirectionsUrl`, `wazeUrl`, `BusinessMap` **placeholder**); people-web `(tabs)` shell with `BottomNav`; `/mapas` nearby list (category chips, distance/discount sort, Bogotá fallback chip); `/negocios/[id]` with branches, deep links and `CouponCard`s. Still pending the key: real map canvas (`@vis.gl/react-google-maps` not installed), Places autocomplete, `Sheet`
- [x] 2. pgTAP `0005_nearby_businesses` (9 assertions) green on the cloud project
- [x] 3. Verify: static gate green; live as `qa-consumer`: fallback chip, 2 branch rows, "Postres" → empty state, sort toggle, profile with 2 Google Maps + 2 Waze links and 3 coupons

### Phase 5 — QR + scanner — **Done 2026-09-22** (real camera scan on a phone pending an HTTPS tunnel)

- [x] 1. `/negocios/[id]/cupones/[couponId]`: `CouponCard`, rotating `QrCode` (server action `issueCouponTokenAction`, refresh every 60 s, countdown from the token, "Código manual" copy box), description + T&C
- [x] 2. business-web `/verificar`: `@yudiel/react-qr-scanner` via `next/dynamic`, branch selector when >1 branch, green/red result card, "Escanear otro", camera-denied state with manual paste fallback
- [x] 3. pgTAP `0006_qr_tokens` (15 assertions) green
- [x] 4. Verify: live QR rotates at 60 s (new jti, countdown resets); merchant pastes a token → "Cupón válido · QA Consumer · Martes de pizza", replay → "ya fue redimido", tampered → "no es válido", `hola` → "no es un cupón"; 1 redemption row at Sede Chapinero

### Phase 6 — Wompi trial + billing — Not started

- [ ] 1. `@org/billing-wompi` + tests
- [ ] 2. Sign-up card step, `startTrial`, `/suscripcion/tarjeta` gate
- [ ] 3. `/api/billing/run`, `/api/wompi/webhook`, `0002_hooks.sql`
- [ ] 4. Verify in sandbox

### Phase 7 — Push notifications — Not started

- [ ] 1. VAPID, `sw.js`, toggle with iOS install sheet
- [ ] 2. `/api/push/new-coupon` + trigger
- [ ] 3. Verify

### Phase 8 — Contacto / Cuenta / cancel — Not started

- [ ] 1. Shared `ContactPage`
- [ ] 2. Cuenta pages, cancel, update card
- [ ] 3. Verify

### Phase 9 — PWA polish — Not started

- [ ] 1. Manifest, icons, splash/role landing, install hint, offline page
- [ ] 2. Playwright e2e
- [ ] 3. Verify Lighthouse ≥ 90

### Phase 10 — Deploy — Not started

- [ ] 1. Supabase cloud
- [ ] 2. Vercel projects + env
- [ ] 3. Wompi production events, Maps key restrictions
- [ ] 4. Production smoke

---

## Context

Discount Maps is a subscription platform connecting consumers ("Persona") with local merchants ("Empresa") that publish coupons on category-filtered interactive maps. Consumers pay a monthly subscription (first 7 days free, card captured upfront) and show a QR at the store; merchants scan it to confirm the subscription is active. Merchants are manually verified by platform operators and must keep at least 3 active coupons to appear on the map.

The Nx workspace (Nx 23.2, pnpm, TS project references) started with two untouched Next.js 16 scaffolds (`apps/people-web`, `apps/business-web`) and nothing else.

## Decisions

| Area           | Decision                                                                                                                                                                                                                                             |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Platform       | Web-first. `people-web` = consumer PWA, `business-web` = merchant PWA. Role selector (Persona / Empresa) is the people-web landing page linking to business-web. No Expo in MVP.                                                                     |
| Backend        | Supabase: Postgres + PostGIS, Supabase Auth, RLS, Storage, pg_cron + pg_net. **No Edge Functions**: server code runs in Next.js route handlers / server actions (Node) and Postgres functions so it can share workspace packages and be jest-tested. |
| Payments       | Wompi (Colombia, COP). Card on file at sign-up, first charge on day 7, then monthly. No zero-amount verification exists; card validity is proven at first charge.                                                                                    |
| Auth providers | Email/password + Google at launch. Apple Sign-In deferred post-launch (same OAuth callback, provider config only).                                                                                                                                   |
| Maps           | Google Maps Platform via `@vis.gl/react-google-maps`; Places Autocomplete (new `PlaceAutocompleteElement`) for branch addresses.                                                                                                                     |
| Styling        | Tailwind v4, tokens shared from `@org/ui/theme.css`.                                                                                                                                                                                                 |
| UI language    | Spanish (es-CO) strings, English code.                                                                                                                                                                                                               |

---

## 1. Tech stack

- **Apps**: Next.js 16 App Router (Turbopack), React 19, Tailwind v4, `react-hook-form` + `zod`, `@supabase/ssr`, `@vis.gl/react-google-maps`, `qrcode.react`, `@yudiel/react-qr-scanner`, `web-push`.
- **Backend**: Supabase (Postgres 15 + PostGIS, pgcrypto, pg_net, pg_cron, Vault). Local dev via `supabase start` (Docker). pgTAP tests via `supabase test db`.
- **Billing**: Wompi REST (`sandbox.wompi.co` / `production.wompi.co`), server-only client in `@org/billing-wompi`.
- **Hosting**: Vercel (two projects) + Supabase cloud.

## 2. Nx workspace structure

`@nx/react` is not a direct devDependency; add it first: `pnpm add -D @nx/react@23.2.0`.

```bash
pnpm nx g @nx/js:library packages/domain --importPath=@org/domain --bundler=none --unitTestRunner=jest --linter=eslint --tags=type:domain,scope:shared --no-interactive
pnpm nx g @nx/js:library packages/supabase --importPath=@org/supabase --bundler=none --unitTestRunner=none --linter=eslint --tags=type:data,scope:shared --no-interactive
pnpm nx g @nx/react:library packages/ui --importPath=@org/ui --bundler=none --unitTestRunner=jest --style=css --component=false --tags=type:ui,scope:shared --no-interactive
pnpm nx g @nx/react:library packages/maps --importPath=@org/maps --bundler=none --unitTestRunner=jest --style=none --component=false --tags=type:ui,scope:shared --no-interactive
pnpm nx g @nx/js:library packages/billing-wompi --importPath=@org/billing-wompi --bundler=none --unitTestRunner=jest --linter=eslint --tags=type:server,scope:people --no-interactive
```

| Package              | Purpose                                                                                       | Key exports                                                                                                                                                                                                                                                                                       |
| -------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@org/domain`        | Pure rules, no IO. Mirrors SQL logic.                                                         | `MIN_ACTIVE_COUPONS=3`, `canDeactivateCoupon`, `subscriptionAccessUntil`, `isEntitled`, `couponScore`, `CATEGORIES` (es-CO labels), `parseCouponToken`, `redemptionReasonMessages`, zod schemas (`couponSchema`, `businessSignupSchema`, `branchSchema`, `consumerSignupSchema`), `CONTACT_LINKS` |
| `@org/supabase`      | Typed clients. Subpaths `./browser`, `./server` (`server-only`), `./proxy` (`updateSession`). | `Database` types (generated), `createBrowserSupabase`, `createServerSupabase`, `createAdminSupabase`, `updateSession`                                                                                                                                                                             |
| `@org/ui`            | Mobile-first components + `theme.css` (`@theme` tokens only).                                 | `CouponCard` (single card for merchant preview and consumer views), `Button`, `Input`, `Toggle`, `TopBar`, `BottomNav`, `Sheet`, `CategoryChips`, `EmptyState`, `QrCode`, `PageShell`, `ContactPage`                                                                                              |
| `@org/maps`          | Location helpers + map (placeholder until the key exists).                                    | `BusinessMap` (placeholder today), `useGeolocation` (Bogotá fallback), `googleMapsDirectionsUrl`, `wazeUrl`; later `MapsProvider`, `BranchMarker`, `PlaceAutocompleteInput`                                                                                                                       |
| `@org/billing-wompi` | Server-only Wompi client (`import 'server-only'`).                                            | `WompiClient` (`getAcceptanceTokens`, `createPaymentSource`, `createTransaction`, `getTransaction`), `integritySignature`, `verifyEventChecksum`, `WompiEvent` types                                                                                                                              |

Wiring rules (TS-solution setup; never add `paths` to `tsconfig.base.json`):

- Apps declare `"@org/ui": "workspace:*"` etc. in their `package.json`, then `pnpm install`.
- Both `next.config.js`: `transpilePackages: ['@org/domain','@org/supabase','@org/ui','@org/maps','@org/billing-wompi']`.
- `packages/supabase/package.json` gets subpath `exports`; `packages/ui/package.json` exports `./theme.css`.
- `pnpm nx sync` after generation; `pnpm nx run-many -t typecheck lint` must pass.
- Tags: apps get `type:app` + `scope:people` / `scope:business` in their `package.json` `nx.tags`. Constraints in `eslint.config.mjs`:

```js
depConstraints: [
  { sourceTag: 'type:domain', onlyDependOnLibsWithTags: ['type:domain'] },
  {
    sourceTag: 'type:data',
    onlyDependOnLibsWithTags: ['type:domain', 'type:data'],
  },
  {
    sourceTag: 'type:ui',
    onlyDependOnLibsWithTags: ['type:domain', 'type:ui'],
  },
  {
    sourceTag: 'type:server',
    onlyDependOnLibsWithTags: ['type:domain', 'type:data', 'type:server'],
  },
  {
    sourceTag: 'type:app',
    onlyDependOnLibsWithTags: [
      'type:domain',
      'type:data',
      'type:ui',
      'type:server',
    ],
  },
  { sourceTag: 'scope:shared', onlyDependOnLibsWithTags: ['scope:shared'] },
  {
    sourceTag: 'scope:people',
    onlyDependOnLibsWithTags: ['scope:shared', 'scope:people'],
  },
  {
    sourceTag: 'scope:business',
    onlyDependOnLibsWithTags: ['scope:shared', 'scope:business'],
  },
];
```

This makes `business-web → @org/billing-wompi` a lint error by design.

**Tailwind v4**: `pnpm add -w tailwindcss @tailwindcss/postcss postcss`; per app `postcss.config.mjs` with `{ plugins: { '@tailwindcss/postcss': {} } }`; `global.css`:

```css
@import 'tailwindcss';
@import '@org/ui/theme.css';
@source "../../../../packages/ui/src";
@source "../../../../packages/maps/src";
```

## 3. Database schema (`supabase/migrations/0001_init.sql`)

Design notes: SECURITY DEFINER functions use `set search_path = ''`; PostGIS lives in `extensions`; the 3-coupon rule is a trigger (cross-row count, so not a CHECK) that applies only to verified businesses and is bypassed by admins; QR tokens are issued and verified entirely in Postgres with an HMAC secret from Vault; `wompi_events` keyed by checksum gives webhook idempotency; `businesses_public` is the only read model the consumer map uses.

```sql
-- extensions
create extension if not exists postgis  with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_net   with schema extensions;
create extension if not exists pg_cron;

-- enums
create type public.user_role           as enum ('consumer','business','admin');
create type public.subscription_status as enum ('trialing','active','past_due','canceled');
create type public.payment_status      as enum ('pending','approved','declined','voided','error');
create type public.business_category   as enum ('restaurants','beverages','desserts','retail');
create type public.verification_status as enum ('pending','verified','rejected');
create type public.discount_type       as enum ('percentage','fixed','bogo','other');

create function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

-- profiles (1:1 auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'consumer',
  full_name text, phone text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();

create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_role public.user_role := 'consumer';
begin
  if new.raw_user_meta_data->>'role' = 'business' then v_role := 'business'; end if;  -- admin never self-assigned
  insert into public.profiles (id, role, full_name)
  values (new.id, v_role, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create function public.app_role() returns public.user_role language sql stable security definer set search_path = '' as
$$ select role from public.profiles where id = auth.uid() $$;
create function public.is_admin() returns boolean language sql stable security definer set search_path = '' as
$$ select public.app_role() = 'admin' $$;

-- subscriptions (one per consumer)
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  consumer_id uuid not null unique references public.profiles(id) on delete cascade,
  status public.subscription_status not null default 'trialing',
  trial_ends_at timestamptz not null,
  current_period_end timestamptz,
  wompi_payment_source_id bigint,
  wompi_customer_email text not null,
  card_brand text, card_last4 text,
  charge_attempts int not null default 0,
  next_charge_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index subscriptions_due_idx on public.subscriptions (next_charge_at) where status <> 'canceled';
create trigger subscriptions_updated_at before update on public.subscriptions for each row execute function public.set_updated_at();

-- single source of truth for entitlement (mirrored in @org/domain.subscriptionAccessUntil)
create function public.subscription_access_until(s public.subscriptions) returns timestamptz language sql immutable as $$
  select case s.status
    when 'trialing' then s.trial_ends_at
    when 'active'   then s.current_period_end
    when 'past_due' then coalesce(s.current_period_end, s.trial_ends_at) + interval '5 days'
    when 'canceled' then coalesce(s.current_period_end, s.trial_ends_at) end $$;

-- payments
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  reference text not null unique,                 -- sub_<id>_<period_epoch>_<attempt>
  wompi_transaction_id text unique,
  amount_cents bigint not null, currency text not null default 'COP',
  status public.payment_status not null default 'pending',
  attempt int not null default 1,
  period_start timestamptz, period_end timestamptz,
  raw jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index payments_subscription_idx on public.payments (subscription_id, created_at desc);
create trigger payments_updated_at before update on public.payments for each row execute function public.set_updated_at();

-- businesses
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles(id) on delete cascade,
  legal_name text not null, display_name text not null, nit text not null,
  category public.business_category not null,
  logo_path text, description text,
  verification_status public.verification_status not null default 'pending',
  verified_at timestamptz, verified_by uuid references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index businesses_verification_idx on public.businesses (verification_status);
create trigger businesses_updated_at before update on public.businesses for each row execute function public.set_updated_at();

-- owners can never touch verification columns
create function public.protect_business_verification() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if public.is_admin() then return new; end if;
  if tg_op = 'INSERT' then
    new.verification_status := 'pending'; new.verified_at := null; new.verified_by := null;
  else
    new.verification_status := old.verification_status; new.verified_at := old.verified_at; new.verified_by := old.verified_by;
  end if;
  return new;
end $$;
create trigger businesses_protect_verification before insert or update on public.businesses
  for each row execute function public.protect_business_verification();

-- branches (multi-branch)
create table public.branches (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null, address_line text not null, city text not null,
  location extensions.geography(Point, 4326) not null,
  google_place_id text, phone text,
  created_at timestamptz not null default now()
);
create index branches_location_gix on public.branches using gist (location);
create index branches_business_idx on public.branches (business_id);

-- coupons
create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 60),
  description text,
  discount_type public.discount_type not null,
  discount_value numeric(12,2) check (discount_value is null or discount_value >= 0),
  terms text, image_path text,
  is_active boolean not null default true,
  valid_from timestamptz, valid_until timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (discount_type <> 'percentage' or (discount_value between 1 and 100)),
  check (discount_type <> 'fixed' or discount_value > 0)
);
create index coupons_business_active_idx on public.coupons (business_id, is_active);
create index coupons_valid_until_idx on public.coupons (valid_until) where is_active;
create trigger coupons_updated_at before update on public.coupons for each row execute function public.set_updated_at();

create function public.coupon_is_live(c public.coupons) returns boolean language sql stable as $$
  select c.is_active and (c.valid_from is null or c.valid_from <= now()) and (c.valid_until is null or c.valid_until > now()) $$;

-- "best discount" score 0..100 (mirrored in @org/domain.couponScore)
create function public.coupon_score(t public.discount_type, v numeric) returns numeric language sql immutable as $$
  select case t
    when 'percentage' then least(coalesce(v,0), 100)
    when 'fixed'      then least(coalesce(v,0) / 40000.0 * 100, 100)   -- 40,000 COP reference ticket
    when 'bogo'       then 50
    else 0 end $$;

-- MIN 3 live coupons for VERIFIED businesses
create function public.enforce_min_active_coupons() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_verified boolean; v_remaining int;
begin
  if public.is_admin() then return coalesce(new, old); end if;
  if tg_op = 'UPDATE' and not (public.coupon_is_live(old) and not public.coupon_is_live(new)) then return new; end if;
  if tg_op = 'DELETE' and not public.coupon_is_live(old) then return old; end if;
  select verification_status = 'verified' into v_verified from public.businesses where id = old.business_id;
  if not coalesce(v_verified, false) then return coalesce(new, old); end if;
  select count(*) into v_remaining from public.coupons c
   where c.business_id = old.business_id and c.id <> old.id and public.coupon_is_live(c);
  if v_remaining < 3 then
    raise exception 'MIN_ACTIVE_COUPONS' using errcode = 'P0001',
      hint = 'Debes mantener al menos 3 cupones activos. Activa otro antes de desactivar este.';
  end if;
  return coalesce(new, old);
end $$;
create trigger coupons_min_active before update or delete on public.coupons for each row execute function public.enforce_min_active_coupons();

-- redemptions
create table public.redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  consumer_id uuid not null references public.profiles(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  business_id uuid not null references public.businesses(id) on delete cascade,
  scanned_by uuid not null references public.profiles(id),
  subscription_status_at_scan public.subscription_status not null,
  token_jti text not null unique,                  -- replay protection
  scanned_at timestamptz not null default now()
);
create index redemptions_business_idx on public.redemptions (business_id, scanned_at desc);
create index redemptions_consumer_idx on public.redemptions (consumer_id, scanned_at desc);

-- push_subscriptions / business_followers
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  consumer_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique, keys jsonb not null, user_agent text,
  created_at timestamptz not null default now()
);
create index push_subscriptions_consumer_idx on public.push_subscriptions (consumer_id);

create table public.business_followers (
  consumer_id uuid not null references public.profiles(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  notify boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (consumer_id, business_id)
);
create index business_followers_business_idx on public.business_followers (business_id) where notify;

-- wompi_events (webhook idempotency; service role only)
create table public.wompi_events (
  checksum text primary key, event_type text not null, environment text not null,
  wompi_transaction_id text, payload jsonb not null,
  received_at timestamptz not null default now(), processed_at timestamptz
);

-- public read model: verified AND >= 3 live coupons
create view public.businesses_public with (security_invoker = true) as
select b.id, b.display_name, b.category, b.logo_path, b.description, s.active_coupon_count, s.best_score
from public.businesses b
join lateral (
  select count(*) as active_coupon_count,
         coalesce(max(public.coupon_score(c.discount_type, c.discount_value)), 0) as best_score
  from public.coupons c where c.business_id = b.id and public.coupon_is_live(c)
) s on true
where b.verification_status = 'verified' and s.active_coupon_count >= 3;

-- nearby RPC (one row per branch)
create function public.nearby_businesses(
  p_lat double precision, p_lng double precision,
  p_category public.business_category default null,
  p_radius_m integer default 5000, p_sort text default 'distance', p_limit integer default 50
) returns table (
  business_id uuid, branch_id uuid, display_name text, category public.business_category, logo_path text,
  branch_name text, address_line text, lat double precision, lng double precision, distance_m double precision,
  active_coupon_count bigint, best_score numeric
) language sql stable security invoker set search_path = '' as $$
  with o as (select extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography as g)
  select bp.id, br.id, bp.display_name, bp.category, bp.logo_path, br.name, br.address_line,
         extensions.st_y(br.location::extensions.geometry), extensions.st_x(br.location::extensions.geometry),
         extensions.st_distance(br.location, o.g), bp.active_coupon_count, bp.best_score
  from public.businesses_public bp
  join public.branches br on br.business_id = bp.id
  cross join o
  where extensions.st_dwithin(br.location, o.g, p_radius_m) and (p_category is null or bp.category = p_category)
  order by case when p_sort = 'discount' then -bp.best_score else 0 end, br.location <-> o.g
  limit p_limit $$;

-- QR token: 'dm1.<consumer>.<coupon>.<exp_epoch>.<jti>.<hmac_sha256_hex>'; secret in Vault 'qr_token_secret'
create function public.issue_coupon_token(p_coupon_id uuid) returns text language plpgsql security definer set search_path = '' as $$
declare v_secret text; v_sub public.subscriptions; v_exp bigint; v_jti text; v_payload text;
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
  select * into v_sub from public.subscriptions where consumer_id = auth.uid();
  if v_sub.id is null or public.subscription_access_until(v_sub) <= now() then raise exception 'SUBSCRIPTION_INACTIVE'; end if;
  perform 1 from public.coupons c join public.businesses b on b.id = c.business_id
   where c.id = p_coupon_id and public.coupon_is_live(c) and b.verification_status = 'verified';
  if not found then raise exception 'COUPON_UNAVAILABLE'; end if;
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'qr_token_secret';
  v_exp := extract(epoch from now() + interval '90 seconds')::bigint;
  v_jti := encode(extensions.gen_random_bytes(8), 'hex');
  v_payload := auth.uid()::text || '.' || p_coupon_id::text || '.' || v_exp || '.' || v_jti;
  return 'dm1.' || v_payload || '.' || encode(extensions.hmac(v_payload, v_secret, 'sha256'), 'hex');
end $$;

create function public.verify_coupon_token(p_token text, p_branch_id uuid default null) returns jsonb language plpgsql security definer set search_path = '' as $$
declare p text[]; v_secret text; v_expected text; v_consumer uuid; v_coupon uuid; v_exp bigint;
        v_c public.coupons; v_b public.businesses; v_sub public.subscriptions; v_name text;
begin
  if auth.uid() is null then return jsonb_build_object('valid', false, 'reason', 'UNAUTHENTICATED'); end if;
  p := string_to_array(p_token, '.');
  if coalesce(array_length(p, 1), 0) <> 6 or p[1] <> 'dm1' then return jsonb_build_object('valid', false, 'reason', 'MALFORMED'); end if;
  begin v_consumer := p[2]::uuid; v_coupon := p[3]::uuid; v_exp := p[4]::bigint;
  exception when others then return jsonb_build_object('valid', false, 'reason', 'MALFORMED'); end;
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'qr_token_secret';
  v_expected := encode(extensions.hmac(p[2]||'.'||p[3]||'.'||p[4]||'.'||p[5], v_secret, 'sha256'), 'hex');
  if v_expected <> p[6] then return jsonb_build_object('valid', false, 'reason', 'BAD_SIGNATURE'); end if;
  if v_exp < extract(epoch from now()) then return jsonb_build_object('valid', false, 'reason', 'EXPIRED'); end if;
  select * into v_c from public.coupons where id = v_coupon;
  select * into v_b from public.businesses where id = v_c.business_id;
  if v_b.owner_id is distinct from auth.uid() then return jsonb_build_object('valid', false, 'reason', 'WRONG_BUSINESS'); end if;
  if not public.coupon_is_live(v_c) then return jsonb_build_object('valid', false, 'reason', 'COUPON_INACTIVE'); end if;
  select * into v_sub from public.subscriptions where consumer_id = v_consumer;
  if v_sub.id is null or public.subscription_access_until(v_sub) <= now() then return jsonb_build_object('valid', false, 'reason', 'SUBSCRIPTION_INACTIVE'); end if;
  insert into public.redemptions (coupon_id, consumer_id, branch_id, business_id, scanned_by, subscription_status_at_scan, token_jti)
  values (v_coupon, v_consumer, p_branch_id, v_b.id, auth.uid(), v_sub.status, p[5]) on conflict (token_jti) do nothing;
  if not found then return jsonb_build_object('valid', false, 'reason', 'ALREADY_REDEEMED'); end if;
  select full_name into v_name from public.profiles where id = v_consumer;
  return jsonb_build_object('valid', true, 'consumer_name', v_name, 'coupon_title', v_c.title);
end $$;
revoke execute on function public.issue_coupon_token(uuid) from public, anon;
revoke execute on function public.verify_coupon_token(text, uuid) from public, anon;
grant execute on function public.issue_coupon_token(uuid) to authenticated;
grant execute on function public.verify_coupon_token(text, uuid) to authenticated;

-- RLS
alter table public.profiles enable row level security;            alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;            alter table public.businesses enable row level security;
alter table public.branches enable row level security;            alter table public.coupons enable row level security;
alter table public.redemptions enable row level security;         alter table public.push_subscriptions enable row level security;
alter table public.business_followers enable row level security;  alter table public.wompi_events enable row level security; -- no policies

create policy profiles_self_select on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy profiles_self_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid() and role = public.app_role());
create policy subscriptions_self_select on public.subscriptions for select to authenticated using (consumer_id = auth.uid() or public.is_admin());
create policy payments_self_select on public.payments for select to authenticated
  using (exists (select 1 from public.subscriptions s where s.id = subscription_id and s.consumer_id = auth.uid()) or public.is_admin());
create policy businesses_read on public.businesses for select to authenticated using (owner_id = auth.uid() or public.is_admin() or verification_status = 'verified');
create policy businesses_owner_insert on public.businesses for insert to authenticated with check (owner_id = auth.uid() and public.app_role() = 'business');
create policy businesses_owner_update on public.businesses for update to authenticated using (owner_id = auth.uid() or public.is_admin()) with check (owner_id = auth.uid() or public.is_admin());
create policy branches_read on public.branches for select to authenticated
  using (exists (select 1 from public.businesses b where b.id = business_id and (b.owner_id = auth.uid() or public.is_admin() or b.verification_status = 'verified')));
create policy branches_owner_write on public.branches for all to authenticated
  using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));
create policy coupons_read on public.coupons for select to authenticated
  using (exists (select 1 from public.businesses b where b.id = business_id
         and (b.owner_id = auth.uid() or public.is_admin() or (b.verification_status = 'verified' and public.coupon_is_live(coupons)))));
create policy coupons_owner_write on public.coupons for all to authenticated
  using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));
create policy redemptions_read on public.redemptions for select to authenticated
  using (consumer_id = auth.uid() or public.is_admin() or exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));
create policy push_self_all on public.push_subscriptions for all to authenticated using (consumer_id = auth.uid()) with check (consumer_id = auth.uid());
create policy followers_self_all on public.business_followers for all to authenticated using (consumer_id = auth.uid()) with check (consumer_id = auth.uid());
create policy followers_business_read on public.business_followers for select to authenticated
  using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));

-- storage
insert into storage.buckets (id, name, public) values ('logos','logos',true), ('coupon-images','coupon-images',true);
create policy logos_public_read on storage.objects for select using (bucket_id in ('logos','coupon-images'));
create policy logos_owner_write on storage.objects for all to authenticated
  using (bucket_id in ('logos','coupon-images') and exists (select 1 from public.businesses b where b.owner_id = auth.uid() and (storage.foldername(name))[1] = b.id::text))
  with check (bucket_id in ('logos','coupon-images') and exists (select 1 from public.businesses b where b.owner_id = auth.uid() and (storage.foldername(name))[1] = b.id::text));
```

`supabase/migrations/0002_hooks.sql` (pg_net trigger + pg_cron, URLs/secrets from Vault):

```sql
create function public.notify_new_coupon() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'people_web_url') || '/api/push/new-coupon',
    headers := jsonb_build_object('Content-Type','application/json','x-push-secret',(select decrypted_secret from vault.decrypted_secrets where name = 'push_dispatch_secret')),
    body := jsonb_build_object('coupon_id', new.id, 'business_id', new.business_id));
  return new;
end $$;
create trigger coupons_notify_followers after insert on public.coupons for each row execute function public.notify_new_coupon();

select cron.schedule('billing-run-hourly', '0 * * * *', $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'people_web_url') || '/api/billing/run',
    headers := jsonb_build_object('Content-Type','application/json','x-billing-secret',(select decrypted_secret from vault.decrypted_secrets where name = 'billing_cron_secret')),
    body := jsonb_build_object('triggered_at', now())); $$);
```

`supabase/seed.sql` (local only): `vault.create_secret(...)` for `people_web_url` (`http://host.docker.internal:3000`), `billing_cron_secret`, `push_dispatch_secret`, `qr_token_secret`; promote one user to `admin`; sample verified business with 3 coupons and 2 branches in Bogotá.

## 4. Business rules & state

| Rule                                                                                                                                                                                                                                                                                                             | Where enforced                                                                                                                 |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **7-day trial gate**: no `subscriptions` row → consumer is redirected to `/suscripcion/tarjeta` until card is captured and payment source created. Trial starts only when the row exists.                                                                                                                        | `proxy.ts` (people-web) + server actions re-check                                                                              |
| **Entitlement**: `access_until` = trial end (trialing), period end (active), period end + 5 days grace (past_due), period end (canceled).                                                                                                                                                                        | `subscription_access_until()` SQL, mirrored `@org/domain.subscriptionAccessUntil`; consumed by QR issue/verify and route gates |
| **Billing**: hourly cron charges subs with `next_charge_at <= now()` and `charge_attempts < 3`; retry every 2 days; webhook `APPROVED` → `active`, `+1 month`, attempts reset; `DECLINED/ERROR/VOIDED` → `past_due`, `canceled` after 3 attempts. Cancel keeps access until `access_until`.                      | `/api/billing/run`, `/api/wompi/webhook` (people-web), `wompi_events` idempotency                                              |
| **Role**: set by `handle_new_user` from signup metadata; `admin` only via SQL. people-web bounces `business` users to business-web and vice-versa.                                                                                                                                                               | trigger + `proxy.ts` in both apps                                                                                              |
| **Admin verification**: owners can't modify `verification_status`; admins approve/reject at `/admin` in business-web. Pending → `/pendiente` read-only.                                                                                                                                                          | `protect_business_verification` trigger + RLS + route gate                                                                     |
| **≥3 active coupons**: verified business cannot deactivate/delete a live coupon if it would leave <3 (DB error `MIN_ACTIVE_COUPONS`, Spanish hint). Pending businesses build up freely. Map visibility requires verified AND ≥3 live via `businesses_public`. UI disables toggle at 3 via `canDeactivateCoupon`. | trigger + view + `@org/domain`                                                                                                 |
| **QR validation**: 90 s HMAC token issued in SQL; consumer refreshes every 60 s; merchant `verify_coupon_token` checks signature, expiry, ownership, coupon live, entitlement, replay (`token_jti` unique), inserts redemption, returns reason code.                                                             | SQL functions; reason → es-CO via `redemptionReasonMessages`                                                                   |
| **Best-discount sort**: percentage → value; fixed → value/40,000 COP × 100 capped; bogo → 50; other → 0. Business score = max over live coupons, tie-break by distance.                                                                                                                                          | `coupon_score()` SQL + `@org/domain.couponScore`                                                                               |
| **Nearest**: geolocation on first tap; deny/timeout → Bogotá (4.7110, -74.0721), 10 km, "Ubicación no disponible" chip.                                                                                                                                                                                          | `@org/maps.useGeolocation`                                                                                                     |

## 5. Integrations

**Auth** (`@supabase/ssr`): `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; `updateSession` runs in `apps/<app>/src/proxy.ts` (Next 16 replaced `middleware.ts`; exported function `proxy`, matcher excludes `_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|icons`). OAuth: `signInWithOAuth` → `app/auth/callback/route.ts` → `exchangeCodeForSession` → gates. Google via Cloud OAuth client with redirect `https://<project>.supabase.co/auth/v1/callback`. Business sign-up passes `options.data.role = 'business'`.

**Wompi** (verified at docs.wompi.co, 2026-09-20):

- Browser: `POST /v1/tokens/cards` with public key (card never hits our server); `GET /v1/merchants/info` (header `x-merchant-public-key`) for `presigned_acceptance` + `presigned_personal_data_auth` tokens and permalinks the user must accept. The path form `/v1/merchants/{public_key}` is deprecated (shuts off 2026-10-31).
- Server: `POST /v1/payment_sources` `{type:'CARD', token, customer_email, acceptance_token, accept_personal_auth}` → `data.id` (bigint), `status: AVAILABLE` (or `PENDING` if 3DS enforced on the merchant). Charges: `POST /v1/transactions` `{amount_in_cents, currency:'COP', signature, customer_email, payment_method:{installments:1}, reference, payment_source_id, recurrent:true}`; `signature = SHA256(reference + amount_in_cents + currency + integrity_secret)`.
- Webhook: event `transaction.updated`; checksum = SHA256(values of `signature.properties` in order + `timestamp` + events secret), also in `X-Event-Checksum`; respond 200; retries at 30 min / 3 h / 24 h.
- Unverified until sandbox (Phase 6): whether `/v1/tokens/cards` requires the JWE-encrypted payload (`GET /v1/tokens/keys/tokenization`, then `jose` in browser), exact `sessionId`/`deviceID` fields from WompiJs, test card numbers.

**Maps**: `@vis.gl/react-google-maps`, Map ID for `AdvancedMarker`; `PlaceAutocompleteElement` (legacy Autocomplete unavailable to new customers) restricted to `country: 'co'`, `fetchFields(['location','formattedAddress','id','addressComponents'])`; Geocoding API only as fallback for typed addresses. Deep links: `https://www.google.com/maps/dir/?api=1&destination=<lat>,<lng>&destination_place_id=<id>`, `https://waze.com/ul?ll=<lat>,<lng>&navigate=yes`.

**QR**: render with `qrcode.react` (`QRCodeSVG`, level M); scan with `@yudiel/react-qr-scanner` (native `BarcodeDetector` + ZXing WASM fallback, iOS Safari 14.5+), `formats={['qr_code']}`, rear camera, `paused` while RPC in flight.

**PWA + Push**: `app/manifest.ts` + hand-written `public/sw.js` (install/activate/push/notificationclick, no fetch handler), `register-sw.tsx` in root layout, `appleWebApp` metadata. Toggle on business profile: `Notification.requestPermission()` inside click → `pushManager.subscribe` with `NEXT_PUBLIC_VAPID_PUBLIC_KEY` → upsert `push_subscriptions` + `business_followers`. iOS: Web Push only for Home-Screen-installed PWAs (16.4+); when not standalone show an "Añadir a pantalla de inicio" sheet instead. Sending: `coupons` AFTER INSERT → pg_net → `/api/push/new-coupon` → `web-push`; delete subscription on 404/410.

**Live coupon preview**: `useForm` with `zodResolver(couponSchema)` from `@org/domain`, `mode: 'onChange'`; `useWatch({ control })` feeds `<CouponCard coupon={draft} preview />` at the top of the form. Same `CouponCard` renders in the consumer profile and coupon detail. Server action `upsertCoupon` re-validates with the same schema and writes with the user session (RLS applies).

**Secrets matrix**

- people-web server env: `WOMPI_PRIVATE_KEY`, `WOMPI_INTEGRITY_SECRET`, `WOMPI_EVENTS_SECRET`, `WOMPI_API_URL`, `SUPABASE_SECRET_KEY`, `BILLING_CRON_SECRET`, `PUSH_DISPATCH_SECRET`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `SUBSCRIPTION_PRICE_COP`. Public: `NEXT_PUBLIC_WOMPI_PUBLIC_KEY`, `NEXT_PUBLIC_WOMPI_API_URL`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.
- Both apps public: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_BUSINESS_APP_URL` / `NEXT_PUBLIC_PEOPLE_APP_URL`.
- business-web: no Wompi secrets.
- Supabase Vault: `people_web_url`, `billing_cron_secret`, `push_dispatch_secret`, `qr_token_secret`.

## 6. Roadmap

Each phase ends with its verification; do not start the next until green. Commands from repo root. Progress is tracked in the checklist at the top of this file.

**Phase 0 — Workspace hygiene + foundations** 0. Create `docs/mvp-plan.md`; replace README boilerplate.

1. `.gitignore`: add `.env`, `.env.*`, `!.env.example`, `supabase/.temp`, `supabase/.branches`. `git rm error.log`.
2. Rewrite `.github/workflows/ci.yml`: `pnpm/action-setup@v4`, `setup-node@v5` with `cache: pnpm`, `pnpm install --frozen-lockfile`, `pnpm nx format:check`, `pnpm nx affected -t lint test typecheck build --base=origin/main`. Remove `nx start-ci-run`, `nx record`, `nx fix-ci`, `e2e`.
3. Tailwind v4 in both apps (section 2); replace welcome pages with placeholders; `lang="es-CO"`.
4. Generate the five packages; `transpilePackages`, `workspace:*` deps, tags, eslint constraints; `pnpm nx sync`.
5. `pnpm add -Dw supabase`; `pnpm supabase init`; `pnpm supabase start`. Root scripts `db:start`, `db:reset`, `db:types` (`supabase gen types typescript --local > packages/supabase/src/database.types.ts`), `db:test`.
6. `.env.example` per app (full matrix above); `.env.local` untracked.
7. Verify: `pnpm nx run-many -t lint typecheck test build` green; `pnpm nx dev people-web` shows Tailwind styling; `supabase status` up.

**Phase 1 — Schema + auth + roles**

1. `0001_init.sql`, `seed.sql`; `pnpm db:reset && pnpm db:types`.
2. `@org/supabase` clients + `updateSession`; `proxy.ts` in both apps; login / sign-up / `auth/callback` routes; role gates; Google provider config.
3. pgTAP `rls_profiles.sql`, `rls_businesses.sql`. `@org/domain` entitlement tests.
4. Verify: `pnpm db:test`; consumer cannot open business-web and vice-versa; `pnpm nx test domain`.

**Phase 2 — Business onboarding + admin verification**

1. business-web `/onboarding`: company form, logo upload to `logos/<business_id>/`, multiple branches with `PlaceAutocompleteInput`; insert `businesses` + `branches` (`st_point(lng, lat)`).
2. `/pendiente` page; `/admin` (role admin) listing pending businesses with approve/reject.
3. Verify: pgTAP for verification trigger; manual: sign up → pending → approve → dashboard unlocks.

**Phase 3 — Coupons CRUD + 3-active rule + live preview**

1. `@org/ui` `CouponCard`, `Toggle`, `TopBar`, `BottomNav`; business shell (Cupones / Verificar Cliente / Contacto / Cuenta).
2. Coupon list with toggles + "≥3 activos" banner; create/edit page with live preview; server actions.
3. Verify: `pnpm nx test ui domain`; pgTAP `coupons_min_active.sql`; Spanish toast on the DB error.

**Phase 4 — Consumer maps + business profile**

1. `@org/maps`; people-web shell (Mapas / Contacto / Cuenta); `/mapas` with category chips, sort, geolocation fallback, markers + bottom sheet list; `/negocios/[id]` with map, deep links, coupons, back button.
2. pgTAP `nearby_businesses.sql` (2-coupon business hidden, 3-coupon shown; radius, category, sort).
3. Verify: `pnpm db:test`; deny location → Bogotá fallback.

**Phase 5 — QR + scanner**

1. `/negocios/[id]/cupones/[couponId]`: card top, `QrCode` with 60 s refresh + countdown, description/T&C bottom.
2. business-web `/verificar` with scanner, branch selector if >1 branch, green/red result card, "Escanear otro".
3. pgTAP `qr_tokens.sql`: valid, replay, tampered, wrong business, inactive subscription.
4. Verify: `pnpm db:test`; two phones over LAN with an HTTPS tunnel (camera + geolocation need a secure context).

**Phase 6 — Wompi trial + billing**

1. `@org/billing-wompi` + jest (`integritySignature` against the documented example hash `37c8407747e595535433ef8f6a811d853cd943046624a0ec04662b17bbf33bf5`, `verifyEventChecksum`).
2. Resolve tokenization payload format in sandbox; sign-up card step with acceptance permalinks; `startTrial` server action; `/suscripcion/tarjeta` gate (also for OAuth sign-ups).
3. `/api/billing/run`, `/api/wompi/webhook`, `0002_hooks.sql`; register tunnel URL in Wompi sandbox.
4. Verify: sandbox run with `trial_ends_at` in the past → transaction → webhook flips `active`; decline path → `past_due` → 3 attempts → `canceled`; replayed webhook no-op.

**Phase 7 — Push notifications**

1. VAPID keys (`npx web-push generate-vapid-keys`), `sw.js`, `register-sw.tsx`, toggle with iOS install sheet.
2. `/api/push/new-coupon`; trigger from `0002_hooks.sql`.
3. Verify: new coupon → notification on Android Chrome and installed iOS PWA; 410 cleanup unit test.

**Phase 8 — Contacto / Cuenta / cancel**

1. Shared `ContactPage` (`CONTACT_LINKS`) in both apps.
2. Cuenta: profile edit, password change, business data edit (business-web), subscription card with `access_until`, "Cancelar suscripción", "Actualizar tarjeta" (re-tokenize + new payment source).
3. Verify: pgTAP profile RLS; cancel keeps access until period end.

**Phase 9 — PWA polish**

1. `manifest.ts`, icons 192/512/maskable, `appleWebApp`, people-web `/` = splash + Persona/Empresa landing (Empresa → `NEXT_PUBLIC_BUSINESS_APP_URL`), install hint, "Sin conexión" page.
2. Add Playwright: `pnpm add -D @nx/playwright@23.2.0 && pnpm nx g @nx/playwright:configuration --project=people-web`; one e2e: business sign-up → admin verify → coupon → consumer map → QR scan.
3. Verify: Lighthouse PWA ≥ 90 both apps; installs on Android + iOS.

**Phase 10 — Deploy**

1. Supabase cloud: `supabase link`, `supabase db push`, Vault secrets with production values, Google provider, Site URL + redirect URLs for both domains.
2. Vercel: two projects, Root Directory `apps/people-web` / `apps/business-web`, "Include source files outside of the Root Directory", `pnpm install --frozen-lockfile`, build `pnpm nx build <app>`, `NX_DAEMON=false`, env matrix.
3. Wompi production event URL; Google Maps key referrer restrictions.
4. Verify: production smoke of both flows end to end.

## 7. Testing strategy

- `@org/domain`: jest entitlement matrix, `canDeactivateCoupon`, `couponScore`, `parseCouponToken`, zod schemas.
- `@org/ui`: RTL for `CouponCard` (all discount types, es-CO), `Toggle`, form preview updates.
- `@org/billing-wompi`: jest with mocked `fetch`; signature/checksum; webhook state-machine table test.
- Database: pgTAP under `supabase/tests/*.sql` impersonating users (`set local role authenticated; set local request.jwt.claims = '{"sub":"<uuid>"}'`) for RLS, triggers, view, RPC, QR functions. CI job: `supabase/setup-cli` → `supabase start` → `supabase test db`.
- Apps: one smoke render per app; Playwright e2e added in Phase 9.

## 8. Verification (end to end)

1. `pnpm nx run-many -t lint typecheck test build` green; `pnpm db:test` green.
2. Business: sign up → pending → admin approves → create 3 coupons with live preview → try to deactivate one → Spanish error → business appears on consumer map.
3. Consumer: sign up with sandbox card → trial row → map by category, nearest and best discounts → business profile → deep links → coupon QR.
4. Merchant scans QR → valid; scan again → "ya redimido"; expired subscription → invalid.
5. Sandbox billing: force trial end → charge → webhook → `active`; decline → `past_due` → `canceled`.
6. Push: new coupon → notification on Android and installed iOS PWA.
7. Lighthouse PWA ≥ 90 on both apps.

## 9. Open items the user must supply (not blocking Phase 0–5)

1. Google Cloud project with Maps JS, Places (New), Geocoding, Map ID, OAuth client. Owner?
2. Wompi merchant account: sandbox keys now, production after KYC; confirm 3DS not enforced and recurring/COF allowed.
3. Subscription price in COP (`SUBSCRIPTION_PRICE_COP`).
4. Confirm retry policy: 5-day grace, 3 attempts 2 days apart, then cancel.
5. Who is admin (promoted via SQL; no invite UI in MVP).
6. Two hostnames (e.g. `app.<brand>.co`, `negocios.<brand>.co`).
7. Email confirmation on sign-up: on or off for MVP (assume off).
8. Fixed-amount coupon reference ticket 40,000 COP: confirm or per-category.
9. Contact links (WhatsApp, Instagram, TikTok) and brand assets (logo, icons, colors) by Phase 8/9.

---

## Decision log

| Date       | Decision                                                                                                                                                                                            | Reason                                                                                                                                                  |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-20 | Web-first PWAs on the two existing Next.js apps; no Expo in MVP.                                                                                                                                    | Fastest path to a usable build; camera, QR and push all work in the browser.                                                                            |
| 2026-09-20 | Supabase without Edge Functions; server code in Next route handlers + Postgres functions.                                                                                                           | Single runtime that can import workspace packages and be jest-tested.                                                                                   |
| 2026-09-20 | Wompi for Colombia; card on file at sign-up, first charge on day 7.                                                                                                                                 | Matches the free-trial spec; Wompi has no zero-amount verification.                                                                                     |
| 2026-09-20 | Apple Sign-In deferred post-launch.                                                                                                                                                                 | Requires Apple Developer account and 6-month secret rotation; not needed for first users.                                                               |
| 2026-09-20 | Develop against the linked Supabase cloud project; local stack optional until Docker is installed.                                                                                                  | Docker is not available on the dev machine; the user already created the cloud project.                                                                 |
| 2026-09-20 | Package-internal imports are extension-less with `moduleResolution: bundler` (not nodenext `.js` suffixes).                                                                                         | Turbopack does not map `.js` specifiers onto `.ts` sources in transpiled workspace packages.                                                            |
| 2026-09-20 | User role is mirrored into JWT `app_metadata` by database triggers.                                                                                                                                 | Lets `proxy.ts` gate routes from claims without a database round-trip per request.                                                                      |
| 2026-09-20 | pgTAP files run against the linked project with `supabase db query --file` (last result row + empty `finish()` = pass); CI runs `supabase test db` on a Docker-backed local stack.                  | `supabase test db --linked` still needs Docker, which the dev machine lacks.                                                                            |
| 2026-09-20 | Explicit table grants + PUBLIC execute revoked in migrations 0002/0003.                                                                                                                             | The cloud project did not apply Supabase's default data grants to `authenticated`/`service_role`; advisors flagged PUBLIC-executable trigger functions. |
| 2026-09-21 | Admin-only triggers use `is_privileged()`: no JWT claims (direct SQL) or a service_role JWT bypass; `current_user` cannot be used inside SECURITY DEFINER.                                          | Operators verifying from the dashboard SQL editor were silently blocked; `current_user` is the function owner in definer context.                       |
| 2026-09-21 | Failed server-action submits echo `values` back into `defaultValue` props.                                                                                                                          | React 19 resets uncontrolled form fields after any action, wiping what the user typed on a validation error.                                            |
| 2026-09-21 | QA accounts `qa-owner@` / `qa-admin@discountmaps.test` (business "Pizzas del Norte", verified, 2 branches) stay on the cloud project as development fixtures; delete before launch.                 | Needed by Phases 3–5 for coupons, maps and QR testing.                                                                                                  |
| 2026-09-21 | Knowledge base split into `docs/*.md` indexed by `AGENTS.md`; `CLAUDE.md` is a pointer.                                                                                                             | Lets agents load only the context a task needs; the tool-generated Nx block moved to `docs/nx-guidelines.md`.                                           |
| 2026-09-20 | Google Maps Platform with `@vis.gl/react-google-maps`.                                                                                                                                              | Best POI/address data for Colombia; official React library.                                                                                             |
| 2026-09-22 | `BusinessMap` in `@org/maps` is a placeholder ("Mapa no disponible") with the final props; `@vis.gl/react-google-maps` is not installed until the key exists. `Sheet` deferred.                     | Nothing to render or verify without a key; keeping the props stable makes the swap local to one file.                                                   |
| 2026-09-22 | people-web shell is a `(app)/(tabs)` route group with `BottomNav` (Mapas / Contacto / Cuenta); `/inicio` redirects to `/mapas`, which is also the post-login home. `/negocios/*` stays login-gated. | Consumers land on the product immediately; the coupons RLS is `authenticated`-only anyway.                                                              |
| 2026-09-22 | Browser-driven reads (`nearbyBusinessesAction`, `issueCouponTokenAction`, `verifyCouponTokenAction`) are server actions returning `{ data } \| { error }`.                                          | Same pattern as the coupon actions; RLS applies through the user-session client; no browser Supabase client bundle.                                     |
| 2026-09-22 | Cloud fixtures: Vault `qr_token_secret` (random value generated inside SQL, never seen by an agent) and `qa-consumer@discountmaps.test` (`QaPassw0rd!`, trialing 30 days). Delete before launch.    | Phase 5 cannot run without the secret; Wompi (Phase 6) is the only other way to create a subscription row.                                              |
| 2026-09-22 | `scripts/pgtap-remote.mjs` honours `SUPABASE_PROJECT_REF` (adds `--project-ref`).                                                                                                                   | Git worktrees are not linked; `--linked` alone fails there.                                                                                             |
| 2026-09-22 | `/verificar` always offers a manual-paste form (open by default when the camera fails); the coupon detail exposes a "Código manual" copy box.                                                       | The in-app browser and LAN devices have no camera or no secure context; it is also the only way to verify the flow without two phones.                  |
