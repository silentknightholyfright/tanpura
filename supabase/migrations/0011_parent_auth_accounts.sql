-- ============================================================================
-- 0011 — Parent auth accounts
-- ============================================================================
--
-- Allows users to self-register as parents (role = 'parent'). When approved,
-- a parents row is created and linked to their auth account via user_id.
--
-- Previously the ADR said parents shared the student's login. This migration
-- supersedes that decision — parents now have their own accounts and can
-- view their children's schedules and receive notifications.

-- ============================================================================
-- 1. Link parents contact records to auth accounts
-- ============================================================================

alter table public.parents
  add column if not exists user_id uuid unique references public.users(id) on delete set null;

create index if not exists parents_user_id_idx
  on public.parents (user_id) where user_id is not null;

-- ============================================================================
-- 2. Update handle_new_user to respect 'role' from signup metadata.
--    Only 'student' and 'parent' are allowed from self-registration;
--    any other value (including 'admin' / 'teacher') falls back to 'student'
--    so a malicious metadata payload cannot escalate privileges.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_role public.user_role;
begin
  v_role := case
    when (new.raw_user_meta_data ->> 'role') = 'parent' then 'parent'::public.user_role
    else 'student'::public.user_role
  end;

  insert into public.users (id, email, full_name, phone, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'phone', '')), ''),
    v_role
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ============================================================================
-- 3. RLS — parents can read and update their own contact record
-- ============================================================================

-- Drop the old policy from 0005 (admin/teacher/student only) and replace
-- with one that also allows self-access via user_id.
drop policy if exists parents_select_admin_teacher_or_student on public.parents;

create policy parents_select_any_allowed
  on public.parents for select
  using (
    user_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.student_parents sp
      where sp.parent_id = parents.id
        and public.is_teacher_for_student(sp.student_id)
    )
    or exists (
      select 1 from public.student_parents sp
      where sp.parent_id = parents.id
        and public.is_self_student(sp.student_id)
    )
  );

create policy parents_update_own
  on public.parents for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ============================================================================
-- 4. RPC — get_my_children()
--    Security-definer function so the parent doesn't need direct RLS access
--    to student_parents or students — those tables are admin-managed.
-- ============================================================================

create or replace function public.get_my_children()
returns table (
  student_id     uuid,
  full_name      text,
  date_of_birth  date,
  relationship   text,
  is_primary     boolean
)
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_parent_id uuid;
begin
  -- Resolve the caller's parents row
  select id into v_parent_id
  from public.parents
  where user_id = auth.uid();

  if v_parent_id is null then
    return;  -- not a linked parent, return empty
  end if;

  return query
  select
    s.id,
    coalesce(u.full_name, s.full_name, '(unnamed)')::text,
    s.date_of_birth,
    sp.relationship,
    sp.is_primary
  from public.student_parents sp
  join public.students s  on s.id  = sp.student_id
  left join public.users u on u.id = s.user_id
  where sp.parent_id = v_parent_id
  order by sp.is_primary desc, coalesce(u.full_name, s.full_name);
end;
$$;
