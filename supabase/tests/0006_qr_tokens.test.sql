-- pgTAP: coupon QR tokens. issue_coupon_token (consumer) and verify_coupon_token (merchant):
-- entitlement, ownership, signature, expiry, replay protection and the redemption row.
begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

create or replace function pg_temp.create_user(p_id uuid, p_email text, p_role text default null)
returns void language sql as $$
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                          confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated', p_email,
          extensions.crypt('password123', extensions.gen_salt('bf')), now(),
          '{"provider":"email","providers":["email"]}'::jsonb,
          jsonb_build_object('full_name', 'Test ' || p_email, 'role', p_role),
          now(), now(), '', '', '', '');
$$;

-- A fresh local stack may not have the Vault secret yet (rolled back with the test).
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'qr_token_secret') then
    perform vault.create_secret('pgtap-only-secret', 'qr_token_secret');
  end if;
end $$;

-- scratch space readable by the impersonated roles
create temp table qr (k text primary key, v text);
grant all on qr to public;

select pg_temp.create_user('00000000-0000-4000-8000-000000000051', 'consumer51@test.dev');
select pg_temp.create_user('00000000-0000-4000-8000-000000000052', 'consumer52@test.dev');
select pg_temp.create_user('00000000-0000-4000-8000-000000000053', 'consumer53@test.dev');
select pg_temp.create_user('00000000-0000-4000-8000-000000000054', 'owner54@test.dev', 'business');
select pg_temp.create_user('00000000-0000-4000-8000-000000000055', 'other55@test.dev', 'business');

-- subscriptions are written by the service role only
insert into public.subscriptions (consumer_id, status, trial_ends_at, wompi_customer_email) values
  ('00000000-0000-4000-8000-000000000051', 'trialing', now() + interval '7 days', 'consumer51@test.dev'),
  ('00000000-0000-4000-8000-000000000052', 'canceled', now() - interval '1 day', 'consumer52@test.dev');

-- merchant with a verified business, one branch and 3 live coupons + 1 inactive
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000054","role":"authenticated"}';
insert into public.businesses (id, owner_id, legal_name, display_name, nit, category)
values ('00000000-0000-4000-8000-0000000000f0', '00000000-0000-4000-8000-000000000054',
        'Pizzas QR SAS', 'Pizzas QR', '900000006-1', 'restaurants');
insert into qr select 'branch', public.add_branch('00000000-0000-4000-8000-0000000000f0', 'Sede QR', 'Cra 1 # 1-1', 'Bogotá', 4.65, -74.06)::text;
insert into public.coupons (id, business_id, title, discount_type, discount_value, is_active) values
  ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000f0', 'Martes QR',   'percentage', 20, true),
  ('00000000-0000-4000-8000-0000000000f2', '00000000-0000-4000-8000-0000000000f0', 'Postre QR',   'fixed', 10000, true),
  ('00000000-0000-4000-8000-0000000000f3', '00000000-0000-4000-8000-0000000000f0', 'Dos por uno', 'bogo', null, true),
  ('00000000-0000-4000-8000-0000000000f4', '00000000-0000-4000-8000-0000000000f0', 'Apagado',     'other', null, false);

reset role;
set local request.jwt.claims to default;
update public.businesses set verification_status = 'verified' where id = '00000000-0000-4000-8000-0000000000f0';

-- ===== issuing =====
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000051","role":"authenticated"}';
insert into qr select 'tok', public.issue_coupon_token('00000000-0000-4000-8000-0000000000f1');
select ok((select v ~ '^dm1\.' and array_length(string_to_array(v, '.'), 1) = 6 from qr where k = 'tok'),
          'an entitled consumer gets a six-part dm1 token');

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000053","role":"authenticated"}';
select throws_ok($$ select public.issue_coupon_token('00000000-0000-4000-8000-0000000000f1') $$,
                 'P0001', 'SUBSCRIPTION_INACTIVE', 'a consumer without a subscription cannot get a token');

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000052","role":"authenticated"}';
select throws_ok($$ select public.issue_coupon_token('00000000-0000-4000-8000-0000000000f1') $$,
                 'P0001', 'SUBSCRIPTION_INACTIVE', 'a consumer whose access ended cannot get a token');

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000051","role":"authenticated"}';
select throws_ok($$ select public.issue_coupon_token('00000000-0000-4000-8000-0000000000f4') $$,
                 'P0001', 'COUPON_UNAVAILABLE', 'no token for an inactive coupon');

