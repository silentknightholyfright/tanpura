-- ============================================================================
-- Tanpura — Phase 1 Row Level Security
-- Implements the permissions matrix in SPEC.md §8 for Phase 1 tables.
-- ============================================================================

-- ============================================================================
-- Helper functions
-- ============================================================================

-- Returns the role of the currently authenticated user, or NULL if anon.
-- SECURITY DEFINER so it can read public.users without recursing through RLS.
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'admin', false)
$$;

-- True when the current user is the teacher on at least one enrolment for
-- the given student.
create or replace function public.is_teacher_for_student(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.enrolments e
    join public.teachers   t on t.id = e.teacher_id
    where e.student_id = p_student_id
      and t.user_id    = auth.uid()
  )
$$;

-- True when the current user is the teacher on the given enrolment.
create or replace function public.is_teacher_for_enrolment(p_enrolment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.enrolments e
    join public.teachers   t on t.id = e.teacher_id
    where e.id       = p_enrolment_id
      and t.user_id  = auth.uid()
  )
$$;

-- True when the current user is the teacher on the given lesson template.
create or replace function public.is_teacher_for_template(p_template_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.lesson_templates lt
    join public.teachers          t on t.id = lt.teacher_id
    where lt.id     = p_template_id
      and t.user_id = auth.uid()
  )
$$;

-- True when the current user is a linked parent of the given student.
create or replace function public.is_parent_of_student(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.student_parents sp
    join public.parents          p on p.id = sp.parent_id
    where sp.student_id = p_student_id
      and p.user_id     = auth.uid()
  )
$$;

-- True when the current user IS the given student.
create or replace function public.is_self_student(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.students
    where id = p_student_id and user_id = auth.uid()
  )
$$;


-- ============================================================================
-- Enable RLS on every Phase 1 table
-- ============================================================================
alter table public.users               enable row level security;
alter table public.parents             enable row level security;
alter table public.teachers            enable row level security;
alter table public.students            enable row level security;
alter table public.student_parents     enable row level security;
alter table public.instruments         enable row level security;
alter table public.grades              enable row level security;
alter table public.enrolments          enable row level security;
alter table public.lesson_templates    enable row level security;
alter table public.template_enrolments enable row level security;
alter table public.pricing             enable row level security;


-- ============================================================================
-- users
--   read : self + admin
--   write: self (limited fields) + admin
-- ============================================================================

create policy users_select_self_or_admin
  on public.users for select
  using (id = auth.uid() or public.is_admin());

create policy users_update_self
  on public.users for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy users_admin_all
  on public.users for all
  using (public.is_admin())
  with check (public.is_admin());


-- ============================================================================
-- parents
--   read : self + admin + the children's teacher (so teacher can see contact)
--   write: self (limited) + admin
-- ============================================================================

create policy parents_select_self_or_admin
  on public.parents for select
  using (
    user_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1
      from public.student_parents sp
      where sp.parent_id = parents.id
        and public.is_teacher_for_student(sp.student_id)
    )
  );

create policy parents_update_self
  on public.parents for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy parents_admin_all
  on public.parents for all
  using (public.is_admin())
  with check (public.is_admin());


-- ============================================================================
-- teachers
--   read : authenticated users (so students/parents can see who their teacher is)
--   write: self (bio) + admin
-- ============================================================================

create policy teachers_select_authenticated
  on public.teachers for select
  using (auth.uid() is not null);

create policy teachers_update_self
  on public.teachers for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy teachers_admin_all
  on public.teachers for all
  using (public.is_admin())
  with check (public.is_admin());


-- ============================================================================
-- students
--   read : self, the student's parent(s), the student's teacher(s), admin
--   write: self (limited), admin
-- ============================================================================

create policy students_select
  on public.students for select
  using (
    public.is_admin()
    or user_id = auth.uid()
    or public.is_parent_of_student(students.id)
    or public.is_teacher_for_student(students.id)
  );

