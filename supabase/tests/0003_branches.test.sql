-- pgTAP: branches RLS, add_branch RPC and the coordinates view.
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

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

select pg_temp.create_user('00000000-0000-4000-8000-000000000021', 'consumer@test.dev');
select pg_temp.create_user('00000000-0000-4000-8000-000000000022', 'owner@test.dev', 'business');
select pg_temp.create_user('00000000-0000-4000-8000-000000000023', 'other@test.dev', 'business');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000022","role":"authenticated"}';
insert into public.businesses (id, owner_id, legal_name, display_name, nit, category)
values ('00000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-000000000022',
        'Café Central S.A.S.', 'Café Central', '900000001-1', 'beverages');

select lives_ok(
  $$ select public.add_branch('00000000-0000-4000-8000-0000000000b2', 'Sede Chapinero', 'Cra 7 # 60-10', 'Bogotá', 4.6486, -74.0628) $$,
  'owner can add a branch to their business');
select is((select count(*) from public.branches_with_coords where business_id = '00000000-0000-4000-8000-0000000000b2')::int,
          1, 'owner sees their branch through the coords view');
select is((select round(lat::numeric, 4) from public.branches_with_coords where business_id = '00000000-0000-4000-8000-0000000000b2'),
          4.6486, 'latitude round-trips through PostGIS');
select is((select round(lng::numeric, 4) from public.branches_with_coords where business_id = '00000000-0000-4000-8000-0000000000b2'),
          -74.0628, 'longitude round-trips through PostGIS');

-- another merchant cannot add branches to someone else's business
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000023","role":"authenticated"}';
select throws_ok(
  $$ select public.add_branch('00000000-0000-4000-8000-0000000000b2', 'Intrusa', 'Calle falsa 123', 'Bogotá', 4.6, -74.0) $$,
  '42501', null, 'other merchants cannot add branches to a business they do not own');

-- consumers cannot see branches of a pending business
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000021","role":"authenticated"}';
select is((select count(*) from public.branches_with_coords where business_id = '00000000-0000-4000-8000-0000000000b2')::int, 0, 'consumers do not see branches of pending businesses');

-- verify the business as the database owner; consumer now sees the branch
reset role;
set local request.jwt.claims to default;
update public.businesses set verification_status = 'verified' where id = '00000000-0000-4000-8000-0000000000b2';
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000021","role":"authenticated"}';
select is((select count(*) from public.branches_with_coords where business_id = '00000000-0000-4000-8000-0000000000b2')::int, 1, 'consumers see branches of verified businesses');

select * from finish();
rollback;
