-- Delete grades for instruments being removed
delete from public.grades
where instrument_id in (
  select id from public.instruments
  where lower(name) not in ('vocal', 'violin')
);

-- Now safe to delete the instruments
delete from public.instruments
where lower(name) not in ('vocal', 'violin');

-- Add the correct ones
insert into public.instruments (name) values ('Vocal'), ('Violin')
on conflict do nothing;

-- Backfill grades 1–8
insert into public.grades (instrument_id, level, label)
select i.id, lvl, 'Grade ' || lvl
from public.instruments i
cross join generate_series(1, 8) as lvl
on conflict do nothing;