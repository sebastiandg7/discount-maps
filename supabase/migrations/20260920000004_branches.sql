-- Branch helpers: insert with a lat/lng pair (PostGIS point built server-side) and a
-- read view that exposes coordinates as plain numbers. Both run as the caller (RLS applies).

create function public.add_branch(
  p_business_id     uuid,
  p_name            text,
  p_address_line    text,
  p_city            text,
  p_lat             double precision,
  p_lng             double precision,
  p_google_place_id text default null,
  p_phone           text default null
) returns uuid
language sql security invoker set search_path = '' as $$
  insert into public.branches (business_id, name, address_line, city, location, google_place_id, phone)
  values (p_business_id, p_name, p_address_line, p_city,
          extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography,
          nullif(p_google_place_id, ''), nullif(p_phone, ''))
  returning id
$$;

create view public.branches_with_coords with (security_invoker = true) as
select b.id, b.business_id, b.name, b.address_line, b.city, b.google_place_id, b.phone, b.created_at,
       extensions.st_y(b.location::extensions.geometry) as lat,
       extensions.st_x(b.location::extensions.geometry) as lng
from public.branches b;

revoke execute on function public.add_branch(uuid, text, text, text, double precision, double precision, text, text) from public, anon;
grant  execute on function public.add_branch(uuid, text, text, text, double precision, double precision, text, text) to authenticated, service_role;
grant select on public.branches_with_coords to authenticated, service_role;
