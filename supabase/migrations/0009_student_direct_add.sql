-- ============================================================================
-- 0009 — Allow admins to create student profiles without an auth account
-- ============================================================================
--
-- Previously students.user_id was NOT NULL, meaning a student record could
-- only be created after the person had signed up via auth. This migration
-- makes user_id nullable so admins can pre-create student profiles with just
-- a name and optional email. When the student later registers, their auth
-- account can be linked to the existing row.
--
-- We also add full_name and email columns directly on students so admin-
-- created students (who have no users row) have somewhere to store them.
-- Queries should prefer users.full_name / users.email when user_id is set,
-- falling back to students.full_name / students.email otherwise.

alter table public.students
  alter column user_id drop not null;

alter table public.students
  add column if not exists full_name text,
  add column if not exists email     text;

-- Update RLS: the existing student self-select policy uses user_id = auth.uid().
-- This still works correctly for linked students; unlinked students (user_id IS NULL)
-- simply won't match any authenticated session, which is the intended behaviour
-- (admin-only managed, no app login).
