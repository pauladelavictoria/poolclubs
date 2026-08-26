-- Pairing a tablet to a club.
--
-- Apply with `npm run db:sql sql/device-pairing.sql`, then
-- `npm run db:dump && npm run db:types`.
--
-- The tablet on the rail needs an account, because RLS is the only boundary and
-- an account is what RLS knows how to check. What it must not need is a human's
-- account: a device left on a bar is signed in to whatever it holds, and if
-- that is a person then anyone who picks it up is them.
--
-- So: the owner generates a short code *for one table*, the tablet signs in
-- anonymously and redeems it, and what it gets is a member of the club that
-- exists only to keep score — already bolted to that table. No email to invent,
-- no password to share, nothing on the device that belongs to anybody, and no
-- second step where somebody has to remember to pin it.
--
-- Re-runnable: it drops the codes in flight, which last ten minutes anyway.

-- ---------------------------------------------------------------------------
-- Which table a tablet belongs to
-- ---------------------------------------------------------------------------

-- A device is paired to a table, so the club's list of tables is where it
-- should be shown and taken back — not a separate list of devices that makes
-- the owner match names up by hand. Nulled rather than cascaded when a table
-- goes: the tablet is still a real device and still signed in.
ALTER TABLE public.players
    ADD COLUMN IF NOT EXISTS device_table_id integer
        REFERENCES public.club_tables(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS players_device_table_idx
    ON public.players (device_table_id) WHERE device_table_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- The code
-- ---------------------------------------------------------------------------

-- Its own table rather than a column on `clubs`: members can read their club's
-- row, and a code sitting in a column they can read is a code any member can
-- use to make a device. Here the whole table is admin-only and claim_device
-- reaches it as SECURITY DEFINER.
CREATE TABLE IF NOT EXISTS public.club_device_codes (
    code       text PRIMARY KEY,
    club_id    integer NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    -- Minutes, not days. The code is read off one screen and typed into another
    -- in the same minute; anything longer is a standing invitation to become
    -- this club's device.
    expires_at timestamptz NOT NULL
);

-- A code is for one table, so redeeming it is what pins the tablet. Pairing and
-- pinning were two steps and the second one was invisible: a freshly paired
-- tablet sat on the club's home page with nothing saying what was left to do.
DELETE FROM public.club_device_codes;
ALTER TABLE public.club_device_codes
    ADD COLUMN IF NOT EXISTS table_id integer
        REFERENCES public.club_tables(id) ON DELETE CASCADE;
ALTER TABLE public.club_device_codes ALTER COLUMN table_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS club_device_codes_club_idx
    ON public.club_device_codes (club_id);

ALTER TABLE public.club_device_codes ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.club_device_codes TO anon, authenticated, service_role;

-- No SELECT for anyone but the owner, and no policy at all for anon: a code is
-- only ever read by the screen that generated it.
DROP POLICY IF EXISTS "Admin can manage device codes" ON public.club_device_codes;
CREATE POLICY "Admin can manage device codes" ON public.club_device_codes
    FOR ALL TO authenticated
    USING (is_club_admin(club_id)) WITH CHECK (is_club_admin(club_id));

-- ---------------------------------------------------------------------------
-- Generating one
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.start_device_pairing(integer);

CREATE OR REPLACE FUNCTION public.start_device_pairing(cid integer, tid integer)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public' AS $$
DECLARE
  -- No O/0, no I/1/L. This gets read off a phone and typed into a tablet by
  -- somebody standing up, and those are the characters that get typed wrong.
  alphabet CONSTANT text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  new_code text := '';
  i integer;
BEGIN
  IF NOT is_club_admin(cid) THEN
    RAISE EXCEPTION 'only the club owner may pair a device';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM club_tables WHERE id = tid AND club_id = cid) THEN
    RAISE EXCEPTION 'that table belongs to another club';
  END IF;

  -- One live code per table, not per club: a club fitting out six tables in an
  -- afternoon wants six codes at once, and a code is only good for the tablet
  -- standing at its own table anyway.
  DELETE FROM club_device_codes WHERE table_id = tid;

  FOR i IN 1..6 LOOP
    new_code := new_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  END LOOP;

  -- Expired codes anywhere are dead weight; this is the only moment anything
  -- writes this table, so it is the only place they need sweeping.
  DELETE FROM club_device_codes WHERE expires_at < now();

  INSERT INTO club_device_codes (code, club_id, table_id, expires_at)
  VALUES (new_code, cid, tid, now() + interval '10 minutes');

  RETURN new_code;
