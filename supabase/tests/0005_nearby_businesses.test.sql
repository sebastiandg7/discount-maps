-- pgTAP: the consumer map query. Only verified businesses with >= 3 live coupons appear,
-- one row per branch, filtered by radius/category and sorted by distance or best discount.
begin;
create extension if not exists pgtap with schema extensions;
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

select pg_temp.create_user('00000000-0000-4000-8000-000000000041', 'consumer41@test.dev');
select pg_temp.create_user('00000000-0000-4000-8000-000000000042', 'owner-a@test.dev', 'business');
select pg_temp.create_user('00000000-0000-4000-8000-000000000043', 'owner-b@test.dev', 'business');
select pg_temp.create_user('00000000-0000-4000-8000-000000000044', 'owner-c@test.dev', 'business');

-- Business A (restaurants): branch at the origin + a branch ~17 km north; best coupon 20 %.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000042","role":"authenticated"}';
insert into public.businesses (id, owner_id, legal_name, display_name, nit, category)
values ('00000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-000000000042',
        'Asados A SAS', 'Asados A', '900000005-1', 'restaurants');
select public.add_branch('00000000-0000-4000-8000-0000000000d1', 'A centro', 'Cra 7 # 60-10', 'Bogotá', 4.6486, -74.0628);
select public.add_branch('00000000-0000-4000-8000-0000000000d1', 'A norte',  'Cll 200 # 1-1',  'Bogotá', 4.8000, -74.0600);
insert into public.coupons (id, business_id, title, discount_type, discount_value) values
  ('00000000-0000-4000-8000-0000000000e1', '00000000-0000-4000-8000-0000000000d1', 'A veinte', 'percentage', 20),
  ('00000000-0000-4000-8000-0000000000e2', '00000000-0000-4000-8000-0000000000d1', 'A diez',   'percentage', 10),
  ('00000000-0000-4000-8000-0000000000e3', '00000000-0000-4000-8000-0000000000d1', 'A fijo',   'fixed', 4000);

-- Business B (desserts): 500 m away but only 2 live coupons.
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000043","role":"authenticated"}';
insert into public.businesses (id, owner_id, legal_name, display_name, nit, category)
values ('00000000-0000-4000-8000-0000000000d2', '00000000-0000-4000-8000-000000000043',
        'Postres B SAS', 'Postres B', '900000005-2', 'desserts');
select public.add_branch('00000000-0000-4000-8000-0000000000d2', 'B única', 'Cll 63 # 7-1', 'Bogotá', 4.6531, -74.0628);
insert into public.coupons (id, business_id, title, discount_type, discount_value) values
  ('00000000-0000-4000-8000-0000000000e4', '00000000-0000-4000-8000-0000000000d2', 'B uno', 'percentage', 15),
  ('00000000-0000-4000-8000-0000000000e5', '00000000-0000-4000-8000-0000000000d2', 'B dos', 'bogo', null);

-- Business C (beverages): ~2 km away; best coupon 50 %.
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000044","role":"authenticated"}';
insert into public.businesses (id, owner_id, legal_name, display_name, nit, category)
values ('00000000-0000-4000-8000-0000000000d3', '00000000-0000-4000-8000-000000000044',
        'Bebidas C SAS', 'Bebidas C', '900000005-3', 'beverages');
select public.add_branch('00000000-0000-4000-8000-0000000000d3', 'C única', 'Cll 80 # 7-1', 'Bogotá', 4.6666, -74.0628);
insert into public.coupons (id, business_id, title, discount_type, discount_value) values
  ('00000000-0000-4000-8000-0000000000e6', '00000000-0000-4000-8000-0000000000d3', 'C cincuenta', 'percentage', 50),
  ('00000000-0000-4000-8000-0000000000e7', '00000000-0000-4000-8000-0000000000d3', 'C treinta',   'percentage', 30),
  ('00000000-0000-4000-8000-0000000000e8', '00000000-0000-4000-8000-0000000000d3', 'C dos por uno', 'bogo', null);

-- verify all three (privileged)
reset role;
set local request.jwt.claims to default;
update public.businesses set verification_status = 'verified'
 where id in ('00000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-0000000000d2', '00000000-0000-4000-8000-0000000000d3');

-- consumer queries from the origin (branch "A centro")
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000041","role":"authenticated"}';

select is((select count(*) from public.nearby_businesses(4.6486, -74.0628, null, 5000, 'distance', 50)
            where business_id = '00000000-0000-4000-8000-0000000000d1')::int,
          1, 'verified business with 3 live coupons is listed (near branch only)');
select is((select count(*) from public.nearby_businesses(4.6486, -74.0628, null, 5000, 'distance', 50)
            where business_id = '00000000-0000-4000-8000-0000000000d2')::int,
          0, 'business with only 2 live coupons is hidden');
select is((select count(*) from public.nearby_businesses(4.6486, -74.0628, null, 50000, 'distance', 50)
            where business_id = '00000000-0000-4000-8000-0000000000d1')::int,
          2, 'a larger radius includes the far branch');
select ok((select distance_m from public.nearby_businesses(4.6486, -74.0628, null, 5000, 'distance', 50)
            where branch_name = 'A centro' and business_id = '00000000-0000-4000-8000-0000000000d1') < 1,
          'distance to the origin branch is ~0 m');
select ok((select distance_m from public.nearby_businesses(4.6486, -74.0628, null, 5000, 'distance', 50)
            where business_id = '00000000-0000-4000-8000-0000000000d3') between 1900 and 2100,
          'distance is measured in metres');
select is((select string_agg(distinct business_id::text, ',')
             from public.nearby_businesses(4.6486, -74.0628, 'beverages', 5000, 'distance', 50)
            where business_id in ('00000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-0000000000d2', '00000000-0000-4000-8000-0000000000d3')),
          '00000000-0000-4000-8000-0000000000d3', 'category filter keeps only matching businesses');
select is((with r as (select row_number() over () as rn, business_id
                        from public.nearby_businesses(4.6486, -74.0628, null, 5000, 'distance', 50))
           select business_id::text from r
            where business_id in ('00000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-0000000000d3')
            order by rn limit 1),
          '00000000-0000-4000-8000-0000000000d1', 'distance sort puts the nearest business first');
select is((with r as (select row_number() over () as rn, business_id
                        from public.nearby_businesses(4.6486, -74.0628, null, 5000, 'discount', 50))
           select business_id::text from r
            where business_id in ('00000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-0000000000d3')
            order by rn limit 1),
          '00000000-0000-4000-8000-0000000000d3', 'discount sort puts the best discount first');

-- B publishes a third coupon and becomes visible
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000043","role":"authenticated"}';
insert into public.coupons (id, business_id, title, discount_type, discount_value) values
  ('00000000-0000-4000-8000-0000000000e9', '00000000-0000-4000-8000-0000000000d2', 'B tres', 'percentage', 5);
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000041","role":"authenticated"}';
select is((select count(*) from public.nearby_businesses(4.6486, -74.0628, null, 5000, 'distance', 50)
            where business_id = '00000000-0000-4000-8000-0000000000d2')::int,
          1, 'the third live coupon makes the business visible');

select * from finish();
rollback;
