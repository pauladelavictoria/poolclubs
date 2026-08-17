-- The public side of the site: /clubs, /players, /tournaments, /drills, readable
-- without an account.
--
-- Apply with `npm run db:sql sql/public-pages.sql`, then `npm run db:dump` and
-- `npm run db:types`. See sql/README.md.
--
-- Three things happen here, and the third is the one to read carefully.
--
-- 1. Two opt-out flags. Clubs and players are public by default and can hide
--    themselves. A hidden player stays out of the public roster but still counts
--    toward the club's member total, which is why clubs.member_count exists as a
--    column rather than a count(*) — anon cannot count rows it cannot read.
--
-- 2. Column-level grants for anon. RLS is row-level: a readable clubs row hands
--    over join_code, which is the credential for joining a club. So anon's table
--    SELECT is revoked and re-granted column by column. The consequence for the
--    app: `select("*")` on clubs, players or drills FAILS for anon with a
--    permission error rather than returning fewer columns, so every public query
--    must name its columns. src/queries/public.ts does.
--
-- 3. Eight policies dropped. Each was written with no `TO` clause and `USING
--    (true)`/`WITH CHECK (true)`, so it applied to anon and to every signed-in
--    user regardless of club. Postgres ORs permissive policies, so these
--    overrode every strict policy on the same table. "Anyone can read players"
--    is a hard blocker for the opt-out flag above; the other seven are the same
--    bug on the same tables. Every legitimate call site is covered by a strict
--    policy that already exists, with one gap that this file closes — see the
--    "Own row" policy near the bottom.

-- ---------------------------------------------------------------------------
-- 1. Visibility flags and the member count
-- ---------------------------------------------------------------------------

ALTER TABLE public.clubs ADD COLUMN is_public boolean NOT NULL DEFAULT true;
ALTER TABLE public.players ADD COLUMN is_public boolean NOT NULL DEFAULT true;
ALTER TABLE public.clubs ADD COLUMN member_count integer NOT NULL DEFAULT 0;

-- A recount rather than a delta: idempotent, so it cannot drift the way a
-- += / -= pair does when a row moves club and status in one statement.
CREATE OR REPLACE FUNCTION public.clubs_recount_members()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    ids integer[] := '{}';
    cid integer;
BEGIN
    -- Both sides, because an UPDATE can move a player between clubs. The TG_OP
    -- checks are statements rather than a CASE inside one expression: plpgsql
    -- raises on any reference to OLD during an INSERT, so the guard has to stop
    -- the reference being evaluated at all.
    IF TG_OP <> 'INSERT' THEN
        ids := ids || OLD.club_id;
    END IF;
    IF TG_OP <> 'DELETE' THEN
        ids := ids || NEW.club_id;
    END IF;

    FOR cid IN
        SELECT DISTINCT c FROM unnest(ids) AS c WHERE c IS NOT NULL
    LOOP
        UPDATE public.clubs
        SET member_count = (
            SELECT count(*) FROM public.players
            WHERE club_id = cid AND status = 'active'
        )
        WHERE id = cid;
    END LOOP;

    RETURN NULL;
END;
$$;

CREATE TRIGGER players_recount_members
    AFTER INSERT OR DELETE OR UPDATE OF status, club_id ON public.players
    FOR EACH ROW
    EXECUTE FUNCTION public.clubs_recount_members();

-- ---------------------------------------------------------------------------
-- 2. Helper
-- ---------------------------------------------------------------------------

-- SECURITY DEFINER so it can see clubs.is_public from inside a policy on
-- another table without that policy needing a readable clubs row. Same shape as
-- the existing is_club_member / is_club_admin. tournament_club() already exists
-- and is reused below rather than adding a second lookup.
CREATE OR REPLACE FUNCTION public.is_public_club(cid integer)
    RETURNS boolean
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
    SELECT EXISTS (SELECT 1 FROM clubs WHERE id = cid AND is_public);
$$;

GRANT ALL ON FUNCTION public.is_public_club(integer) TO anon;
GRANT ALL ON FUNCTION public.is_public_club(integer) TO authenticated;
GRANT ALL ON FUNCTION public.is_public_club(integer) TO service_role;

-- ---------------------------------------------------------------------------
-- 3. Column grants for anon
-- ---------------------------------------------------------------------------

-- clubs.join_code is withheld: it is the credential a stranger would need to
-- join. owner_id is withheld because it identifies an auth user.
REVOKE SELECT ON public.clubs FROM anon;
GRANT SELECT (
    id, name, slug, logo_url, theme_color, is_public, member_count, created_at,
    -- The venue's location, for the map on /clubs. Added by
    -- sql/club-location.sql; repeated here so re-running this file does not
    -- take it away again.
    address, city, country, lat, lon
) ON public.clubs TO anon;

-- players.user_id is withheld: it is the auth user's id. There is no created_at
-- on this table, so "newest" in the public directory sorts on id.
REVOKE SELECT ON public.players FROM anon;
GRANT SELECT (
    id, name, club_id, category, avatar_url, status, is_public
) ON public.players TO anon;

-- drills.created_by is withheld, same reason.
REVOKE SELECT ON public.drills FROM anon;
GRANT SELECT (
    id, name, description, difficulty, skill_type, setup_instructions,
    scoring_method, max_score, ball_positions, shot_paths, club_id, created_at
) ON public.drills TO anon;

-- games, tournaments, tournament_players and tournament_matches hold no column
-- worth withholding, so their grants are left alone and the policies below are
-- the whole of their protection.

