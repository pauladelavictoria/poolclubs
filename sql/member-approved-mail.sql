-- The one way a member's email address leaves auth.users.
--
-- Apply with `npm run db:sql sql/member-approved-mail.sql`, then `npm run db:dump`
-- and `npm run db:types`. See sql/README.md.
--
-- Why this exists at all: approving somebody into a club should tell them, and
-- the only address they ever gave us is the one they signed up with, in
-- auth.users. No RLS policy can expose that to the admin doing the approving —
-- the recipient is by definition not the caller — and this app deliberately
-- holds no credential stronger than anon (see the note in
-- sql/push-notifications.sql). So, exactly as push_targets does, this restates
-- the authorisation by hand inside a SECURITY DEFINER function and hands back
-- the single row it is willing to answer for.
--
-- Read the conditions below as the whole security model. There is no policy
-- behind them; if they are wrong, any signed-in member can read an address.

BEGIN;

-- bigint, not integer: players.id is bigint, and a function that narrows the
-- key it is looked up by is a function that starts erroring the day the table
-- outgrows int4. The first cut of this took integer and could not be called
-- with players.id at all without a cast.
DROP FUNCTION IF EXISTS public.approved_member_contact(integer);

CREATE OR REPLACE FUNCTION public.approved_member_contact("p_player_id" bigint)
RETURNS TABLE ("email" text, "name" text, "club_name" text, "club_slug" text)
LANGUAGE "sql" STABLE SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
  SELECT u.email::text, pe.name, c.name, c.slug
  FROM players pl
  JOIN people pe ON pe.id = pl.person_id
  JOIN clubs  c  ON c.id  = pl.club_id
  JOIN auth.users u ON u.id = pe.user_id
  WHERE pl.id = p_player_id
    -- Only an admin of *this* player's club, which is the same test the UI
    -- gates the Approve button on. is_club_admin reads auth.uid() itself.
    AND public.is_club_admin(pl.club_id)
    -- Only once they are actually in. This is what pins the function to the
    -- moment the mail is legitimate: a pending request, or somebody who was
    -- rejected, returns nothing. It also means the caller cannot use this to
    -- enumerate addresses of people who never joined.
    AND pl.status = 'active'
    -- A claimed roster row that no human has ever signed into has no user and
    -- no address. Nothing to send, and the join would drop it anyway — spelled
    -- out so the intent is not mistaken for an oversight.
    AND pe.user_id IS NOT NULL
    -- The club's own tablet is a player row with no person behind it.
    AND pl.is_device = false;
$$;

ALTER FUNCTION public.approved_member_contact(bigint) OWNER TO postgres;

-- authenticated only. Deliberately nothing for anon: a visitor with no account
-- is never an admin of anything, and granting it would make the function's
-- own WHERE clause the only thing between a stranger and an address.
REVOKE ALL ON FUNCTION public.approved_member_contact(bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approved_member_contact(bigint) FROM anon;
GRANT EXECUTE ON FUNCTION public.approved_member_contact(bigint) TO authenticated;
GRANT ALL ON FUNCTION public.approved_member_contact(bigint) TO service_role;

COMMIT;
