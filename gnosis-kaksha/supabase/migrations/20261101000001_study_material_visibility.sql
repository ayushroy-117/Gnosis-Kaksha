-- =============================================================================
-- Study material: staff choose which files appear on the public "Free Study
-- Materials" page. Signed-in students and staff always see everything for
-- their class. Existing files stay public (that's how they behave today).
-- Idempotent.
-- =============================================================================

alter table public.study_materials
  add column if not exists is_public boolean not null default true;