-- ===== verifying =====
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000055","role":"authenticated"}';
select is((select public.verify_coupon_token(v, null) ->> 'reason' from qr where k = 'tok'),
          'WRONG_BUSINESS', 'another merchant cannot redeem the token');

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000054","role":"authenticated"}';
insert into qr select 'res', public.verify_coupon_token((select v from qr where k = 'tok'), (select v::uuid from qr where k = 'branch'))::text;
select is((select v::jsonb ->> 'valid' from qr where k = 'res'), 'true', 'the owner redeems a fresh token');
select is((select v::jsonb ->> 'coupon_title' from qr where k = 'res'), 'Martes QR', 'the result names the coupon');
select is((select count(*) from public.redemptions
            where token_jti = split_part((select v from qr where k = 'tok'), '.', 5)
              and consumer_id = '00000000-0000-4000-8000-000000000051'
              and branch_id = (select v::uuid from qr where k = 'branch'))::int,
          1, 'a redemption row is recorded for the branch');
select is((select public.verify_coupon_token(v, null) ->> 'reason' from qr where k = 'tok'),
          'ALREADY_REDEEMED', 'replaying the token is rejected');
select is((select public.verify_coupon_token(left(v, length(v) - 1) || case when right(v, 1) = '0' then '1' else '0' end, null) ->> 'reason'
             from qr where k = 'tok'),
          'BAD_SIGNATURE', 'a tampered signature is rejected');
select is(public.verify_coupon_token('hola', null) ->> 'reason', 'MALFORMED', 'random text is malformed');
select is(public.verify_coupon_token('dm1.x.y.z.w.v', null) ->> 'reason', 'MALFORMED', 'non-uuid parts are malformed');

-- expired: now() is frozen inside the transaction, so forge a token with a past expiry
reset role;
set local request.jwt.claims to default;
insert into qr
select 'expired', 'dm1.' || p || '.' || encode(extensions.hmac(p, (select decrypted_secret from vault.decrypted_secrets where name = 'qr_token_secret'), 'sha256'), 'hex')
  from (select '00000000-0000-4000-8000-000000000051.00000000-0000-4000-8000-0000000000f2.'
               || (extract(epoch from now())::bigint - 100) || '.abcdef0123456789' as p) s;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000054","role":"authenticated"}';
select is((select public.verify_coupon_token(v, null) ->> 'reason' from qr where k = 'expired'),
          'EXPIRED', 'an expired token is rejected');

-- coupon deactivated after the token was issued
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000051","role":"authenticated"}';
insert into qr select 'tok3', public.issue_coupon_token('00000000-0000-4000-8000-0000000000f3');
reset role;
set local request.jwt.claims to default;
update public.coupons set is_active = false where id = '00000000-0000-4000-8000-0000000000f3';
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000054","role":"authenticated"}';
select is((select public.verify_coupon_token(v, null) ->> 'reason' from qr where k = 'tok3'),
          'COUPON_INACTIVE', 'a coupon deactivated after issuing is rejected');

-- subscription canceled after the token was issued
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000051","role":"authenticated"}';
insert into qr select 'tok2', public.issue_coupon_token('00000000-0000-4000-8000-0000000000f2');
reset role;
set local request.jwt.claims to default;
update public.subscriptions set status = 'canceled', trial_ends_at = now() - interval '1 day'
 where consumer_id = '00000000-0000-4000-8000-000000000051';
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000054","role":"authenticated"}';
select is((select public.verify_coupon_token(v, null) ->> 'reason' from qr where k = 'tok2'),
          'SUBSCRIPTION_INACTIVE', 'a subscription that lapsed after issuing is rejected');

select * from finish();
rollback;