create policy students_update_self
  on public.students for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy students_admin_all
  on public.students for all
  using (public.is_admin())
  with check (public.is_admin());


-- ============================================================================
-- student_parents (junction)
--   read : student themselves, the linked parent, the student's teachers, admin
--   write: admin only (link/unlink + flip is_primary)
-- ============================================================================

create policy student_parents_select
  on public.student_parents for select
  using (
    public.is_admin()
    or public.is_self_student(student_id)
    or public.is_parent_of_student(student_id)
    or public.is_teacher_for_student(student_id)
  );

create policy student_parents_admin_write
  on public.student_parents for all
  using (public.is_admin())
  with check (public.is_admin());


-- ============================================================================
-- instruments
--   read : all authenticated users
--   write: admin only
-- ============================================================================

create policy instruments_select_authenticated
  on public.instruments for select
  using (auth.uid() is not null);

create policy instruments_admin_write
  on public.instruments for all
  using (public.is_admin())
  with check (public.is_admin());


-- ============================================================================
-- grades
--   read : all authenticated users
--   write: admin only
-- ============================================================================

create policy grades_select_authenticated
  on public.grades for select
  using (auth.uid() is not null);

create policy grades_admin_write
  on public.grades for all
  using (public.is_admin())
  with check (public.is_admin());


-- ============================================================================
-- enrolments
--   read : admin, the student, the student's parents, the assigned teacher
--   write: admin only
-- ============================================================================

create policy enrolments_select
  on public.enrolments for select
  using (
    public.is_admin()
    or public.is_self_student(student_id)
    or public.is_parent_of_student(student_id)
    or public.is_teacher_for_student(student_id)
  );

create policy enrolments_admin_write
  on public.enrolments for all
  using (public.is_admin())
  with check (public.is_admin());


-- ============================================================================
-- lesson_templates
--   read : admin, the assigned teacher, anyone enrolled (via template_enrolments
--          → enrolments → student/parent)
--   write: admin only
-- ============================================================================

create policy lesson_templates_select
  on public.lesson_templates for select
  using (
    public.is_admin()
    or public.is_teacher_for_template(id)
    or exists (
      select 1
      from public.template_enrolments te
      join public.enrolments          e on e.id = te.enrolment_id
      where te.template_id = lesson_templates.id
        and (
             public.is_self_student(e.student_id)
          or public.is_parent_of_student(e.student_id)
        )
    )
  );

create policy lesson_templates_admin_write
  on public.lesson_templates for all
  using (public.is_admin())
  with check (public.is_admin());


-- ============================================================================
-- template_enrolments (junction)
--   read : admin, the teacher of the template, the enrolled student / their parent
--   write: admin only
-- ============================================================================

create policy template_enrolments_select
  on public.template_enrolments for select
  using (
    public.is_admin()
    or public.is_teacher_for_template(template_id)
    or public.is_teacher_for_enrolment(enrolment_id)
    or exists (
      select 1
      from public.enrolments e
      where e.id = template_enrolments.enrolment_id
        and (
             public.is_self_student(e.student_id)
          or public.is_parent_of_student(e.student_id)
        )
    )
  );

create policy template_enrolments_admin_write
  on public.template_enrolments for all
  using (public.is_admin())
  with check (public.is_admin());


-- ============================================================================
-- pricing
--   read : admin + the teacher whose rate it is
--   write: admin only
--
-- (Students/parents do not see pricing rows directly. They see the resolved
-- amount on their invoice/line items in Phase 3.)
-- ============================================================================

create policy pricing_select
  on public.pricing for select
  using (
    public.is_admin()
    or exists (
      select 1
      from public.teachers t
      where t.id = pricing.teacher_id
        and t.user_id = auth.uid()
    )
  );

create policy pricing_admin_write
  on public.pricing for all
  using (public.is_admin())
  with check (public.is_admin());
