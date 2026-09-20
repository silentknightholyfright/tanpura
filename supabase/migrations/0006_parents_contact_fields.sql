-- ============================================================================
-- Tanpura — Add contact fields to parents
--
-- When parents.user_id was dropped (0005), the parent's name and email went
-- with it (those had lived on the linked users row). This migration adds
-- full_name and email directly to the parents table so admin screens can
-- display and search parent contact details.
-- ============================================================================

alter table public.parents
  add column full_name text,
  add column email     text;

-- Index for admin search by name / email
create index parents_full_name_idx on public.parents (lower(full_name)) where full_name is not null;
create index parents_email_idx     on public.parents (lower(email))     where email is not null;
