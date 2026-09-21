-- Explicit privileges. Row access is governed by RLS; these grants only decide which roles
-- may touch the tables at all. Every product feature requires a session, so `anon` gets nothing.

grant usage on schema public to anon, authenticated, service_role;

-- authenticated: data access filtered by RLS policies
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;

-- service_role: trusted server code (billing, webhooks, push, admin tasks); bypasses RLS
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- anon: nothing on data
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke execute on all functions in schema public from anon;

-- wompi_events is service-role only (no RLS policies either)
revoke all on public.wompi_events from authenticated;

-- QR token functions stay authenticated-only (re-assert after the blanket grants above)
revoke execute on function public.issue_coupon_token(uuid) from anon, public;
revoke execute on function public.verify_coupon_token(text, uuid) from anon, public;

-- Same rules for objects created by future migrations (run as postgres)
alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges for role postgres in schema public
  grant usage, select on sequences to authenticated;
alter default privileges for role postgres in schema public
  grant execute on functions to authenticated;
alter default privileges for role postgres in schema public
  grant all on tables to service_role;
alter default privileges for role postgres in schema public
  grant all on sequences to service_role;
alter default privileges for role postgres in schema public
  grant execute on functions to service_role;
alter default privileges for role postgres in schema public
  revoke all on tables from anon;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon;
