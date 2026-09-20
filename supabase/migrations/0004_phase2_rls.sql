-- ============================================================================
-- Tanpura — Phase 2 Row Level Security
-- Implements the permissions matrix in SPEC.md §8 for Phase 2 tables:
--   calendar_days, lesson_instances, attendance
-- ============================================================================


-- ============================================================================
-- Helper: is the current user the teacher for a given lesson instance?
-- Works for both template-backed instances (via lesson_templates) and
-- one-off instances (via lesson_instances.teacher_id directly).
-- ============================================================================

create or replace function public.is_teacher_for_instance(p_instance_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.lesson_instances li
    left join public.lesson_templates lt on lt.id = li.template_id
    join public.teachers t
      on t.id = coalesce(li.teacher_id, lt.teacher_id)
    where li.id     = p_instance_id
      and t.user_id = auth.uid()
  )
$$;

-- Helper: is the current user a student or parent of a student who has an
-- attendance record for the given instance?
create or replace function public.is_student_or_parent_for_instance(p_instance_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.attendance a
    where a.instance_id = p_instance_id
      and (
        -- the student themselves
        public.is_self_student(a.student_id)
        -- or a linked parent
        or public.is_parent_of_student(a.student_id)
      )
  )
$$;


-- ============================================================================
-- Enable RLS on Phase 2 tables
-- ============================================================================

alter table public.calendar_days      enable row level security;
alter table public.lesson_instances   enable row level security;
alter table public.attendance         enable row level security;


-- ============================================================================
-- calendar_days
--   read  : all authenticated users (teachers/parents/students all need to
--            know when the school is open so the schedule is accurate)
--   write : admin only
-- ============================================================================

create policy calendar_days_select_authenticated
  on public.calendar_days for select
  using (auth.uid() is not null);

create policy calendar_days_admin_write
  on public.calendar_days for all
  using (public.is_admin())
  with check (public.is_admin());


-- ============================================================================
-- lesson_instances
--   read  : admin
--           the teacher of the instance
--           students with an attendance row on the instance (and their parents)
--           students enrolled in the template (so they can see upcoming lessons
--           before attendance is marked)
--   write : admin (all); teacher (cancel their own, add capacity_override)
--           insert of new instances: admin only (worker runs as service-role)
-- ============================================================================

create policy lesson_instances_select
  on public.lesson_instances for select
  using (
    public.is_admin()
    or public.is_teacher_for_instance(id)
    -- enrolled students/parents (template-backed instances)
    or exists (
      select 1
      from public.template_enrolments te
      join public.enrolments          e on e.id = te.enrolment_id
      where te.template_id = lesson_instances.template_id
        and lesson_instances.template_id is not null
        and (
          public.is_self_student(e.student_id)
          or public.is_parent_of_student(e.student_id)
        )
    )
    -- students/parents who already have an attendance row (catches ad-hoc + one-offs)
    or public.is_student_or_parent_for_instance(id)
  );

-- Admins can do anything (insert via service-role worker is allowed too).
create policy lesson_instances_admin_all
  on public.lesson_instances for all
  using (public.is_admin())
  with check (public.is_admin());

-- Teachers can update their own instances (cancel, add override capacity).
-- They cannot insert or delete instances.
create policy lesson_instances_teacher_update
  on public.lesson_instances for update
  using (public.is_teacher_for_instance(id))
  with check (public.is_teacher_for_instance(id));


-- ============================================================================
-- attendance
--   read  : admin
--           the teacher of the instance
--           the student themselves
--           any linked parent of that student
--   insert: admin; teacher (for their own instances, including ad-hoc adds)
--   update: admin; teacher (for their own instances — marks status + overrides)
--   delete: admin only (corrections; teachers cannot delete attendance rows)
-- ============================================================================

create policy attendance_select
  on public.attendance for select
  using (
    public.is_admin()
    or public.is_teacher_for_instance(instance_id)
    or public.is_self_student(student_id)
    or public.is_parent_of_student(student_id)
  );

create policy attendance_admin_all
  on public.attendance for all
  using (public.is_admin())
  with check (public.is_admin());

-- Teachers can insert attendance rows for their own lesson instances.
create policy attendance_teacher_insert
  on public.attendance for insert
  with check (public.is_teacher_for_instance(instance_id));

-- Teachers can update attendance rows for their own lesson instances.
-- This covers marking present/absent/late and setting fee overrides.
create policy attendance_teacher_update
  on public.attendance for update
  using (public.is_teacher_for_instance(instance_id))
  with check (public.is_teacher_for_instance(instance_id));
