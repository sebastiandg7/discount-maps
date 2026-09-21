-- pgTAP: the minimum-3-live-coupons rule for verified businesses.
begin;
select plan(8);

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

select pg_temp.create_user('00000000-0000-4000-8000-000000000031', 'consumer@test.dev');
select pg_temp.create_user('00000000-0000-4000-8000-000000000032', 'owner@test.dev', 'business');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000032","role":"authenticated"}';
insert into public.businesses (id, owner_id, legal_name, display_name, nit, category)
values ('00000000-0000-4000-8000-0000000000b3', '00000000-0000-4000-8000-000000000032',
        'Postres SAS', 'Dulce Norte', '900000002-2', 'desserts');

insert into public.coupons (id, business_id, title, discount_type, discount_value) values
  ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000b3', 'Cupón uno',  'percentage', 10),
  ('00000000-0000-4000-8000-0000000000c2', '00000000-0000-4000-8000-0000000000b3', 'Cupón dos',  'percentage', 20),
  ('00000000-0000-4000-8000-0000000000c3', '00000000-0000-4000-8000-0000000000b3', 'Cupón tres', 'bogo', null);

-- pending business: may deactivate freely
select lives_ok($$ update public.coupons set is_active = false where id = '00000000-0000-4000-8000-0000000000c1' $$,
                'a pending business can deactivate below 3');
update public.coupons set is_active = true where id = '00000000-0000-4000-8000-0000000000c1';

-- not on the map while pending
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000031","role":"authenticated"}';
select is((select count(*) from public.businesses_public)::int, 0, 'pending business is not public');

-- verify as direct SQL (privileged)
reset role;
set local request.jwt.claims to default;
update public.businesses set verification_status = 'verified' where id = '00000000-0000-4000-8000-0000000000b3';

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000031","role":"authenticated"}';
select is((select active_coupon_count from public.businesses_public where id = '00000000-0000-4000-8000-0000000000b3')::int,
          3, 'verified business with 3 live coupons is public');

-- verified owner: cannot drop below 3
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000032","role":"authenticated"}';
select throws_ok($$ update public.coupons set is_active = false where id = '00000000-0000-4000-8000-0000000000c1' $$,
                 'P0001', 'MIN_ACTIVE_COUPONS', 'verified business cannot deactivate the third live coupon');
select throws_ok($$ delete from public.coupons where id = '00000000-0000-4000-8000-0000000000c1' $$,
                 'P0001', 'MIN_ACTIVE_COUPONS', 'verified business cannot delete the third live coupon');
select lives_ok($$ update public.coupons set title = 'Cupón uno (editado)' where id = '00000000-0000-4000-8000-0000000000c1' $$,
                'editing a live coupon without deactivating is fine');

-- with a fourth live coupon, one can be deactivated
insert into public.coupons (id, business_id, title, discount_type, discount_value) values
  ('00000000-0000-4000-8000-0000000000c4', '00000000-0000-4000-8000-0000000000b3', 'Cupón cuatro', 'fixed', 5000);
select lives_ok($$ update public.coupons set is_active = false where id = '00000000-0000-4000-8000-0000000000c1' $$,
                'with 4 live coupons one can be deactivated');

-- direct SQL bypasses the rule
reset role;
set local request.jwt.claims to default;
select lives_ok($$ update public.coupons set is_active = false where id = '00000000-0000-4000-8000-0000000000c2' $$,
                'privileged sessions bypass the minimum');

select * from finish();
rollback;
