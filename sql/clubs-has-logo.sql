-- =============================================
-- clubs.has_logo
-- =============================================
--
-- The directory should lead with the clubs that have made themselves
-- recognisable. A club with a logo draws that logo as its map pin and its card;
-- one without draws a generic teardrop and an initial. On the map the plain
-- pins were burying the logos in Barcelona and Valencia, and the same holds in
-- the list — 127 seeded directory entries pushing the real, claimed clubs down
-- the page is the wrong order to read them in.
--
-- Why a column rather than an ORDER BY: PostgREST orders by columns, not
-- expressions, and ordering by logo_url itself is not a substitute —
-- `nullsFirst: false` would put the logos first but then sort them among
-- themselves by the base64 of the image, throwing away the member_count and
-- name ordering that the sort is supposed to be. A stored generated column
-- gives the sort one boolean to work with and stays true on its own.
--
-- The grant is not optional: this schema grants SELECT column by column, so a
-- new column is invisible to the public directory until it is named here.
--
-- Apply with `npm run db:sql sql/clubs-has-logo.sql`, then `npm run db:dump`
-- and `npm run db:types`, then delete this file — see sql/README.md.
-- =============================================

BEGIN;

ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS has_logo boolean
  GENERATED ALWAYS AS (logo_url IS NOT NULL) STORED;

COMMENT ON COLUMN public.clubs.has_logo IS
  'Sortable mirror of "logo_url IS NOT NULL": the directory and the map lead with clubs that have one.';

GRANT SELECT(has_logo) ON TABLE public.clubs TO anon;
GRANT SELECT(has_logo) ON TABLE public.clubs TO authenticated;

COMMIT;
