-- The order a club's photos are shown in, and therefore which one is the cover.
--
-- Apply with `npm run db:sql sql/club-photo-order.sql`, then `npm run db:dump`
-- and `npm run db:types`. See sql/README.md.
--
-- ---------------------------------------------------------------------------
-- Why a column and still not a club_photos table
-- ---------------------------------------------------------------------------
-- sql/club-photos.sql said a table earns its place the day somebody wants to
-- choose which photo leads. That day arrived — but what was actually asked for
-- is an *order*, and an order is one value, not a row per photo.
--
-- Storage stays the source of truth for which photos exist. This array is only
-- a hint about sequence: an array of object paths, newest-appended, reconciled
-- against the bucket every time it is read (src/libs/algorithms/photoOrder.ts).
-- A path in here that no longer exists is dropped; an object in the bucket that
-- is not in here is appended. So the two can never disagree in a way anybody
-- sees, which is exactly the failure mode a parallel table would have — an
-- orphaned row rendering as a broken image nobody can delete.
--
-- Reordering is then one UPDATE on a row we already fetch on both the settings
-- page and the public page, under the existing "Owner can update club" policy.
-- No new table, no join, no new RLS.
--
-- The alternative was renaming objects to carry an index. That rewrites every
-- public URL on every drag, which breaks caches and any link anyone has shared.

BEGIN;

ALTER TABLE public.clubs
    ADD COLUMN IF NOT EXISTS "photo_order" jsonb DEFAULT '[]'::jsonb NOT NULL;

-- The public page needs it too: the cover is simply the first entry, and
-- without this the gallery would order itself differently for a visitor than
-- for the admin who arranged it. Same column-scoped grant as the rest — see
-- sql/club-public-info.sql for why the order of applying matters.
GRANT SELECT ("photo_order") ON TABLE public.clubs TO anon;

COMMIT;