END $$;

REVOKE ALL ON FUNCTION public.start_device_pairing(integer, integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.start_device_pairing(integer, integer) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Redeeming one
-- ---------------------------------------------------------------------------

-- Called by a freshly signed-in anonymous user: it has an auth.uid() and
-- nothing else. What it gets is a person nobody can be confused for and an
-- active membership flagged as the device.
DROP FUNCTION IF EXISTS public.claim_device(text);

-- Called by a freshly signed-in anonymous user: it has an auth.uid() and
-- nothing else. What it gets is a person nobody can be confused for, an active
-- membership flagged as the device, and the table it is standing at — which the
-- browser turns straight into a pinned kiosk.
CREATE OR REPLACE FUNCTION public.claim_device(p_code text)
RETURNS TABLE (club_slug text, table_id integer)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public' AS $$
DECLARE
  cid integer;
  tid integer;
  table_label text;
  pid bigint;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'a device has to be signed in before it can be paired';
  END IF;

  -- FOR UPDATE, so two tablets typing the same code in the same second cannot
  -- both consume it.
  SELECT c.club_id, c.table_id INTO cid, tid
  FROM club_device_codes c
  WHERE c.code = upper(btrim(p_code)) AND c.expires_at > now()
  FOR UPDATE;

  IF cid IS NULL THEN
    RAISE EXCEPTION 'that code is not valid any more';
  END IF;

  -- Already paired, to this club or another: one device, one membership.
  IF EXISTS (
    SELECT 1 FROM players p JOIN people pe ON pe.id = p.person_id
    WHERE pe.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'this device is already paired';
  END IF;

  SELECT label INTO table_label FROM club_tables WHERE id = tid;

  -- Named after its table, so the owner's list of devices reads as the room.
  -- is_public false and a name that is furniture rather than a person: it is
  -- filtered out of the roster and both rankings by the client, and anywhere it
  -- does surface it should be obvious that it is not somebody.
  INSERT INTO people (name, user_id, is_public)
  VALUES (table_label || ' · tablet', auth.uid(), false)
  RETURNING id INTO pid;

  INSERT INTO players (club_id, person_id, status, is_device, device_table_id)
  VALUES (cid, pid, 'active', true, tid);

  -- One shot. The tablet keeps its session; the code is spent.
  DELETE FROM club_device_codes WHERE code = upper(btrim(p_code));

  RETURN QUERY SELECT c.slug, tid FROM clubs c WHERE c.id = cid;
END $$;

REVOKE ALL ON FUNCTION public.claim_device(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.claim_device(text) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- The same hole as is_device
-- ---------------------------------------------------------------------------

-- "Members can update club players" would let anyone move a device onto another
-- table. It is set by claim_device and changed by nobody else, so the guard says
-- so — the clause sits beside the is_device one it belongs with.
CREATE OR REPLACE FUNCTION public.players_guard_membership() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;

  IF NEW.club_id IS DISTINCT FROM OLD.club_id AND NOT is_club_admin(OLD.club_id) THEN
    RAISE EXCEPTION 'only the club owner may move a player between clubs';
  END IF;

  IF NEW.person_id IS DISTINCT FROM OLD.person_id THEN
    RAISE EXCEPTION 'a membership cannot be reassigned to another person';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     AND NOT is_club_admin(OLD.club_id)
     AND NOT (
       NEW.status = 'pending'
       AND EXISTS (SELECT 1 FROM people WHERE id = NEW.person_id AND user_id = auth.uid())
     ) THEN
    RAISE EXCEPTION 'only the club owner may change a member''s status';
  END IF;

  IF (NEW.is_device, NEW.device_table_id) IS DISTINCT FROM (OLD.is_device, OLD.device_table_id)
     AND NOT is_club_admin(OLD.club_id) THEN
    RAISE EXCEPTION 'only the club owner may designate a device account';
  END IF;

  IF (NEW.present_since, NEW.queued_table_id, NEW.queued_at)
     IS DISTINCT FROM (OLD.present_since, OLD.queued_table_id, OLD.queued_at)
     AND NOT (is_own_player(NEW.id::integer)
              OR is_club_admin(OLD.club_id)
              OR is_club_device(OLD.club_id)) THEN
    RAISE EXCEPTION 'you can only check yourself in';
  END IF;

  RETURN NEW;
END $$;
