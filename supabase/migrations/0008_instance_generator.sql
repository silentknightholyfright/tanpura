-- ============================================================================
-- Tanpura — Phase 2: Lesson Instance Generation
--
-- Adds a database function that generates lesson_instances 8 weeks ahead
-- from all active lesson_templates, skipping calendar_days entries.
-- Scheduled to run daily at 01:00 Europe/London via pg_cron.
--
-- day_of_week mapping (schema: 0=Mon … 6=Sun):
--   Postgres EXTRACT(DOW) returns 0=Sun, 1=Mon … 6=Sat
--   Conversion: pg_dow = (day_of_week + 1) % 7
--
-- Idempotent: uses ON CONFLICT (template_id, date) DO NOTHING so it is safe
-- to run multiple times per day or to call manually.
-- ============================================================================


-- ============================================================================
-- 1. Core generator function
-- ============================================================================

create or replace function public.generate_lesson_instances()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_horizon date := current_date + interval '56 days'; -- 8 weeks ahead
begin
  insert into public.lesson_instances (
    template_id,
    teacher_id,
    instrument_id,
    type,
    date,
    start_time,
    duration_mins,
    room,
    status,
    is_one_off
  )
  select
    t.id,
    t.teacher_id,
    t.instrument_id,
    t.type,
    d::date,
    t.start_time,
    t.duration_mins,
    t.room,
    'scheduled'::public.lesson_instance_status,
    false
  from public.lesson_templates t
  cross join generate_series(current_date, v_horizon, interval '1 day') as d
  where t.is_active = true
    -- map our day_of_week (0=Mon…6=Sun) to Postgres DOW (0=Sun…6=Sat)
    and extract(dow from d)::int = (t.day_of_week + 1) % 7
    and public.is_school_open(d::date)
  on conflict (template_id, date) do nothing;
end;
$$;

comment on function public.generate_lesson_instances() is
  'Generates lesson_instances for all active templates up to 8 weeks ahead,
   skipping calendar_days closures. Safe to call multiple times (idempotent).';


-- ============================================================================
-- 2. Schedule via pg_cron
--
-- Requires the pg_cron extension. For local Supabase development, enable it
-- by adding to supabase/config.toml:
--
--   [db.cron]
--   database_name = "postgres"
--
-- Then run: supabase db reset
--
-- For a remote Supabase project: enable pg_cron in the dashboard under
-- Database → Extensions before applying this migration.
-- ============================================================================

-- Enable extension (no-op if already enabled)
create extension if not exists pg_cron with schema extensions;

-- Remove any existing schedule with this name before (re-)creating it
select cron.unschedule('tanpura-generate-instances')
where exists (
  select 1 from cron.job where jobname = 'tanpura-generate-instances'
);

-- Run daily at 01:00 UTC (adjust if school is in a different timezone; instance
-- dates are stored as plain dates so the exact hour only matters for ordering
-- relative to the school day start)
select cron.schedule(
  'tanpura-generate-instances',
  '0 1 * * *',
  $$ select public.generate_lesson_instances(); $$
);
