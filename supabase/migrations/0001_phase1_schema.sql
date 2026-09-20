-- ============================================================================
-- Tanpura — Phase 1 Schema
-- Music School Management App for Oriental Fine Arts Academy
--
-- Scope (per SPEC.md §9 Phase 1):
--   Identity & Access      : Users, Parents
--   People                 : Teachers, Students, Student_Parents
--   Catalogue              : Instruments, Grades
--   Enrolment & Scheduling : Enrolments, Lesson_Templates, Template_Enrolments
--   Pricing                : Pricing
--
-- Phase 2 (Lesson_Instances, Attendance) and Phase 3 (Invoices,
-- Invoice_Line_Items, Reminders) tables are intentionally not created here.
--
-- Decisions baked in (see DOCS/SPEC_REVIEW.md):
--   * Parents have their own auth (Option B in C1)
--   * Users.id mirrors auth.users(id)
--   * Soft-delete via is_active flags; no hard deletes on referenced entities
-- ============================================================================

-- Required extensions ---------------------------------------------------------
create extension if not exists "pgcrypto";


-- ============================================================================
-- Helpers
-- ============================================================================

-- Generic updated_at trigger function. Reused by every table that has one.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;


-- ============================================================================
-- Enums
-- ============================================================================

create type public.user_role     as enum ('admin', 'teacher', 'student', 'parent');
create type public.enrolment_status as enum ('active', 'paused', 'dropped');
create type public.lesson_type   as enum ('1-1', 'group');


-- ============================================================================
-- 1. Identity & Access
-- ============================================================================

