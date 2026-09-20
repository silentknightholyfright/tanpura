-- ============================================================================
-- 0012 — Parent-submitted child requests
--
-- Parents can submit their children for enrolment without the child having
-- an auth account (for younger kids). Submissions land as students with
-- pending_review = true and are confirmed by an admin.
-- ============================================================================

-- ============================================================================
-- 1. Add pending_review flag to students
-- ============================================================================

alter table public.students
  add column if not exists pending_review boolean not null default false;

create index if not exists students_pending_review_idx
  on public.students (id)
  where pending_review;

-- ============================================================================
-- 2. Update get_my_children() to include pending_review
--    (must drop + recreate because the return type changes)
-- ============================================================================

drop function if exists public.get_my_children();

create or replace function public.get_my_children()
returns table (
  student_id     uuid,
  full_name      text,
  date_of_birth  date,
  relationship   text,
  is_primary     boolean,
  pending_review boolean
)
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_parent_id uuid;
begin
  select id into v_parent_id
  from public.parents
  where user_id = auth.uid();

  if v_parent_id is null then
    return;
  end if;

  return query
  select
    s.id,
    coalesce(u.full_name, s.full_name, '(unnamed)')::text,
    s.date_of_birth,
    sp.relationship,
    sp.is_primary,
    s.pending_review
  from public.student_parents sp
  join public.students s   on s.id  = sp.student_id
  left join public.users u on u.id  = s.user_id
  where sp.parent_id = v_parent_id
  order by sp.is_primary desc, coalesce(u.full_name, s.full_name);
end;
$$;


-- ============================================================================
-- 3. RPC — add_my_child()
--    Parent submits a child for admin review. Creates the student row (no auth
--    account) and the student_parents link in one atomic transaction.
-- ============================================================================

create or replace function public.add_my_child(
  p_full_name    text,
  p_dob          date        default null,
  p_relationship text        default 'guardian'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent_id  uuid;
  v_student_id uuid;
begin
  -- Caller must be a linked, approved parent
  select p.id into v_parent_id
  from public.parents p
  join public.users   u on u.id = p.user_id
  where p.user_id = auth.uid()
    and u.is_approved = true;

  if v_parent_id is null then
    raise exception 'Only approved parents can add children';
  end if;

  if p_full_name is null or trim(p_full_name) = '' then
    raise exception 'Child name is required';
  end if;

  if p_relationship not in ('mother', 'father', 'guardian') then
    raise exception 'relationship must be mother, father, or guardian';
  end if;

  -- Create student (no auth account, pending admin review)
  insert into public.students (full_name, date_of_birth, pending_review)
  values (trim(p_full_name), p_dob, true)
  returning id into v_student_id;

  -- Link to this parent as primary contact
  insert into public.student_parents (student_id, parent_id, relationship, is_primary)
  values (v_student_id, v_parent_id, p_relationship, true);

  return v_student_id;
end;
$$;
