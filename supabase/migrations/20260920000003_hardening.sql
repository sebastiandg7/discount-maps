-- Fixes for `supabase db advisors` findings:
--  * pin search_path on the remaining functions
--  * internal/trigger functions must not be callable through PostgREST (revoke from PUBLIC)
--  * RLS policies use (select auth.uid()) so the value is computed once per query (initplan)
--  * one permissive SELECT policy per table (split `for all` owner policies into write-only ones)

-- ===== search_path =====
alter function public.set_updated_at() set search_path = '';
alter function public.subscription_access_until(public.subscriptions) set search_path = '';
alter function public.coupon_is_live(public.coupons) set search_path = '';
alter function public.coupon_score(public.discount_type, numeric) set search_path = '';

-- ===== function exposure =====
-- Functions default to EXECUTE for PUBLIC; take that away and grant explicitly.
revoke execute on all functions in schema public from public;
alter default privileges for role postgres in schema public revoke execute on functions from public;

-- Trigger bodies: never callable directly.
revoke execute on function public.set_updated_at()                 from anon, authenticated, service_role;
revoke execute on function public.handle_new_user()                from anon, authenticated, service_role;
revoke execute on function public.sync_role_to_auth()              from anon, authenticated, service_role;
revoke execute on function public.protect_business_verification()  from anon, authenticated, service_role;
revoke execute on function public.enforce_min_active_coupons()     from anon, authenticated, service_role;

-- Helpers used inside policies and RPCs: authenticated + service_role only.
grant execute on function public.app_role()                                          to authenticated, service_role;
grant execute on function public.is_admin()                                          to authenticated, service_role;
grant execute on function public.coupon_is_live(public.coupons)                      to authenticated, service_role;
grant execute on function public.coupon_score(public.discount_type, numeric)         to authenticated, service_role;
grant execute on function public.subscription_access_until(public.subscriptions)     to authenticated, service_role;
grant execute on function public.nearby_businesses(double precision, double precision, public.business_category, integer, text, integer)
                                                                                     to authenticated, service_role;
grant execute on function public.issue_coupon_token(uuid)                            to authenticated, service_role;
grant execute on function public.verify_coupon_token(text, uuid)                     to authenticated, service_role;

-- ===== RLS policies (rewritten) =====
drop policy if exists profiles_self_select      on public.profiles;
drop policy if exists profiles_self_update      on public.profiles;
drop policy if exists subscriptions_self_select on public.subscriptions;
drop policy if exists payments_self_select      on public.payments;
drop policy if exists businesses_read           on public.businesses;
drop policy if exists businesses_owner_insert   on public.businesses;
drop policy if exists businesses_owner_update   on public.businesses;
drop policy if exists branches_read             on public.branches;
drop policy if exists branches_owner_write      on public.branches;
drop policy if exists coupons_read              on public.coupons;
drop policy if exists coupons_owner_write       on public.coupons;
drop policy if exists redemptions_read          on public.redemptions;
drop policy if exists push_self_all             on public.push_subscriptions;
drop policy if exists followers_self_all        on public.business_followers;
drop policy if exists followers_business_read   on public.business_followers;
drop policy if exists media_public_read         on storage.objects;
drop policy if exists media_owner_write         on storage.objects;

-- profiles
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()) and role = (select public.app_role()));

-- subscriptions / payments (written only by service_role)
create policy subscriptions_select on public.subscriptions for select to authenticated
  using (consumer_id = (select auth.uid()) or (select public.is_admin()));
create policy payments_select on public.payments for select to authenticated
  using ((select public.is_admin())
         or exists (select 1 from public.subscriptions s
                     where s.id = subscription_id and s.consumer_id = (select auth.uid())));

-- businesses
create policy businesses_select on public.businesses for select to authenticated
  using (owner_id = (select auth.uid()) or (select public.is_admin()) or verification_status = 'verified');
create policy businesses_insert on public.businesses for insert to authenticated
  with check (owner_id = (select auth.uid()) and (select public.app_role()) = 'business');
create policy businesses_update on public.businesses for update to authenticated
  using (owner_id = (select auth.uid()) or (select public.is_admin()))
  with check (owner_id = (select auth.uid()) or (select public.is_admin()));

-- branches
create policy branches_select on public.branches for select to authenticated
  using (exists (select 1 from public.businesses b
                  where b.id = business_id
                    and (b.owner_id = (select auth.uid()) or (select public.is_admin())
                         or b.verification_status = 'verified')));
create policy branches_insert on public.branches for insert to authenticated
  with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid())));
create policy branches_update on public.branches for update to authenticated
  using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid())));
create policy branches_delete on public.branches for delete to authenticated
  using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid())));

-- coupons
create policy coupons_select on public.coupons for select to authenticated
  using (exists (select 1 from public.businesses b
                  where b.id = business_id
                    and (b.owner_id = (select auth.uid()) or (select public.is_admin())
                         or (b.verification_status = 'verified' and public.coupon_is_live(coupons)))));
create policy coupons_insert on public.coupons for insert to authenticated
  with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid())));
create policy coupons_update on public.coupons for update to authenticated
  using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid())));
create policy coupons_delete on public.coupons for delete to authenticated
  using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid())));

-- redemptions (inserted only by verify_coupon_token)
create policy redemptions_select on public.redemptions for select to authenticated
  using (consumer_id = (select auth.uid()) or (select public.is_admin())
         or exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid())));

-- push subscriptions
create policy push_select on public.push_subscriptions for select to authenticated
  using (consumer_id = (select auth.uid()));
create policy push_insert on public.push_subscriptions for insert to authenticated
  with check (consumer_id = (select auth.uid()));
create policy push_update on public.push_subscriptions for update to authenticated
  using (consumer_id = (select auth.uid())) with check (consumer_id = (select auth.uid()));
create policy push_delete on public.push_subscriptions for delete to authenticated
  using (consumer_id = (select auth.uid()));

-- followers: consumers manage their own rows; merchants can read who follows them
create policy followers_select on public.business_followers for select to authenticated
  using (consumer_id = (select auth.uid())
         or exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid())));
create policy followers_insert on public.business_followers for insert to authenticated
  with check (consumer_id = (select auth.uid()));
create policy followers_update on public.business_followers for update to authenticated
  using (consumer_id = (select auth.uid())) with check (consumer_id = (select auth.uid()));
create policy followers_delete on public.business_followers for delete to authenticated
  using (consumer_id = (select auth.uid()));

-- storage: public read; owners write under <business_id>/...
create policy media_select on storage.objects for select
  using (bucket_id in ('logos', 'coupon-images'));
create policy media_insert on storage.objects for insert to authenticated
  with check (bucket_id in ('logos', 'coupon-images') and exists (
    select 1 from public.businesses b
     where b.owner_id = (select auth.uid()) and (storage.foldername(name))[1] = b.id::text));
create policy media_update on storage.objects for update to authenticated
  using (bucket_id in ('logos', 'coupon-images') and exists (
    select 1 from public.businesses b
     where b.owner_id = (select auth.uid()) and (storage.foldername(name))[1] = b.id::text));
create policy media_delete on storage.objects for delete to authenticated
  using (bucket_id in ('logos', 'coupon-images') and exists (
    select 1 from public.businesses b
     where b.owner_id = (select auth.uid()) and (storage.foldername(name))[1] = b.id::text));
