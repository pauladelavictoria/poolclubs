-- Web push: the subscriptions table, and the recipient lookup that feeds it.
--
-- Apply with `npm run db:sql sql/push-notifications.sql`, then `npm run db:dump`
-- and `npm run db:types`. See sql/README.md.
--
-- Why an RPC and not a service-role key: sending a push means reading somebody
-- else's endpoint, which no RLS policy can allow — the recipient is by
-- definition not the caller. The alternative was a SUPABASE_SERVICE_ROLE_KEY in
-- the server's environment, one credential that bypasses every policy in this
-- schema, for this. push_targets restates the authorisation by hand instead, the
-- way finish_live_match does, and the app carries on having no key stronger than
-- anon (see the comment in src/libs/auth.functions.ts).

BEGIN;

-- One row per browser installation. `endpoint` is the primary key because that
-- is exactly what it identifies, and it is what the push service hands back —
-- so re-subscribing, or a rotated endpoint, is one upsert rather than a lookup.
--
-- endpoint / p256dh / auth are named after PushSubscription.toJSON(), so the
-- client writes what the browser gave it with no mapping step in between.
--
-- person_id, not player_id: one human with a phone who belongs to three clubs
-- has one device, not three.
--
-- `lang` is here because the recipient's language lives in a cookie on their own
-- device (LANG_COOKIE, src/libs/prefs.ts) and the server doing the sending is
-- holding the *sender's* request. Recorded at subscribe time and refreshed
-- whenever they open the app.
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    endpoint   text PRIMARY KEY,
    person_id  bigint NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
    p256dh     text NOT NULL,
    auth       text NOT NULL,
    lang       text NOT NULL DEFAULT 'es',
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT push_subscriptions_endpoint_check
        CHECK ((char_length(endpoint) >= 20) AND (char_length(endpoint) <= 500)),
    CONSTRAINT push_subscriptions_lang_check
        CHECK (lang = ANY (ARRAY['es'::text, 'en'::text, 'fr'::text]))
);

-- Every read is "this person's devices".
CREATE INDEX IF NOT EXISTS push_subscriptions_person_idx
    ON public.push_subscriptions USING btree (person_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.push_subscriptions TO authenticated;
GRANT ALL ON TABLE public.push_subscriptions TO service_role;
-- Deliberately nothing for anon: a visitor with no account has no person.

-- The person-level sibling of is_own_player. The people policies have been
-- spelling this out as an inline subquery; a push policy needs it four times.
CREATE OR REPLACE FUNCTION public.is_own_person("pid" bigint) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM people pe WHERE pe.id = pid AND pe.user_id = auth.uid()
  );
$$;

ALTER FUNCTION public.is_own_person(bigint) OWNER TO postgres;
GRANT ALL ON FUNCTION public.is_own_person(bigint) TO authenticated;
GRANT ALL ON FUNCTION public.is_own_person(bigint) TO service_role;

-- Your own devices and nothing else. Reading somebody else's row is what
-- push_targets is for, and it is the only way to do it.
CREATE POLICY "Own subscriptions are readable" ON public.push_subscriptions
    FOR SELECT TO authenticated USING (public.is_own_person(person_id));

CREATE POLICY "Own subscriptions can be added" ON public.push_subscriptions
    FOR INSERT TO authenticated WITH CHECK (public.is_own_person(person_id));

CREATE POLICY "Own subscriptions can be updated" ON public.push_subscriptions
    FOR UPDATE TO authenticated USING (public.is_own_person(person_id))
    WITH CHECK (public.is_own_person(person_id));

CREATE POLICY "Own subscriptions can be removed" ON public.push_subscriptions
    FOR DELETE TO authenticated USING (public.is_own_person(person_id));


