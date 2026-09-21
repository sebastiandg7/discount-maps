-- Admin-only gates also let privileged database roles through (dashboard SQL, service_role
-- server code). RLS already blocks anonymous/authenticated users from reaching them otherwise.

create or replace function public.is_privileged() returns boolean
language sql stable set search_path = '' as
$$ select public.is_admin() or current_user in ('postgres', 'service_role', 'supabase_admin') $$;
revoke execute on function public.is_privileged() from public, anon;
grant  execute on function public.is_privileged() to authenticated, service_role;

create or replace function public.protect_business_verification() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if public.is_privileged() then
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

create or replace function public.enforce_min_active_coupons() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_verified  boolean;
  v_remaining int;
begin
  if public.is_privileged() then
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