-- public.users mirrors auth.users via shared id. Insertion is handled by the
-- handle_new_user() trigger below; the application updates the role/full_name
-- as soon as the user signs up.
create table public.users (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text not null,
  phone           text,
  role            public.user_role not null default 'student',
  full_name       text,
  push_token      text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index users_email_key       on public.users (lower(email));
create unique index users_phone_key       on public.users (phone) where phone is not null;
create        index users_role_idx        on public.users (role);

create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();


-- Parents extend Users with WhatsApp + language preferences. With Option B
-- (parents have their own login), one Parent row per Users row.
create table public.parents (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null unique references public.users(id) on delete cascade,
  whatsapp_number     text,
  preferred_language  text not null default 'en',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index parents_whatsapp_idx on public.parents (whatsapp_number) where whatsapp_number is not null;

create trigger parents_set_updated_at
  before update on public.parents
  for each row execute function public.set_updated_at();


-- ============================================================================
-- 2. People
-- ============================================================================

create table public.teachers (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references public.users(id) on delete cascade,
  bio         text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger teachers_set_updated_at
  before update on public.teachers
  for each row execute function public.set_updated_at();


create table public.students (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null unique references public.users(id) on delete cascade,
  date_of_birth      date,
  emergency_contact  text,
  is_active          boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create trigger students_set_updated_at
  before update on public.students
  for each row execute function public.set_updated_at();


-- Junction table linking students to one or more parents/guardians.
-- exactly one of those links is flagged is_primary = true.
create table public.student_parents (
  student_id    uuid not null references public.students(id) on delete cascade,
  parent_id     uuid not null references public.parents(id)  on delete cascade,
  relationship  text not null check (relationship in ('mother', 'father', 'guardian')),
  is_primary    boolean not null default false,
  created_at    timestamptz not null default now(),
  primary key (student_id, parent_id)
);

create index student_parents_parent_idx on public.student_parents (parent_id);

-- Enforce at-most-one primary recipient per student.
create unique index student_parents_one_primary_per_student
  on public.student_parents (student_id)
  where is_primary;


-- ============================================================================
-- 3. Catalogue
-- ============================================================================

create table public.instruments (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index instruments_name_key on public.instruments (lower(name));

create trigger instruments_set_updated_at
  before update on public.instruments
  for each row execute function public.set_updated_at();


-- OFAAL grades are per-instrument (Grades 1–8). One row per (instrument, level).
create table public.grades (
  id            uuid primary key default gen_random_uuid(),
  instrument_id uuid not null references public.instruments(id) on delete restrict,
  level         int  not null check (level between 1 and 8),
  label         text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (instrument_id, level)
);

create trigger grades_set_updated_at
  before update on public.grades
  for each row execute function public.set_updated_at();


-- ============================================================================
-- 4. Enrolment & Scheduling
-- ============================================================================

-- One enrolment = one student learning one instrument with one teacher at one
-- grade. A student can hold multiple active enrolments simultaneously.
create table public.enrolments (
  id             uuid primary key default gen_random_uuid(),
  student_id     uuid not null references public.students(id)    on delete restrict,
  teacher_id     uuid not null references public.teachers(id)    on delete restrict,
  instrument_id  uuid not null references public.instruments(id) on delete restrict,
  grade_id       uuid not null references public.grades(id)      on delete restrict,
  status         public.enrolment_status not null default 'active',
  start_date     date not null,
  end_date       date,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);

create index enrolments_student_idx    on public.enrolments (student_id);
create index enrolments_teacher_idx    on public.enrolments (teacher_id);
create index enrolments_instrument_idx on public.enrolments (instrument_id);
create index enrolments_status_idx     on public.enrolments (status);

create trigger enrolments_set_updated_at
  before update on public.enrolments
  for each row execute function public.set_updated_at();


-- Recurring lesson schedule. Admin-only management.
create table public.lesson_templates (
  id              uuid primary key default gen_random_uuid(),
  teacher_id      uuid not null references public.teachers(id)    on delete restrict,
  instrument_id   uuid not null references public.instruments(id) on delete restrict,
  type            public.lesson_type not null,
  day_of_week     int  not null check (day_of_week between 0 and 6), -- 0 = Mon … 6 = Sun
  start_time      time not null,
  duration_mins   int  not null check (duration_mins > 0),
  room            text,
  is_active       boolean not null default true,
  max_capacity    int  not null default 10 check (max_capacity > 0),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index lesson_templates_teacher_idx    on public.lesson_templates (teacher_id);
create index lesson_templates_instrument_idx on public.lesson_templates (instrument_id);

create trigger lesson_templates_set_updated_at
  before update on public.lesson_templates
  for each row execute function public.set_updated_at();


-- Which enrolments (i.e. which student-with-this-instrument) are on which template.
create table public.template_enrolments (
  template_id   uuid not null references public.lesson_templates(id) on delete cascade,
  enrolment_id  uuid not null references public.enrolments(id)       on delete cascade,
  joined_at     date not null default current_date,
  primary key (template_id, enrolment_id)
);

create index template_enrolments_enrolment_idx on public.template_enrolments (enrolment_id);


-- ============================================================================
-- 5. Pricing
-- ============================================================================

-- Rate lookup by instrument + teacher + lesson_type + duration. Multiple rows
-- may exist for the same combination; the most recent effective_from <= lesson
-- date wins (see resolve_price() below).
create table public.pricing (
  id              uuid primary key default gen_random_uuid(),
  instrument_id   uuid not null references public.instruments(id) on delete restrict,
  teacher_id      uuid not null references public.teachers(id)    on delete restrict,
  lesson_type     public.lesson_type not null,
  duration_mins   int  not null check (duration_mins > 0),
  amount          numeric(10, 2) not null check (amount >= 0),
  effective_from  date not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Avoid duplicate rate rows for the same combination on the same effective date.
create unique index pricing_unique_effective
  on public.pricing (instrument_id, teacher_id, lesson_type, duration_mins, effective_from);

create index pricing_lookup_idx
  on public.pricing (instrument_id, teacher_id, lesson_type, duration_mins, effective_from desc);

create trigger pricing_set_updated_at
  before update on public.pricing
  for each row execute function public.set_updated_at();


-- Canonical price-resolution function. Used by Phase 3 invoice generation, but
-- defined here so the rule lives in one place.
create or replace function public.resolve_price(
  p_instrument_id uuid,
  p_teacher_id    uuid,
  p_lesson_type   public.lesson_type,
  p_duration_mins int,
  p_lesson_date   date
)
returns numeric
language sql
stable
as $$
  select amount
  from public.pricing
  where instrument_id = p_instrument_id
    and teacher_id    = p_teacher_id
    and lesson_type   = p_lesson_type
    and duration_mins = p_duration_mins
    and effective_from <= p_lesson_date
  order by effective_from desc
  limit 1
$$;


-- ============================================================================
-- 6. Auth signup hook
-- ============================================================================

-- When a new auth.users row appears, create the matching public.users row so
-- the app always has a profile to read. Role defaults to 'student'; admin can
-- upgrade later.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.users (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