-- Who may be told about this event, and in what language.
--
-- SECURITY DEFINER, so RLS is off inside — which is why every caller check is
-- restated here by hand, out of the same helpers the table policies use. An
-- unauthorised or stale call returns *no rows* rather than raising: the caller
-- must not be able to tell "you may not ask that" from "nobody is subscribed".
--
-- Recipients mirror the in-app bell exactly (src/hooks/useNotifications.tsx): a
-- pending challenge goes to the challenged player, an answer goes back to the
-- challenger, and a tournament open for entries goes to every active member of
-- the club whose category matches — NULL category meaning everybody — except
-- the admin who just created it, who does not need telling.
--
-- Devices are excluded throughout. The tablet bolted to the rail is a players
-- row like any other, and it must not buzz at nobody.
CREATE OR REPLACE FUNCTION public.push_targets("p_kind" text, "p_ref" integer)
RETURNS TABLE(endpoint text, p256dh text, auth text, lang text)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  c challenges;
  t tournaments;
BEGIN
  IF p_kind = 'challengeSent' THEN
    SELECT * INTO c FROM challenges ch WHERE ch.id = p_ref;
    IF c.id IS NULL OR c.status <> 'pending'
       OR NOT is_own_player(c.from_player_id) THEN
      RETURN;
    END IF;

    RETURN QUERY
      SELECT s.endpoint, s.p256dh, s.auth, s.lang
      FROM players p
      JOIN push_subscriptions s ON s.person_id = p.person_id
      WHERE p.id = c.to_player_id AND NOT p.is_device;

  ELSIF p_kind = 'challengeAnswered' THEN
    SELECT * INTO c FROM challenges ch WHERE ch.id = p_ref;
    -- The answer is the challenged player's to give. Either side may write the
    -- row under RLS, but only that direction is news to anybody.
    IF c.id IS NULL OR c.status NOT IN ('accepted', 'declined')
       OR NOT is_own_player(c.to_player_id) THEN
      RETURN;
    END IF;

    RETURN QUERY
      SELECT s.endpoint, s.p256dh, s.auth, s.lang
      FROM players p
      JOIN push_subscriptions s ON s.person_id = p.person_id
      WHERE p.id = c.from_player_id AND NOT p.is_device;

  ELSIF p_kind = 'tournamentOpen' THEN
    SELECT * INTO t FROM tournaments tr WHERE tr.id = p_ref;
    -- 'open' is the row's birth default, so this is also "was just created".
    IF t.id IS NULL OR t.status <> 'open' OR NOT is_club_admin(t.club_id) THEN
      RETURN;
    END IF;

    RETURN QUERY
      SELECT s.endpoint, s.p256dh, s.auth, s.lang
      FROM players p
      JOIN people pe ON pe.id = p.person_id
      JOIN push_subscriptions s ON s.person_id = p.person_id
      WHERE p.club_id = t.club_id
        AND p.status = 'active'
        AND NOT p.is_device
        AND (t.category IS NULL OR p.category = t.category)
        AND pe.user_id IS DISTINCT FROM auth.uid();
  END IF;
END;
$$;

ALTER FUNCTION public.push_targets(text, integer) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.push_targets(text, integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.push_targets(text, integer) TO authenticated;
GRANT ALL ON FUNCTION public.push_targets(text, integer) TO service_role;


-- Endpoints the push service answered 404 or 410 for: that subscription is gone
-- for good and the row is dead weight. Deleting one has to reach past RLS for
-- the same reason reading it did.
--
-- The trade-off, stated plainly: a member holding your endpoint — which they
-- only get by legitimately challenging you — could call this and silence one
-- nudge. It costs them a round trip and costs you nothing permanent, because
-- usePushNotifications re-upserts the row the next time you open the app. The
-- alternative was the service-role key this whole file exists to avoid.
CREATE OR REPLACE FUNCTION public.push_prune("p_endpoints" text[]) RETURNS void
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  DELETE FROM push_subscriptions WHERE endpoint = ANY (p_endpoints);
$$;

ALTER FUNCTION public.push_prune(text[]) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.push_prune(text[]) FROM PUBLIC;
GRANT ALL ON FUNCTION public.push_prune(text[]) TO authenticated;
GRANT ALL ON FUNCTION public.push_prune(text[]) TO service_role;

COMMIT;
