-- Operator health dashboard: every club, in one row each.
--
-- Apply with:  npm run db:sql sql/operator-dashboard.sql
-- Then:        npm run db:dump && npm run db:types
--
-- Why a function and not a query from the app: RLS on `clubs` and `games` scopes
-- every read to the caller's own clubs, which is exactly right and exactly what
-- a cross-club view cannot do. SECURITY DEFINER lifts that, so the gate has to
-- be inside the body — and it is the WHERE clause, not an IF: a caller who is not
-- the operator gets zero rows, never an error that would confirm the function
-- does something interesting.
--
-- The gate reuses is_drill_admin(), the same hardcoded players.id = 1 seat that
-- curates the shared drill library. One operator, one seat. When that becomes a
-- role (B6 co-admins), both move together.
--
-- ponytail: "matches this week" is counted off games.created_at, because that is
-- the only timestamp games has. Once played_at lands (A5 in docs/marketing-plan.md)
-- these three counts and last_game_at should move to it — a match recorded on
-- Tuesday for a game played last month currently reads as activity this week.

CREATE OR REPLACE FUNCTION public.operator_clubs()
RETURNS TABLE (
  id integer,
  name text,
  slug text,
  is_public boolean,
  member_count integer,
  pending_count integer,
  games_total bigint,
  games_7d bigint,
  games_30d bigint,
  last_game_at timestamptz,
  created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT
    c.id,
    c.name,
    c.slug,
    c.is_public,
    c.member_count,
    (SELECT count(*) FROM players p
      WHERE p.club_id = c.id AND p.status = 'pending')::integer,
    (SELECT count(*) FROM games g WHERE g.club_id = c.id),
    (SELECT count(*) FROM games g
      WHERE g.club_id = c.id AND g.created_at >= now() - interval '7 days'),
    (SELECT count(*) FROM games g
      WHERE g.club_id = c.id AND g.created_at >= now() - interval '30 days'),
    (SELECT max(g.created_at) FROM games g WHERE g.club_id = c.id),
    c.created_at
  FROM clubs c
  WHERE public.is_drill_admin()
  ORDER BY c.created_at DESC;
$$;

ALTER FUNCTION public.operator_clubs() OWNER TO postgres;

-- Signed-in only. anon has no business holding a handle to a SECURITY DEFINER
-- function that reads every club, even one that would return nothing to it.
REVOKE ALL ON FUNCTION public.operator_clubs() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.operator_clubs() FROM anon;
GRANT EXECUTE ON FUNCTION public.operator_clubs() TO authenticated;
