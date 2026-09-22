-- A business keeps at least one branch (mirrored in @org/domain MIN_BRANCHES).
-- Owners delete branches from the Cuenta page; the last one cannot go.
-- Privileged callers (dashboard SQL, service_role, cascades from user deletion) bypass it.

create function public.enforce_min_branches() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_remaining int;
begin
  if public.is_privileged() then
    return old;
  end if;
  select count(*) into v_remaining
    from public.branches b
   where b.business_id = old.business_id and b.id <> old.id;
  if v_remaining < 1 then
    raise exception 'MIN_BRANCHES' using
      errcode = 'P0001',
      hint = 'Tu empresa necesita al menos una sede. Agrega otra antes de quitar esta.';
  end if;
  return old;
end $$;

revoke execute on function public.enforce_min_branches() from public, anon, authenticated;

create trigger branches_min_one before delete on public.branches
  for each row execute function public.enforce_min_branches();
