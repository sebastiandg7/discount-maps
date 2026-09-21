-- pgTAP: profiles, roles and the auth.users trigger.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

-- helper: create an auth user the way GoTrue would; the trigger creates the profile.
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

select pg_temp.create_user('00000000-0000-4000-8000-000000000001', 'consumer@test.dev');
select pg_temp.create_user('00000000-0000-4000-8000-000000000002', 'business@test.dev', 'business');
select pg_temp.create_user('00000000-0000-4000-8000-000000000003', 'hacker@test.dev', 'admin');

select is((select role::text from public.profiles where id = '00000000-0000-4000-8000-000000000001'),
          'consumer', 'sign-up without role metadata becomes consumer');
select is((select role::text from public.profiles where id = '00000000-0000-4000-8000-000000000002'),
          'business', 'sign-up with role=business becomes business');
select is((select role::text from public.profiles where id = '00000000-0000-4000-8000-000000000003'),
          'consumer', 'role=admin in sign-up metadata is ignored');
select is((select raw_app_meta_data->>'role' from auth.users where id = '00000000-0000-4000-8000-000000000002'),
          'business', 'role is mirrored into app_metadata for the JWT');

-- impersonate the consumer
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}';

select is((select count(*) from public.profiles where id in ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000003'))::int,
          1, 'a user only sees their own profile');
select lives_ok($$ update public.profiles set full_name = 'Nuevo Nombre' where id = '00000000-0000-4000-8000-000000000001' $$,
                'a user can update their own name');
select throws_ok($$ update public.profiles set role = 'admin' where id = '00000000-0000-4000-8000-000000000001' $$,
                 '42501', null, 'a user cannot change their own role');

-- promote to admin as the database owner, check the sync trigger
reset role;
update public.profiles set role = 'admin' where id = '00000000-0000-4000-8000-000000000003';
select is((select raw_app_meta_data->>'role' from auth.users where id = '00000000-0000-4000-8000-000000000003'),
          'admin', 'promoting a profile syncs the role into app_metadata');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000003","role":"authenticated"}';
select is((select count(*) from public.profiles where id in ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000003'))::int,
          3, 'an admin sees every profile');

select * from finish();
rollback;
