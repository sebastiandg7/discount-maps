-- New-coupon push fan-out: after a coupon is inserted, Postgres asks people-web to
-- notify the business's followers. No-op until both Vault secrets exist:
--   select vault.create_secret('https://<people-web host>', 'people_web_url');
--   select vault.create_secret('<same value as PUSH_DISPATCH_SECRET>', 'push_dispatch_secret');

create or replace function public.notify_new_coupon() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_url    text;
  v_secret text;
begin
  select decrypted_secret into v_url    from vault.decrypted_secrets where name = 'people_web_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'push_dispatch_secret';
  if v_url is null or v_secret is null then
    return new;
  end if;
  perform net.http_post(
    url     := v_url || '/api/push/new-coupon',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
    body    := jsonb_build_object('coupon_id', new.id, 'business_id', new.business_id),
    timeout_milliseconds := 5000
  );
  return new;
end $$;

revoke execute on function public.notify_new_coupon() from public, anon, authenticated;

drop trigger if exists coupons_notify_followers on public.coupons;
create trigger coupons_notify_followers
  after insert on public.coupons
  for each row execute function public.notify_new_coupon();
