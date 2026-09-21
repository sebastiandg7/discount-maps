-- Discount Maps — initial schema.
-- Conventions: SECURITY DEFINER functions pin search_path = '' and fully qualify names.
-- PostGIS / pgcrypto / pg_net live in the `extensions` schema on Supabase.

-- ===== extensions =====
create extension if not exists postgis  with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_net   with schema extensions;
create extension if not exists pg_cron;

-- ===== enums =====
create type public.user_role           as enum ('consumer', 'business', 'admin');
create type public.subscription_status as enum ('trialing', 'active', 'past_due', 'canceled');
create type public.payment_status      as enum ('pending', 'approved', 'declined', 'voided', 'error');
create type public.business_category   as enum ('restaurants', 'beverages', 'desserts', 'retail');
create type public.verification_status as enum ('pending', 'verified', 'rejected');
create type public.discount_type       as enum ('percentage', 'fixed', 'bogo', 'other');

-- ===== helpers =====
create function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ===== profiles (1:1 auth.users) =====
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  role       public.user_role not null default 'consumer',
  full_name  text,
  phone      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Role comes from sign-up metadata ('business' only when the merchant app asks for it).
-- 'admin' can never be self-assigned. The role is mirrored into app_metadata so the JWT
-- carries it and route gates need no database round-trip.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_role public.user_role := 'consumer';
begin
  if new.raw_user_meta_data->>'role' = 'business' then
    v_role := 'business';
  end if;
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    v_role,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  );
  update auth.users
     set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', v_role)
   where id = new.id;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.sync_role_to_auth() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update auth.users
     set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', new.role)
   where id = new.id;
  return new;
end $$;
create trigger profiles_sync_role after update of role on public.profiles
  for each row execute function public.sync_role_to_auth();

create function public.app_role() returns public.user_role
language sql stable security definer set search_path = '' as
$$ select role from public.profiles where id = auth.uid() $$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as
$$ select public.app_role() = 'admin' $$;

-- ===== subscriptions (one per consumer) =====
create table public.subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  consumer_id             uuid not null unique references public.profiles(id) on delete cascade,
  status                  public.subscription_status not null default 'trialing',
  trial_ends_at           timestamptz not null,
  current_period_end      timestamptz,
  wompi_payment_source_id bigint,
  wompi_customer_email    text not null,
  card_brand              text,
  card_last4              text,
  charge_attempts         int not null default 0,
  next_charge_at          timestamptz,
  canceled_at             timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create index subscriptions_due_idx on public.subscriptions (next_charge_at) where status <> 'canceled';
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- Single source of truth for entitlement (mirrored in @org/domain subscriptionAccessUntil).
create function public.subscription_access_until(s public.subscriptions) returns timestamptz
language sql immutable as $$
  select case s.status
    when 'trialing' then s.trial_ends_at
    when 'active'   then s.current_period_end
    when 'past_due' then coalesce(s.current_period_end, s.trial_ends_at) + interval '5 days'
    when 'canceled' then coalesce(s.current_period_end, s.trial_ends_at)
  end
$$;

