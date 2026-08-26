-- The club's own clock.
--
-- Apply with `npm run db:sql sql/club-timezone.sql`, then
-- `npm run db:dump && npm run db:types`.
--
-- Why a column and not the location it already has: `country` is not a zone —
-- Spain is two of them, and a club in Las Palmas rolls its night over an hour
-- after one in Valencia. Deriving a zone from lat/lon needs a boundary dataset
-- nobody wants in a bundle. One field an admin picks once is the whole answer.
--
-- What reads it: libs/day.ts, which buckets every result into the night it was
-- played in — 06:00 to 06:00, so the last three races of a Thursday that ran to
-- two in the morning are still Thursday's. Before this column that boundary was
-- a constant in the source.

ALTER TABLE public.clubs
    ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Europe/Madrid';

-- The default is the app's own fallback rather than UTC on purpose: every club
-- on here today is in Spain, and a club that never touches the setting should
-- get the night it already had rather than one shifted by two hours.
--
-- No backfill from `country`: it is a guess for exactly the countries where a
-- guess is wrong (US, BR, RU, AU, and Spain's own islands), and the default is
-- already right for everybody currently on the table.

-- A CHECK cannot hold a subquery, and an unknown zone is not a typo you find
-- out about later — it is a night that buckets its results into the wrong day
-- for as long as nobody notices. Postgres knows the list; ask it.
CREATE OR REPLACE FUNCTION public.clubs_timezone_guard() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_catalog'
    AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_timezone_names WHERE name = NEW.timezone
  ) THEN
    RAISE EXCEPTION 'unknown timezone: %', NEW.timezone;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clubs_timezone_check ON public.clubs;
CREATE TRIGGER clubs_timezone_check
    BEFORE INSERT OR UPDATE OF timezone ON public.clubs
    FOR EACH ROW EXECUTE FUNCTION public.clubs_timezone_guard();

-- No policy of its own: the admin-only UPDATE policy on `clubs` already governs
-- every column on the row, and the zone is club settings like the name and the
-- colour are. Everyone who can read the club reads it — the whole app needs it
-- to know when the night ends.
