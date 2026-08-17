-- Where the club actually is: a street address, and the coordinates that go
-- with it.
--
-- Apply with `npm run db:sql sql/club-location.sql`, then `npm run db:dump`
-- and `npm run db:types`. See sql/README.md.
--
-- The admin never types coordinates. They search an address in the club
-- settings form, pick a suggestion, and all five columns land together from
-- the same Photon result — see src/libs/geocode.ts. That is why lat/lon are
-- nullable and unconstrained beyond their range: a club that never bothered
-- has none, and one that did has a pair that came from a real geocoder rather
-- than from a hand-typed number.
ALTER TABLE public.clubs
    -- Street and number as the geocoder wrote them, or the name of the venue
    -- when the match is a place rather than a house number.
    ADD COLUMN IF NOT EXISTS address text,
    ADD COLUMN IF NOT EXISTS city text,
    -- ISO 3166-1 alpha-2, uppercase. The display name is Intl.DisplayNames'
    -- job, in the reader's own language — storing "España" would pin it to
    -- whichever language the admin happened to be using.
    ADD COLUMN IF NOT EXISTS country text,
    ADD COLUMN IF NOT EXISTS lat double precision,
    ADD COLUMN IF NOT EXISTS lon double precision;

-- Its own statement, and drop-then-add, because there is no
-- ADD CONSTRAINT IF NOT EXISTS. Subcommands of one ALTER TABLE run in order
-- and the whole statement is atomic, so the table is never briefly unchecked.
-- This file is applied by hand and there is no migration runner (sql/README.md),
-- so re-running it has to be safe — the first attempt at it was not, and left
-- the columns in with the grant below still missing.
ALTER TABLE public.clubs
    DROP CONSTRAINT IF EXISTS clubs_country_shape,
    DROP CONSTRAINT IF EXISTS clubs_latlon_pair,
    ADD CONSTRAINT clubs_country_shape CHECK (country IS NULL OR country ~ '^[A-Z]{2}$'),
    -- One without the other is a bug, not a half-known location.
    ADD CONSTRAINT clubs_latlon_pair CHECK (
        (lat IS NULL) = (lon IS NULL)
        AND (lat IS NULL OR (lat BETWEEN -90 AND 90 AND lon BETWEEN -180 AND 180))
    );

-- No new RLS policy needed: "Owner can update club" already covers every
-- column of an UPDATE, and it is not column-scoped. Same as club-branding.sql.

-- Anon's SELECT on clubs is column-granted, not table-wide (sql/public-pages.sql
-- revokes the table grant), so the map at /clubs cannot read these without
-- being told to. Additive: GRANT SELECT (cols) adds to what anon already has.
--
-- This publishes the club's street address to anyone, which is the point — a
-- directory people use to find somewhere to play — but it is only ever the
-- address of a venue the owner chose to list, never a person's home. A club
-- with is_public = false is still filtered out by the anon read policy.
GRANT SELECT (address, city, country, lat, lon) ON public.clubs TO anon;
