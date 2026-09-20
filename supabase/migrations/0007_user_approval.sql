-- ============================================================================
-- Tanpura — User approval gate
--
-- New students self-register via the Sign Up screen. Until an admin approves
-- them, their account is valid in Supabase Auth but blocked at the app layer:
-- the RootNavigator shows a PendingApprovalScreen instead of the main app.
--
-- Changes:
--   1. Add is_approved column to public.users (default false)
--   2. Add is_approved_user() helper for use in RLS / app-layer checks
--   3. Add admin_delete_user() SECURITY DEFINER function so admin can reject
--      a registration by deleting the auth.users row (cascades to public.users)
--   4. Approve all existing users (migration safety — no orphaned pending rows
--      for data that predates this migration)
-- ============================================================================


-- ============================================================================
-- 1. Add is_approved to users
-- ============================================================================

alter table public.users
  add column is_approved boolean not null default false;

-- Admins, teachers, and any existing accounts are approved immediately.
-- New sign-ups after this migration will land with is_approved = false.
update public.users set is_approved = true;


-- ============================================================================
-- 2. is_approved_user() helper
-- ============================================================================

create or replace function public.is_approved_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_approved from public.users where id = auth.uid()),
    false
  )
$$;


-- ============================================================================
-- 3. admin_delete_user() — for rejecting a registration
--
-- Deletes the auth.users row for the given user. The FK on public.users
-- (id references auth.users(id) ON DELETE CASCADE) ensures the public.users
-- row is removed automatically.
--
-- SECURITY DEFINER runs as the function owner (postgres / service role),
-- which has permission to delete from auth.users. The caller must be an admin.
-- ============================================================================

create or replace function public.admin_delete_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = auth, public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can delete user accounts';
  end if;

  -- Prevent admins from accidentally deleting themselves
  if p_user_id = auth.uid() then
    raise exception 'Cannot delete your own account';
  end if;

  delete from auth.users where id = p_user_id;
end;
$$;


-- ============================================================================
-- 4. RLS note
--
-- Unapproved users can already read only their own public.users row
-- (users_select_self_or_admin policy). They have no enrolments, no attendance,
-- no lesson access — so app-layer gating via RootNavigator is the primary
-- control. No RLS changes are required.
--
-- If stricter enforcement is needed later, add:
--   AND public.is_approved_user()
-- to the USING clauses of the relevant policies.
-- ============================================================================
