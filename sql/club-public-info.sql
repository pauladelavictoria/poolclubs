-- The three club columns a stranger should be able to read: what the club says
-- about itself, how to phone it, and when it is open.
--
-- Apply with `npm run db:sql sql/club-public-info.sql`, then `npm run db:dump`
-- and `npm run db:types`. See sql/README.md.
--
-- ORDER MATTERS. `phone`, `description` and `schedule` already exist on the
-- table — they landed with the location work and nothing has ever read them —
-- but anon's SELECT on public.clubs is column-scoped (sql/public-pages.sql,
-- section 3), and a column-scoped grant does not fail soft. A `select()` naming
-- an ungranted column returns a permission error for the *whole row*, so the
-- public club page would go from missing its hours to showing nothing at all.
--
-- So: run this file BEFORE deploying the app change that adds these three to
-- CLUB_COLS in src/queries/public/shared.ts. The reverse order is an outage on
-- every public club page.
--
-- No new policy is needed. "Public clubs are readable by anyone" is a row
-- policy (USING (is_public)) and says nothing about columns, and the write side
-- is "Owner can update club", which is not column-scoped either.

BEGIN;

-- Additive to the grant in sql/public-pages.sql rather than a replacement: a
-- second GRANT SELECT adds columns, it does not narrow the existing set. The
-- list there stays the authoritative one — if that file is ever re-run on its
-- own it will take these three away again, so add them there too when you next
-- touch it.
--
-- Still withheld, and deliberately: owner_id, which identifies an auth user.
GRANT SELECT (
    -- Free text the admin writes about the club.
    description,
    -- A public venue's phone number, rendered as a tel: link.
    phone,
    -- Opening hours. jsonb with no CHECK on purpose: it is display data and
    -- nothing queries it. The shape is defined and defended in
    -- src/libs/algorithms/schedule.ts, which is tolerant by construction — a
    -- hand-edited row renders as "no hours" rather than crashing the page.
    schedule,
    -- Not decoration: "open now" is only ever true or false in the *club's*
    -- clock, and a visitor reading from another country asking their own
    -- browser would get an answer about the wrong building. isOpenNow takes
    -- the zone for exactly this reason. Nothing about it is sensitive — it is
    -- the same fact as the address already granted above.
    timezone
) ON public.clubs TO anon;

COMMIT;
