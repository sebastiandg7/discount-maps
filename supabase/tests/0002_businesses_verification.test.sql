-- pgTAP: businesses RLS and the admin-only verification gate.
begin;
select plan(9);

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

select pg_temp.create_user('00000000-0000-4000-8000-000000000011', 'consumer@test.dev');
select pg_temp.create_user('00000000-0000-4000-8000-000000000012', 'owner@test.dev', 'business');
select pg_temp.create_user('00000000-0000-4000-8000-000000000013', 'admin@test.dev');
update public.profiles set role = 'admin' where id = '00000000-0000-4000-8000-000000000013';

-- as the merchant owner
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000012","role":"authenticated"}';

insert into public.businesses (id, owner_id, legal_name, display_name, nit, category, verification_status)
values ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-000000000012',
        'Pizzas del Norte S.A.S.', 'Pizzas del Norte', '900123456-7', 'restaurants', 'verified');

select is((select verification_status::text from public.businesses where id = '00000000-0000-4000-8000-0000000000b1'),
          'pending', 'owner cannot self-verify on insert');

update public.businesses set verification_status = 'verified', verified_at = now()
 where id = '00000000-0000-4000-8000-0000000000b1';
select is((select verification_status::text from public.businesses where id = '00000000-0000-4000-8000-0000000000b1'),
          'pending', 'owner cannot self-verify on update');

select lives_ok($$ update public.businesses set description = 'La mejor pizza' where id = '00000000-0000-4000-8000-0000000000b1' $$,
                'owner can edit their own business');

-- as a consumer
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000011","role":"authenticated"}';
select is((select count(*) from public.businesses)::int, 0, 'consumers cannot see pending businesses');
select throws_ok(
  $$ insert into public.businesses (owner_id, legal_name, display_name, nit, category)
     values ('00000000-0000-4000-8000-000000000011', 'X', 'X', '123456', 'retail') $$,
  '42501', null, 'consumers cannot create businesses');

-- as the admin
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000013","role":"authenticated"}';
select is((select count(*) from public.businesses)::int, 1, 'admin sees pending businesses');
select lives_ok(
  $$ update public.businesses
        set verification_status = 'verified', verified_at = now(), verified_by = '00000000-0000-4000-8000-000000000013'
      where id = '00000000-0000-4000-8000-0000000000b1' $$,
  'admin can verify a business');
select is((select verification_status::text from public.businesses where id = '00000000-0000-4000-8000-0000000000b1'),
          'verified', 'verification persisted');

-- consumer again: verified business is now visible
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000011","role":"authenticated"}';
select is((select count(*) from public.businesses)::int, 1, 'consumers see verified businesses');

select * from finish();
rollback;
