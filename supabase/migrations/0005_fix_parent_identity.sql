-- ============================================================================
-- Tanpura — Corrective Migration: Parent Identity (Option A)
--
-- ADR-001 was accepted: parents have NO separate login. They are contact
-- records linked to a student via student_parents. The student's credentials
-- are the single family login.
--
-- The Phase 1 schema (0001) and RLS (0002) were scaffolded under the Option B
-- assumption (parents have their own auth account). This migration cleans that
-- up across all affected tables, functions, and policies.
--
-- Execution order (respects Postgres dependency rules):
--   1. Drop ALL policies that reference the old column or old functions
--   2. Drop old functions (is_parent_of_student, is_student_or_parent_for_instance)
--   3. Drop parents.user_id column
--   4. Recreate all policies with the corrected logic
-- ============================================================================


-- ============================================================================
-- 1. Drop all policies that depend on the column or functions being removed
-- ============================================================================

-- parents — depend on user_id column
drop policy if exists parents_select_self_or_admin on public.parents;
drop policy if exists parents_update_self          on public.parents;

-- Phase 1 policies that call is_parent_of_student()
drop policy if exists students_select           on public.students;
drop policy if exists student_parents_select    on public.student_parents;
drop policy if exists enrolments_select         on public.enrolments;
drop policy if exists lesson_templates_select   on public.lesson_templates;
drop policy if exists template_enrolments_select on public.template_enrolments;

-- Phase 2 policies that call is_student_or_parent_for_instance()
drop policy if exists lesson_instances_select on public.lesson_instances;
drop policy if exists attendance_select       on public.attendance;


-- ============================================================================
-- 2. Drop old helper functions
-- ============================================================================

drop function if exists public.is_parent_of_student(uuid);
drop function if exists public.is_student_or_parent_for_instance(uuid);


-- ============================================================================
-- 3. Drop parents.user_id column
--    Postgres automatically drops the FK constraint and unique index.
-- ============================================================================

alter table public.parents
  drop column if exists user_id;


-- ============================================================================
-- 4. Recreate all policies
-- ============================================================================

-- ── parents ───────────────────────────────────────────────────────────────
-- Readable by admin, the student's teacher, or the student themselves.
-- No self-update: parents cannot log in; admin manages all parent records.

create policy parents_select_admin_teacher_or_student
  on public.parents for select
  using (
    public.is_admin()
    or exists (
      select 1
      from public.student_parents sp
      where sp.parent_id = parents.id
        and public.is_teacher_for_student(sp.student_id)
    )
    or exists (
      select 1
      from public.student_parents sp
      where sp.parent_id = parents.id
        and public.is_self_student(sp.student_id)
    )
  );

-- ── students ──────────────────────────────────────────────────────────────

create policy students_select
  on public.students for select
  using (
    public.is_admin()
    or user_id = auth.uid()
    or public.is_teacher_for_student(students.id)
  );

-- ── student_parents ───────────────────────────────────────────────────────

create policy student_parents_select
  on public.student_parents for select
  using (
    public.is_admin()
    or public.is_self_student(student_id)
    or public.is_teacher_for_student(student_id)
  );

-- ── enrolments ────────────────────────────────────────────────────────────

create policy enrolments_select
  on public.enrolments for select
  using (
    public.is_admin()
    or public.is_self_student(student_id)
    or public.is_teacher_for_student(student_id)
  );

-- ── lesson_templates ──────────────────────────────────────────────────────

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
        and public.is_self_student(e.student_id)
    )
  );

-- ── template_enrolments ───────────────────────────────────────────────────

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
        and public.is_self_student(e.student_id)
    )
  );

-- ── lesson_instances ──────────────────────────────────────────────────────

create policy lesson_instances_select
  on public.lesson_instances for select
  using (
    public.is_admin()
    or public.is_teacher_for_instance(id)
    -- enrolled students via template
    or exists (
      select 1
      from public.template_enrolments te
      join public.enrolments          e on e.id = te.enrolment_id
      where te.template_id = lesson_instances.template_id
        and lesson_instances.template_id is not null
        and public.is_self_student(e.student_id)
    )
    -- students with an attendance row (ad-hoc + one-offs)
    or exists (
      select 1
      from public.attendance a
      where a.instance_id = lesson_instances.id
        and public.is_self_student(a.student_id)
    )
  );

-- ── attendance ────────────────────────────────────────────────────────────

create policy attendance_select
  on public.attendance for select
  using (
    public.is_admin()
    or public.is_teacher_for_instance(instance_id)
    or public.is_self_student(student_id)
  );
