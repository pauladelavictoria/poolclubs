-- Per-club branding: a logo and an accent colour, admin-only.
--
-- Apply with `npm run db:sql sql/club-branding.sql`, then `npm run db:dump`
-- and `npm run db:types`. See sql/README.md.
--
-- The colour choice is one of the 8 solid balls (1-8), not a free picker: it
-- keys into a fixed, contrast-checked palette in src/libs/clubTheme.ts that
-- overrides the app's --color-strike tokens for members of that club, so a
-- real Postgres enum keeps the two in lockstep the same way "Discipline" does.
-- 'yellow' is first and is the default, because it is the 9-ball and already
-- the app's own accent — picking no colour changes nothing.
CREATE TYPE public."BallColor" AS ENUM (
    'yellow', 'blue', 'red', 'purple', 'orange', 'green', 'maroon', 'black'
);

ALTER TABLE public.clubs
    -- A data URI, same storage strategy as players.avatar_url: no bucket, no
    -- storage policies. See src/libs/avatarImage.ts for why that scales fine
    -- at logo size.
    ADD COLUMN logo_url text,
    ADD COLUMN theme_color public."BallColor" NOT NULL DEFAULT 'yellow';

-- No new RLS policy needed: "Owner can update club" already covers every
-- column of an UPDATE, and it is not column-scoped.