-- ---------------------------------------------------------------------------
-- 4. Anon read policies
-- ---------------------------------------------------------------------------
-- All `TO anon`, so nothing a signed-in member sees changes.

CREATE POLICY "Public clubs are readable by anyone" ON public.clubs
    FOR SELECT TO anon
    USING (is_public);

CREATE POLICY "Public players of public clubs are readable by anyone" ON public.players
    FOR SELECT TO anon
    USING (is_public AND status = 'active' AND public.is_public_club(club_id));

CREATE POLICY "Games of public clubs are readable by anyone" ON public.games
    FOR SELECT TO anon
    USING (public.is_public_club(club_id));

CREATE POLICY "Tournaments of public clubs are readable by anyone" ON public.tournaments
    FOR SELECT TO anon
    USING (public.is_public_club(club_id));

CREATE POLICY "Entrants of public tournaments are readable by anyone" ON public.tournament_players
    FOR SELECT TO anon
    USING (public.is_public_club(public.tournament_club(tournament_id)));

CREATE POLICY "Matches of public tournaments are readable by anyone" ON public.tournament_matches
    FOR SELECT TO anon
    USING (public.is_public_club(public.tournament_club(tournament_id)));

-- The seeded catalog only. A club's own drills stay behind membership, which is
-- what the existing `TO authenticated` policy already says.
CREATE POLICY "The shared drill catalog is readable by anyone" ON public.drills
    FOR SELECT TO anon
    USING (club_id IS NULL);

-- Deliberately left with no anon policy, so they stay invisible: comments,
-- reactions, challenges, drill_logs, training_plans, training_plan_steps.

-- ---------------------------------------------------------------------------
-- 5. Dropping the eight loose policies
-- ---------------------------------------------------------------------------

-- Made players.is_public meaningless and exposed every player of every club,
-- user_id included. "Members can view club players" covers the app: it is
-- is_club_member(club_id) OR user_id = auth.uid(), and the second half is what a
-- user with a pending membership needs to see their own row.
DROP POLICY "Anyone can read players" ON public.players;

-- Let any signed-in user rename or recategorise any player in any club.
-- "Members can update club players" covers the roster editor.
DROP POLICY "Any authenticated user can update players" ON public.players;

-- Let any signed-in user add or delete players in any club. "Admin can add
-- players" / "Admin can remove players" cover ClubPage, which is admin-only;
-- join_club() and create_club() are SECURITY DEFINER and unaffected.
DROP POLICY "Enable insert for authenticated users only" ON public.players;
DROP POLICY "Enable delete for authenticated users only" ON public.players;

-- Let anyone, signed in or not, insert a game into any club. "Members can add
-- club games" covers useAddGame, which stamps the caller's own club_id.
DROP POLICY "Anyone can add games" ON public.games;

-- All three were world-readable. can_touch_player / can_touch_plan resolve
-- through the player's club, which covers every reader in the app. Two reads get
-- narrower and better for it: ActivityFeed's `limit` is no longer spent on other
-- clubs' rows, and a drill page stops listing strangers' scores.
DROP POLICY "Drill logs are viewable by everyone" ON public.drill_logs;
DROP POLICY "Training plans are viewable by everyone" ON public.training_plans;
DROP POLICY "Training plan steps are viewable by everyone" ON public.training_plan_steps;

-- The one gap the drops open. is_club_member() requires status = 'active', so
-- without this a pending member could not edit their own row — which is
-- PlayerSettingsPage, and the OAuth-avatar backfill in getSession(). Narrower
-- than what it replaces: your own row, not everybody's.
--
-- The predicate is written out rather than calling is_own_player(id): that
-- function takes an integer and players.id is a bigint, so the call does not
-- resolve. Inline is the better answer anyway — the row being tested is a
-- players row, so it already carries the user_id the function would go and look
-- up, and this needs no SECURITY DEFINER hop to read it.
CREATE POLICY "Own row can be updated" ON public.players
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 6. Backfill
-- ---------------------------------------------------------------------------

UPDATE public.clubs c
SET member_count = (
    SELECT count(*) FROM public.players
    WHERE club_id = c.id AND status = 'active'
);

-- ponytail: no index for the public search. Every public list filters with
-- `name ilike '%q%'`, which cannot use a btree index and seq-scans instead — at
-- current row counts that is faster than the planning it would save. When it
-- stops being: `CREATE EXTENSION pg_trgm` and a GIN trgm index on clubs.name,
-- players.name, tournaments.name and drills.name.

-- ---------------------------------------------------------------------------
-- 7. Superseded by sql/people.sql
-- ---------------------------------------------------------------------------
--
-- This file is kept as the record of how the public side came to be, but three
-- of its decisions have since moved. Apply order is this file, then people.sql.
--
--   * The column grants in section 3 name players.name, players.avatar_url and
--     players.is_public. All three moved to the new `people` table, and their
--     grants went with the columns. people.sql grants the same list on people
--     and adds players.person_id, which is what PostgREST needs to embed one
--     from the other.
--
--   * "Public players of public clubs are readable by anyone" and "Own row can
--     be updated" both read players.user_id, which is now people.user_id.
--     people.sql drops and recreates both.
--
--   * The `is_public` opt-out is now a fact about a person rather than about one
--     membership: opting out hides you from the directory everywhere, not in one
--     club while another still lists you. The backfill takes the strict reading
--     (opted out anywhere means opted out) rather than re-listing anybody.
--
-- The ponytail note above still holds, and now applies to people.name — that is
-- the only column the public player search touches.
