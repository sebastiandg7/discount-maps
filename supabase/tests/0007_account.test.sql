-- pgTAP: Cuenta pages — subscription RLS, cancel semantics, own-data edits, branch minimum.
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

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

select pg_temp.create_user('00000000-0000-4000-8000-000000000061', 'acct-trial@test.dev');
select pg_temp.create_user('00000000-0000-4000-8000-000000000062', 'acct-active@test.dev');
select pg_temp.create_user('00000000-0000-4000-8000-000000000063', 'acct-owner@test.dev', 'business');
select pg_temp.create_user('00000000-0000-4000-8000-000000000064', 'acct-other@test.dev', 'business');

insert into public.subscriptions (consumer_id, status, trial_ends_at, wompi_customer_email)
values ('00000000-0000-4000-8000-000000000061', 'trialing', now() + interval '7 days', 'acct-trial@test.dev');
insert into public.subscriptions (consumer_id, status, trial_ends_at, current_period_end, next_charge_at, wompi_customer_email)
values ('00000000-0000-4000-8000-000000000062', 'active', now() - interval '30 days', now() + interval '10 days',
        now() + interval '10 days', 'acct-active@test.dev');

-- owner with a business and two branches
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000063","role":"authenticated"}';
insert into public.businesses (id, owner_id, legal_name, display_name, nit, category)
values ('00000000-0000-4000-8000-0000000000b7', '00000000-0000-4000-8000-000000000063',
        'Cuenta S.A.S.', 'Cuenta Test', '900000007-1', 'retail');
create temp table acct_branches as
select public.add_branch('00000000-0000-4000-8000-0000000000b7', 'Sede 1', 'Calle 1', 'Bogotá', 4.65, -74.06) as b1,
       public.add_branch('00000000-0000-4000-8000-0000000000b7', 'Sede 2', 'Calle 2', 'Bogotá', 4.66, -74.07) as b2;
grant all on acct_branches to public;

-- ===== consumer 61 =====
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000061","role":"authenticated"}';

select is((select count(*) from public.subscriptions
            where consumer_id in ('00000000-0000-4000-8000-000000000061','00000000-0000-4000-8000-000000000062'))::int,
          1, 'a consumer sees only their own subscription');

update public.subscriptions set status = 'canceled' where consumer_id = '00000000-0000-4000-8000-000000000061';
select is((select status::text from public.subscriptions where consumer_id = '00000000-0000-4000-8000-000000000061'),
          'trialing', 'a consumer cannot cancel by writing the row (no update policy)');

select throws_ok(
  $$ insert into public.subscriptions (consumer_id, status, trial_ends_at, wompi_customer_email)
     values ('00000000-0000-4000-8000-000000000061', 'active', now(), 'x@test.dev') $$,
  '42501', null, 'a consumer cannot insert a subscription');

select lives_ok($$ update public.profiles set full_name = 'Ana Cuenta', phone = '3001234567'
                    where id = '00000000-0000-4000-8000-000000000061' $$,
                'a consumer can edit their own name and phone');
select is((select phone from public.profiles where id = '00000000-0000-4000-8000-000000000061'),
          '3001234567', 'the phone was saved');

update public.profiles set full_name = 'Hackeado' where id = '00000000-0000-4000-8000-000000000062';
reset role;
set local request.jwt.claims to default;
select is((select full_name from public.profiles where id = '00000000-0000-4000-8000-000000000062'),
          'Test acct-active@test.dev', 'a consumer cannot edit another profile');

-- ===== cancel keeps access until the paid period / trial ends (privileged) =====
update public.subscriptions set status = 'canceled', canceled_at = now(), next_charge_at = null
 where consumer_id = '00000000-0000-4000-8000-000000000062';
select is((select public.subscription_access_until(s) from public.subscriptions s
            where consumer_id = '00000000-0000-4000-8000-000000000062'),
          (select current_period_end from public.subscriptions
            where consumer_id = '00000000-0000-4000-8000-000000000062'),
          'a canceled subscription keeps access until current_period_end');

update public.subscriptions set status = 'canceled', canceled_at = now(), next_charge_at = null
 where consumer_id = '00000000-0000-4000-8000-000000000061';
select is((select public.subscription_access_until(s) from public.subscriptions s
            where consumer_id = '00000000-0000-4000-8000-000000000061'),
          (select trial_ends_at from public.subscriptions
            where consumer_id = '00000000-0000-4000-8000-000000000061'),
          'a canceled trial keeps access until trial_ends_at');

-- ===== owner 63: business edits and branch minimum =====
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000063","role":"authenticated"}';

select lives_ok($$ update public.businesses set display_name = 'Cuenta Nueva', description = 'Editado'
                    where id = '00000000-0000-4000-8000-0000000000b7' $$,
                'an owner can edit their business data');

select lives_ok($$ delete from public.branches where id = (select b2 from acct_branches) $$,
                'an owner can delete a branch while another remains');
select throws_ok($$ delete from public.branches where id = (select b1 from acct_branches) $$,
                 'P0001', 'MIN_BRANCHES', 'the last branch cannot be deleted');

-- ===== another merchant cannot touch it =====
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000064","role":"authenticated"}';
update public.businesses set display_name = 'Robado' where id = '00000000-0000-4000-8000-0000000000b7';
reset role;
set local request.jwt.claims to default;
select is((select display_name from public.businesses where id = '00000000-0000-4000-8000-0000000000b7'),
          'Cuenta Nueva', 'another merchant cannot edit the business');

select * from finish();
rollback;
