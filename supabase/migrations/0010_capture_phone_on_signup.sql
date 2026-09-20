-- ============================================================================
-- 0010 — Capture phone number from signup metadata
-- ============================================================================
--
-- The handle_new_user trigger previously only captured full_name and email.
-- We now also read 'phone' from raw_user_meta_data so that clients can pass
-- it at sign-up time and have it land in public.users atomically.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.users (id, email, full_name, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'phone', '')), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
