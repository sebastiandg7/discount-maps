-- Inside SECURITY DEFINER functions current_user is the function owner, so the previous
-- check was always true. Decide from the request context instead: no JWT claims means a
-- direct database session (dashboard SQL, migrations); a service_role JWT means trusted
-- server code; otherwise only admins pass.
create or replace function public.is_privileged() returns boolean
language sql stable set search_path = '' as $$
  select coalesce(
           (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role') is null
           or (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role') = 'service_role',
           true)
         or public.is_admin()
$$;
