-- ============================================================================
-- Tanpura — Seed data for local development
--
-- Inserts a starter set of instruments and OFAAL grades so the catalogue
-- screens have something to render. No users/students/teachers — those need
-- to be created via Supabase Auth + the handle_new_user trigger.
-- ============================================================================

insert into public.instruments (name) values
  ('Vocal'),
  ('Violin')
on conflict do nothing;

-- For every instrument, insert Grades 1–8.
insert into public.grades (instrument_id, level, label)
select i.id, lvl, 'Grade ' || lvl
from public.instruments i
cross join generate_series(1, 8) as lvl
on conflict do nothing;