-- ===== payments =====
create table public.payments (
  id                   uuid primary key default gen_random_uuid(),
  subscription_id      uuid not null references public.subscriptions(id) on delete cascade,
  reference            text not null unique,      -- sub_<id>_<period_epoch>_<attempt>
  wompi_transaction_id text unique,
  amount_cents         bigint not null,
  currency             text not null default 'COP',
  status               public.payment_status not null default 'pending',
  attempt              int not null default 1,
  period_start         timestamptz,
  period_end           timestamptz,
  raw                  jsonb,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index payments_subscription_idx on public.payments (subscription_id, created_at desc);
create trigger payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();

-- ===== businesses =====
create table public.businesses (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid not null unique references public.profiles(id) on delete cascade,
  legal_name          text not null,
  display_name        text not null,
  nit                 text not null,
  category            public.business_category not null,
  logo_path           text,
  description         text,
  verification_status public.verification_status not null default 'pending',
  verified_at         timestamptz,
  verified_by         uuid references public.profiles(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index businesses_verification_idx on public.businesses (verification_status);
create trigger businesses_updated_at before update on public.businesses
  for each row execute function public.set_updated_at();

-- Owners can never touch the verification columns; only admins can.
create function public.protect_business_verification() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if public.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.verification_status := 'pending';
    new.verified_at := null;
    new.verified_by := null;
  else
    new.verification_status := old.verification_status;
    new.verified_at := old.verified_at;
    new.verified_by := old.verified_by;
  end if;
  return new;
end $$;
create trigger businesses_protect_verification before insert or update on public.businesses
  for each row execute function public.protect_business_verification();

-- ===== branches (a business can have many) =====
create table public.branches (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references public.businesses(id) on delete cascade,
  name            text not null,
  address_line    text not null,
  city            text not null,
  location        extensions.geography(Point, 4326) not null,
  google_place_id text,
  phone           text,
  created_at      timestamptz not null default now()
);
create index branches_location_gix on public.branches using gist (location);
create index branches_business_idx on public.branches (business_id);

-- ===== coupons =====
create table public.coupons (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references public.businesses(id) on delete cascade,
  title          text not null check (char_length(title) between 3 and 60),
  description    text,
  discount_type  public.discount_type not null,
  discount_value numeric(12,2) check (discount_value is null or discount_value >= 0),
  terms          text,
  image_path     text,
  is_active      boolean not null default true,
  valid_from     timestamptz,
  valid_until    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (discount_type <> 'percentage' or (discount_value between 1 and 100)),
  check (discount_type <> 'fixed' or discount_value > 0)
);
create index coupons_business_active_idx on public.coupons (business_id, is_active);
create index coupons_valid_until_idx on public.coupons (valid_until) where is_active;
create trigger coupons_updated_at before update on public.coupons
  for each row execute function public.set_updated_at();

create function public.coupon_is_live(c public.coupons) returns boolean
language sql stable as $$
  select c.is_active
     and (c.valid_from  is null or c.valid_from  <= now())
     and (c.valid_until is null or c.valid_until >  now())
$$;

-- "Best discount" score 0..100 (mirrored in @org/domain couponScore).
create function public.coupon_score(t public.discount_type, v numeric) returns numeric
language sql immutable as $$
  select case t
    when 'percentage' then least(coalesce(v, 0), 100)
    when 'fixed'      then least(coalesce(v, 0) / 40000.0 * 100, 100)   -- 40,000 COP reference ticket
    when 'bogo'       then 50
    else 0
  end
$$;

-- Verified businesses must keep at least 3 live coupons. A trigger (not a CHECK) because the
-- rule counts other rows. Pending businesses can build up freely; admins bypass.
create function public.enforce_min_active_coupons() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_verified  boolean;
  v_remaining int;
begin
  if public.is_admin() then
    return coalesce(new, old);
  end if;
  if tg_op = 'UPDATE' and not (public.coupon_is_live(old) and not public.coupon_is_live(new)) then
    return new;
  end if;
  if tg_op = 'DELETE' and not public.coupon_is_live(old) then
    return old;
  end if;
  select verification_status = 'verified' into v_verified
    from public.businesses where id = old.business_id;
  if not coalesce(v_verified, false) then
    return coalesce(new, old);
  end if;
  select count(*) into v_remaining
    from public.coupons c
   where c.business_id = old.business_id and c.id <> old.id and public.coupon_is_live(c);
  if v_remaining < 3 then
    raise exception 'MIN_ACTIVE_COUPONS' using
      errcode = 'P0001',
      hint = 'Debes mantener al menos 3 cupones activos. Activa otro antes de desactivar este.';
  end if;
  return coalesce(new, old);
end $$;
create trigger coupons_min_active before update or delete on public.coupons
  for each row execute function public.enforce_min_active_coupons();

-- ===== redemptions =====
create table public.redemptions (
  id                          uuid primary key default gen_random_uuid(),
  coupon_id                   uuid not null references public.coupons(id) on delete cascade,
  consumer_id                 uuid not null references public.profiles(id) on delete cascade,
  branch_id                   uuid references public.branches(id) on delete set null,
  business_id                 uuid not null references public.businesses(id) on delete cascade,
  scanned_by                  uuid not null references public.profiles(id),
  subscription_status_at_scan public.subscription_status not null,
  token_jti                   text not null unique,   -- replay protection
  scanned_at                  timestamptz not null default now()
);
create index redemptions_business_idx on public.redemptions (business_id, scanned_at desc);
create index redemptions_consumer_idx on public.redemptions (consumer_id, scanned_at desc);

-- ===== push subscriptions / followers =====
create table public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  consumer_id uuid not null references public.profiles(id) on delete cascade,
  endpoint    text not null unique,
  keys        jsonb not null,           -- { p256dh, auth }
  user_agent  text,
  created_at  timestamptz not null default now()
);
create index push_subscriptions_consumer_idx on public.push_subscriptions (consumer_id);

create table public.business_followers (
  consumer_id uuid not null references public.profiles(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  notify      boolean not null default true,
  created_at  timestamptz not null default now(),
  primary key (consumer_id, business_id)
);
create index business_followers_business_idx on public.business_followers (business_id) where notify;

-- ===== wompi_events (webhook idempotency; service role only) =====
create table public.wompi_events (
  checksum             text primary key,
  event_type           text not null,
  environment          text not null,
  wompi_transaction_id text,
  payload              jsonb not null,
  received_at          timestamptz not null default now(),
  processed_at         timestamptz
);

-- ===== public read model: verified AND >= 3 live coupons =====
create view public.businesses_public with (security_invoker = true) as
select b.id, b.display_name, b.category, b.logo_path, b.description,
       s.active_coupon_count, s.best_score
from public.businesses b
join lateral (
  select count(*) as active_coupon_count,
         coalesce(max(public.coupon_score(c.discount_type, c.discount_value)), 0) as best_score
  from public.coupons c
  where c.business_id = b.id and public.coupon_is_live(c)
) s on true
where b.verification_status = 'verified' and s.active_coupon_count >= 3;

-- ===== nearby RPC (one row per branch) =====
create function public.nearby_businesses(
  p_lat      double precision,
  p_lng      double precision,
  p_category public.business_category default null,
  p_radius_m integer default 5000,
  p_sort     text default 'distance',      -- 'distance' | 'discount'
  p_limit    integer default 50
) returns table (
  business_id         uuid,
  branch_id           uuid,
  display_name        text,
  category            public.business_category,
  logo_path           text,
  branch_name         text,
  address_line        text,
  lat                 double precision,
  lng                 double precision,
  distance_m          double precision,
  active_coupon_count bigint,
  best_score          numeric
)
language sql stable security invoker set search_path = '' as $$
  with o as (
    select extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography as g
  )
  select bp.id, br.id, bp.display_name, bp.category, bp.logo_path, br.name, br.address_line,
         extensions.st_y(br.location::extensions.geometry),
         extensions.st_x(br.location::extensions.geometry),
         extensions.st_distance(br.location, o.g),
         bp.active_coupon_count, bp.best_score
  from public.businesses_public bp
  join public.branches br on br.business_id = bp.id
  cross join o
  where extensions.st_dwithin(br.location, o.g, p_radius_m)
    and (p_category is null or bp.category = p_category)
  order by case when p_sort = 'discount' then -bp.best_score else 0 end,
           br.location operator(extensions.<->) o.g
  limit p_limit
$$;

-- ===== QR token: issued by the consumer, verified by the merchant =====
-- Format: 'dm1.<consumer_uuid>.<coupon_uuid>.<exp_epoch>.<jti_hex16>.<hmac_sha256_hex>'
-- Secret lives in Vault under the name 'qr_token_secret'.
create function public.issue_coupon_token(p_coupon_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_secret  text;
  v_sub     public.subscriptions;
  v_exp     bigint;
  v_jti     text;
  v_payload text;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED';
  end if;
  select * into v_sub from public.subscriptions where consumer_id = auth.uid();
  if v_sub.id is null or public.subscription_access_until(v_sub) <= now() then
    raise exception 'SUBSCRIPTION_INACTIVE';
  end if;
  perform 1
    from public.coupons c
    join public.businesses b on b.id = c.business_id
   where c.id = p_coupon_id and public.coupon_is_live(c) and b.verification_status = 'verified';
  if not found then
    raise exception 'COUPON_UNAVAILABLE';
  end if;
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'qr_token_secret';
  if v_secret is null then
    raise exception 'QR_SECRET_MISSING';
  end if;
  v_exp := extract(epoch from now() + interval '90 seconds')::bigint;
  v_jti := encode(extensions.gen_random_bytes(8), 'hex');
  v_payload := auth.uid()::text || '.' || p_coupon_id::text || '.' || v_exp || '.' || v_jti;
  return 'dm1.' || v_payload || '.' || encode(extensions.hmac(v_payload, v_secret, 'sha256'), 'hex');
end $$;

create function public.verify_coupon_token(p_token text, p_branch_id uuid default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  p          text[];
  v_secret   text;
  v_expected text;
  v_consumer uuid;
  v_coupon   uuid;
  v_exp      bigint;
  v_c        public.coupons;
  v_b        public.businesses;
  v_sub      public.subscriptions;
  v_name     text;
begin
  if auth.uid() is null then
    return jsonb_build_object('valid', false, 'reason', 'UNAUTHENTICATED');
  end if;
  p := string_to_array(p_token, '.');
  if coalesce(array_length(p, 1), 0) <> 6 or p[1] <> 'dm1' then
    return jsonb_build_object('valid', false, 'reason', 'MALFORMED');
  end if;
  begin
    v_consumer := p[2]::uuid;
    v_coupon   := p[3]::uuid;
    v_exp      := p[4]::bigint;
  exception when others then
    return jsonb_build_object('valid', false, 'reason', 'MALFORMED');
  end;
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'qr_token_secret';
  v_expected := encode(extensions.hmac(p[2] || '.' || p[3] || '.' || p[4] || '.' || p[5], v_secret, 'sha256'), 'hex');
  if v_expected <> p[6] then
    return jsonb_build_object('valid', false, 'reason', 'BAD_SIGNATURE');
  end if;
  if v_exp < extract(epoch from now()) then
    return jsonb_build_object('valid', false, 'reason', 'EXPIRED');
  end if;
  select * into v_c from public.coupons where id = v_coupon;
  select * into v_b from public.businesses where id = v_c.business_id;
  if v_b.owner_id is distinct from auth.uid() then
    return jsonb_build_object('valid', false, 'reason', 'WRONG_BUSINESS');
  end if;
  if not public.coupon_is_live(v_c) then
    return jsonb_build_object('valid', false, 'reason', 'COUPON_INACTIVE');
  end if;
  select * into v_sub from public.subscriptions where consumer_id = v_consumer;
  if v_sub.id is null or public.subscription_access_until(v_sub) <= now() then
    return jsonb_build_object('valid', false, 'reason', 'SUBSCRIPTION_INACTIVE');
  end if;
  insert into public.redemptions
    (coupon_id, consumer_id, branch_id, business_id, scanned_by, subscription_status_at_scan, token_jti)
  values
    (v_coupon, v_consumer, p_branch_id, v_b.id, auth.uid(), v_sub.status, p[5])
  on conflict (token_jti) do nothing;
  if not found then
    return jsonb_build_object('valid', false, 'reason', 'ALREADY_REDEEMED');
  end if;
  select full_name into v_name from public.profiles where id = v_consumer;
  return jsonb_build_object('valid', true, 'consumer_name', v_name, 'coupon_title', v_c.title);
end $$;

revoke execute on function public.issue_coupon_token(uuid)        from public, anon;
revoke execute on function public.verify_coupon_token(text, uuid) from public, anon;
grant  execute on function public.issue_coupon_token(uuid)        to authenticated;
grant  execute on function public.verify_coupon_token(text, uuid) to authenticated;

-- ===== RLS =====
alter table public.profiles           enable row level security;
alter table public.subscriptions      enable row level security;
alter table public.payments           enable row level security;
alter table public.businesses         enable row level security;
alter table public.branches           enable row level security;
alter table public.coupons            enable row level security;
alter table public.redemptions        enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.business_followers enable row level security;
alter table public.wompi_events       enable row level security;   -- no policies: service role only

create policy profiles_self_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy profiles_self_update on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = public.app_role());

create policy subscriptions_self_select on public.subscriptions for select to authenticated
  using (consumer_id = auth.uid() or public.is_admin());
-- subscriptions/payments are written only by the service role (server actions).

create policy payments_self_select on public.payments for select to authenticated
  using (exists (select 1 from public.subscriptions s where s.id = subscription_id and s.consumer_id = auth.uid())
         or public.is_admin());

create policy businesses_read on public.businesses for select to authenticated
  using (owner_id = auth.uid() or public.is_admin() or verification_status = 'verified');
create policy businesses_owner_insert on public.businesses for insert to authenticated
  with check (owner_id = auth.uid() and public.app_role() = 'business');
create policy businesses_owner_update on public.businesses for update to authenticated
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

create policy branches_read on public.branches for select to authenticated
  using (exists (select 1 from public.businesses b where b.id = business_id
                 and (b.owner_id = auth.uid() or public.is_admin() or b.verification_status = 'verified')));
create policy branches_owner_write on public.branches for all to authenticated
  using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));

create policy coupons_read on public.coupons for select to authenticated
  using (exists (select 1 from public.businesses b where b.id = business_id
                 and (b.owner_id = auth.uid() or public.is_admin()
                      or (b.verification_status = 'verified' and public.coupon_is_live(coupons)))));
create policy coupons_owner_write on public.coupons for all to authenticated
  using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));

create policy redemptions_read on public.redemptions for select to authenticated
  using (consumer_id = auth.uid() or public.is_admin()
         or exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));
-- no insert policy: only verify_coupon_token (security definer) inserts.

create policy push_self_all on public.push_subscriptions for all to authenticated
  using (consumer_id = auth.uid()) with check (consumer_id = auth.uid());

create policy followers_self_all on public.business_followers for all to authenticated
  using (consumer_id = auth.uid()) with check (consumer_id = auth.uid());
create policy followers_business_read on public.business_followers for select to authenticated
  using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));

-- ===== storage =====
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true), ('coupon-images', 'coupon-images', true)
on conflict (id) do nothing;

create policy media_public_read on storage.objects for select
  using (bucket_id in ('logos', 'coupon-images'));
create policy media_owner_write on storage.objects for all to authenticated
  using (bucket_id in ('logos', 'coupon-images') and exists (
    select 1 from public.businesses b
     where b.owner_id = auth.uid() and (storage.foldername(name))[1] = b.id::text))
  with check (bucket_id in ('logos', 'coupon-images') and exists (
    select 1 from public.businesses b
     where b.owner_id = auth.uid() and (storage.foldername(name))[1] = b.id::text));
