


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."BallColor" AS ENUM (
    'yellow',
    'blue',
    'red',
    'purple',
    'orange',
    'green',
    'maroon',
    'black'
);


ALTER TYPE "public"."BallColor" OWNER TO "postgres";


CREATE TYPE "public"."Discipline" AS ENUM (
    '8ball',
    '9ball',
    '10ball'
);


ALTER TYPE "public"."Discipline" OWNER TO "postgres";


CREATE TYPE "public"."GameMode" AS ENUM (
    'single',
    'doubles'
);


ALTER TYPE "public"."GameMode" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_guest_player"("cid" integer, "pname" "text", "cat" double precision DEFAULT 3) RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  pid BIGINT;
  new_player BIGINT;
BEGIN
  IF NOT is_club_admin(cid) THEN
    RAISE EXCEPTION 'only the club owner may add players';
  END IF;
  IF btrim(COALESCE(pname, '')) = '' THEN
    RAISE EXCEPTION 'a player needs a name';
  END IF;

  -- Deliberately always a new person. Matching a guest onto an existing person
  -- by name is exactly the guess this file's backfill only made because it had
  -- no alternative; going forward, claiming is how two rows become one human.
  INSERT INTO people (name) VALUES (btrim(pname)) RETURNING id INTO pid;

  INSERT INTO players (club_id, person_id, category, status)
  VALUES (cid, pid, cat, 'active')
  RETURNING id INTO new_player;

  RETURN new_player;
END $$;


ALTER FUNCTION "public"."add_guest_player"("cid" integer, "pname" "text", "cat" double precision) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_touch_plan"("pid" integer) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM training_plans tp
    WHERE tp.id = pid AND can_touch_player(tp.player_id)
  );
$$;


ALTER FUNCTION "public"."can_touch_plan"("pid" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_touch_player"("pid" integer) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM players p WHERE p.id = pid AND is_club_member(p.club_id)
  );
$$;


ALTER FUNCTION "public"."can_touch_player"("pid" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."club_preview"("code" "text") RETURNS TABLE("club_id" integer, "club_name" "text", "player_id" integer, "player_name" "text", "claimable" boolean)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT c.id, c.name, p.id, pe.name, pe.user_id IS NULL
  FROM clubs c
  LEFT JOIN players p ON p.club_id = c.id
  LEFT JOIN people pe ON pe.id = p.person_id
  WHERE c.join_code = lower(btrim(code))
  ORDER BY pe.name;
$$;


ALTER FUNCTION "public"."club_preview"("code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."club_slug_reserved"() RETURNS "text"[]
    LANGUAGE "sql" IMMUTABLE PARALLEL SAFE
    AS $$
    SELECT ARRAY['login', 'logout', 'join', 'clubs', 'me', 'auth', 'api']
$$;


ALTER FUNCTION "public"."club_slug_reserved"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."clubs_recount_members"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."clubs_recount_members"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."clubs_set_slug"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    base text;
BEGIN
    IF NEW.slug IS NOT NULL AND NEW.slug <> '' THEN
        RETURN NEW;
    END IF;

    base := public.slugify(NEW.name);

    IF base = ANY (public.club_slug_reserved())
        OR EXISTS (SELECT 1 FROM public.clubs WHERE slug = base AND id <> NEW.id)
    THEN
        NEW.slug := base || '-' || NEW.id;
    ELSE
        NEW.slug := base;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."clubs_set_slug"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_club"("club_name" "text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  cid INTEGER;
  uid UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'sign in first'; END IF;

  INSERT INTO clubs (name, owner_id) VALUES (btrim(club_name), uid) RETURNING id INTO cid;

  INSERT INTO players (club_id, user_id, name, category, status)
  VALUES (
    cid, uid,
    COALESCE(NULLIF(btrim(auth.jwt() -> 'user_metadata' ->> 'full_name'), ''), 'Player'),
    3, 'active'
  );

  RETURN cid;
END $$;


ALTER FUNCTION "public"."create_club"("club_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_club_admin"("cid" integer) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (SELECT 1 FROM clubs WHERE id = cid AND owner_id = auth.uid());
$$;


ALTER FUNCTION "public"."is_club_admin"("cid" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_club_member"("cid" integer) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM players p
    JOIN people pe ON pe.id = p.person_id
    WHERE p.club_id = cid AND pe.user_id = auth.uid() AND p.status = 'active'
  );
$$;


ALTER FUNCTION "public"."is_club_member"("cid" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_drill_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM players p
    JOIN people pe ON pe.id = p.person_id
    WHERE p.id = 1 AND pe.user_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."is_drill_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_own_player"("pid" integer) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM players p
    JOIN people pe ON pe.id = p.person_id
    WHERE p.id = pid AND pe.user_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."is_own_player"("pid" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_public_club"("cid" integer) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT EXISTS (SELECT 1 FROM clubs WHERE id = cid AND is_public);
$$;


ALTER FUNCTION "public"."is_public_club"("cid" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."join_club"("code" "text", "claim_player_id" integer DEFAULT NULL::integer, "display_name" "text" DEFAULT NULL::"text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  cid INTEGER;
  uid UUID := auth.uid();
  me BIGINT;
  claimed BIGINT;
  pname TEXT;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'sign in first'; END IF;

  SELECT id INTO cid FROM clubs WHERE join_code = lower(btrim(code));
  IF cid IS NULL THEN RAISE EXCEPTION 'unknown join code'; END IF;

  SELECT id INTO me FROM people WHERE user_id = uid;

  -- Already a member of this club, under whichever person is yours.
  IF me IS NOT NULL AND EXISTS (
    SELECT 1 FROM players WHERE club_id = cid AND person_id = me
  ) THEN
    RETURN cid;
  END IF;

  IF claim_player_id IS NOT NULL AND me IS NULL THEN
    UPDATE people pe
    SET user_id = uid
    FROM players p
    WHERE p.id = claim_player_id
      AND p.club_id = cid
      AND pe.id = p.person_id
      AND pe.user_id IS NULL
    RETURNING pe.id INTO claimed;

    IF claimed IS NOT NULL THEN
      UPDATE players SET status = 'pending' WHERE person_id = claimed;
      RETURN cid;
    END IF;
    -- Claimed between the preview and now, or you already had a person: fall
    -- through and join as somebody new.
  END IF;

  IF me IS NULL THEN
    pname := COALESCE(
      NULLIF(btrim(display_name), ''),
      NULLIF(btrim(auth.jwt() -> 'user_metadata' ->> 'full_name'), ''),
      'Player'
    );
    INSERT INTO people (name, user_id) VALUES (pname, uid) RETURNING id INTO me;
  END IF;

  INSERT INTO players (club_id, person_id, category, status)
  VALUES (cid, me, 3, 'pending');

  RETURN cid;
END $$;


ALTER FUNCTION "public"."join_club"("code" "text", "claim_player_id" integer, "display_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."people_drop_orphan"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  DELETE FROM people
  WHERE id = OLD.person_id
    AND user_id IS NULL
    AND NOT EXISTS (SELECT 1 FROM players WHERE person_id = OLD.person_id);
  RETURN NULL;
END $$;


ALTER FUNCTION "public"."people_drop_orphan"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."people_guard_user_id"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- No auth.uid() means service_role or the SQL editor: your own maintenance,
  -- including unlinking a person, still works.
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;

  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    IF OLD.user_id IS NOT NULL OR NEW.user_id <> auth.uid() THEN
      RAISE EXCEPTION
        'people.user_id may only be set to your own id, and only on an unlinked person';
    END IF;
  END IF;

  -- The URL is written once and then never again, exactly as a club's is.
  NEW.slug := OLD.slug;

  RETURN NEW;
END $$;


ALTER FUNCTION "public"."people_guard_user_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."people_set_slug"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    base text;
BEGIN
    IF NEW.slug IS NOT NULL AND NEW.slug <> '' THEN
        RETURN NEW;
    END IF;

    base := public.slugify(NEW.name);

    IF EXISTS (SELECT 1 FROM public.people WHERE slug = base AND id <> NEW.id) THEN
        NEW.slug := base || '-' || NEW.id;
    ELSE
        NEW.slug := base;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."people_set_slug"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."person_in_public_club"("pid" bigint) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM players p
    WHERE p.person_id = pid AND p.status = 'active' AND is_public_club(p.club_id)
  );
$$;


ALTER FUNCTION "public"."person_in_public_club"("pid" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."person_is_admins_guest"("pid" bigint) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM players p WHERE p.person_id = pid AND is_club_admin(p.club_id)
  );
$$;


ALTER FUNCTION "public"."person_is_admins_guest"("pid" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."person_shares_club"("pid" bigint) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM players p WHERE p.person_id = pid AND is_club_member(p.club_id)
  );
$$;


ALTER FUNCTION "public"."person_shares_club"("pid" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."players_guard_membership"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;

  IF NEW.club_id IS DISTINCT FROM OLD.club_id AND NOT is_club_admin(OLD.club_id) THEN
    RAISE EXCEPTION 'only the club owner may move a player between clubs';
  END IF;

  -- A membership never changes hands. Without this, "Members can update club
  -- players" — which exists so the roster editor can set a division — would also
  -- let a member point somebody else's membership at their own person.
  IF NEW.person_id IS DISTINCT FROM OLD.person_id THEN
    RAISE EXCEPTION 'a membership cannot be reassigned to another person';
  END IF;

  -- The one status change that is not the owner's: claiming an unclaimed person
  -- drops their memberships to 'pending'. join_club() relies on this.
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NOT is_club_admin(OLD.club_id)
     AND NOT (
       NEW.status = 'pending'
       AND EXISTS (SELECT 1 FROM people WHERE id = NEW.person_id AND user_id = auth.uid())
     ) THEN
    RAISE EXCEPTION 'only the club owner may change a member''s status';
  END IF;

  RETURN NEW;
END $$;


ALTER FUNCTION "public"."players_guard_membership"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."slugify"("txt" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE PARALLEL SAFE
    AS $$
    SELECT COALESCE(NULLIF(
        trim(BOTH '-' FROM
            regexp_replace(
                -- Apostrophes vanish rather than separating, so "Paula's Pool"
                -- is paulas-pool and not paula-s-pool.
                regexp_replace(
                    translate(
                        replace(lower(txt), 'ß', 'ss'),
                        'àáäâãåāèéëêēìíïîīòóöôõøōùúüûūñçÿýž',
                        'aaaaaaaeeeeeiiiiiooooooouuuuuncyyz'
                    ),
                    '[''’]', '', 'g'
                ),
                '[^a-z0-9]+', '-', 'g'
            )
        ), ''),
        -- A name of nothing but punctuation still needs a slug, and the CHECK
        -- below requires it to start with an alphanumeric.
        'club')
$$;


ALTER FUNCTION "public"."slugify"("txt" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tournament_club"("tid" integer) RETURNS integer
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT club_id FROM tournaments WHERE id = tid;
$$;


ALTER FUNCTION "public"."tournament_club"("tid" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tournament_match_guard"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF public.is_club_admin(public.tournament_club(NEW.tournament_id)) THEN
    RETURN NEW;
  END IF;

  IF ROW(NEW.id, NEW.tournament_id, NEW.bracket, NEW.round, NEW.slot,
         NEW.group_no, NEW.p1_id, NEW.p2_id,
         NEW.winner_to, NEW.winner_to_slot, NEW.loser_to, NEW.loser_to_slot)
     IS DISTINCT FROM
     ROW(OLD.id, OLD.tournament_id, OLD.bracket, OLD.round, OLD.slot,
         OLD.group_no, OLD.p1_id, OLD.p2_id,
         OLD.winner_to, OLD.winner_to_slot, OLD.loser_to, OLD.loser_to_slot)
  THEN
    RAISE EXCEPTION
      'only the club owner can change a match; members may set game_id and winner_id';
  END IF;

  -- p1_id and p2_id are only stored for the seats known at generation, so the
  -- column CHECK above says nothing about a semi-final. This is the part that
  -- still holds there: whoever goes through has to be in the tournament.
  IF NEW.winner_id IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM tournament_players
       WHERE tournament_id = NEW.tournament_id AND player_id = NEW.winner_id
     )
  THEN
    RAISE EXCEPTION 'the winner must be an entrant in this tournament';
  END IF;

  RETURN NEW;
END $$;


ALTER FUNCTION "public"."tournament_match_guard"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."challenges" (
    "id" integer NOT NULL,
    "club_id" integer NOT NULL,
    "from_player_id" integer NOT NULL,
    "to_player_id" integer NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "message" "text",
    "game_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "challenges_check" CHECK (("from_player_id" <> "to_player_id")),
    CONSTRAINT "challenges_message_check" CHECK (("char_length"("message") <= 500)),
    CONSTRAINT "challenges_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'declined'::"text", 'played'::"text"])))
);


ALTER TABLE "public"."challenges" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."challenges_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."challenges_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."challenges_id_seq" OWNED BY "public"."challenges"."id";



CREATE TABLE IF NOT EXISTS "public"."clubs" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL,
    "join_code" "text" DEFAULT "encode"("extensions"."gen_random_bytes"(6), 'hex'::"text") NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "logo_url" "text",
    "theme_color" "public"."BallColor" DEFAULT 'yellow'::"public"."BallColor" NOT NULL,
    "slug" "text" NOT NULL,
    "is_public" boolean DEFAULT true NOT NULL,
    "member_count" integer DEFAULT 0 NOT NULL,
    "address" "text",
    "city" "text",
    "country" "text",
    "lat" double precision,
    "lon" double precision,
    CONSTRAINT "clubs_country_shape" CHECK ((("country" IS NULL) OR ("country" ~ '^[A-Z]{2}$'::"text"))),
    CONSTRAINT "clubs_latlon_pair" CHECK (((("lat" IS NULL) = ("lon" IS NULL)) AND (("lat" IS NULL) OR ((("lat" >= ('-90'::integer)::double precision) AND ("lat" <= (90)::double precision)) AND (("lon" >= ('-180'::integer)::double precision) AND ("lon" <= (180)::double precision)))))),
    CONSTRAINT "clubs_name_check" CHECK ((("char_length"("btrim"("name")) >= 1) AND ("char_length"("btrim"("name")) <= 60))),
    CONSTRAINT "clubs_slug_shape" CHECK ((("slug" ~ '^[a-z0-9][a-z0-9-]*$'::"text") AND (NOT ("slug" = ANY ("public"."club_slug_reserved"())))))
);


ALTER TABLE "public"."clubs" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."clubs_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."clubs_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."clubs_id_seq" OWNED BY "public"."clubs"."id";



CREATE TABLE IF NOT EXISTS "public"."comments" (
    "id" integer NOT NULL,
    "club_id" integer NOT NULL,
    "author_player_id" integer NOT NULL,
    "game_id" "uuid",
    "drill_log_id" integer,
    "body" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "comments_body_check" CHECK ((("char_length"("btrim"("body")) >= 1) AND ("char_length"("btrim"("body")) <= 1000))),
    CONSTRAINT "comments_check" CHECK (("num_nonnulls"("game_id", "drill_log_id") = 1))
);


ALTER TABLE "public"."comments" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."comments_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."comments_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."comments_id_seq" OWNED BY "public"."comments"."id";



CREATE TABLE IF NOT EXISTS "public"."drill_logs" (
    "id" integer NOT NULL,
    "drill_id" integer NOT NULL,
    "player_id" integer NOT NULL,
    "score" integer NOT NULL,
    "max_score" integer NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."drill_logs" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."drill_logs_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."drill_logs_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."drill_logs_id_seq" OWNED BY "public"."drill_logs"."id";



CREATE TABLE IF NOT EXISTS "public"."drills" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" NOT NULL,
    "difficulty" "text" NOT NULL,
    "skill_type" "text" NOT NULL,
    "setup_instructions" "text" NOT NULL,
    "scoring_method" "text" NOT NULL,
    "max_score" integer NOT NULL,
    "ball_positions" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "shot_paths" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "club_id" integer,
    CONSTRAINT "drills_difficulty_check" CHECK (("difficulty" = ANY (ARRAY['beginner'::"text", 'intermediate'::"text", 'advanced'::"text"]))),
    CONSTRAINT "drills_skill_type_check" CHECK (("skill_type" = ANY (ARRAY['potting'::"text", 'position'::"text", 'safety'::"text", 'break'::"text", 'banks'::"text", 'kicks'::"text", 'patterns'::"text", 'specials'::"text"])))
);


ALTER TABLE "public"."drills" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."drills_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."drills_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."drills_id_seq" OWNED BY "public"."drills"."id";



CREATE TABLE IF NOT EXISTS "public"."games" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "player_1_score" bigint NOT NULL,
    "player_2_score" bigint NOT NULL,
    "player_1_id" bigint NOT NULL,
    "player_2_id" bigint NOT NULL,
    "mode" "public"."GameMode" DEFAULT 'single'::"public"."GameMode" NOT NULL,
    "player_1b_id" bigint,
    "player_2b_id" bigint,
    "club_id" integer NOT NULL,
    "discipline" "public"."Discipline" DEFAULT '9ball'::"public"."Discipline" NOT NULL
);


ALTER TABLE "public"."games" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."people" (
    "id" bigint NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "avatar_url" "text",
    "user_id" "uuid",
    "is_public" boolean DEFAULT true NOT NULL,
    CONSTRAINT "people_name_check" CHECK (("char_length"("btrim"("name")) >= 1)),
    CONSTRAINT "people_slug_shape" CHECK (("slug" ~ '^[a-z0-9][a-z0-9-]*$'::"text"))
);


ALTER TABLE "public"."people" OWNER TO "postgres";


ALTER TABLE "public"."people" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."people_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."players" (
    "id" bigint NOT NULL,
    "category" double precision DEFAULT '3'::double precision NOT NULL,
    "club_id" integer NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "person_id" bigint NOT NULL,
    CONSTRAINT "players_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'active'::"text"])))
);


ALTER TABLE "public"."players" OWNER TO "postgres";


ALTER TABLE "public"."players" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."players_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."reactions" (
    "id" integer NOT NULL,
    "club_id" integer NOT NULL,
    "author_player_id" integer NOT NULL,
    "game_id" "uuid",
    "drill_log_id" integer,
    "emoji" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "reactions_check" CHECK (("num_nonnulls"("game_id", "drill_log_id") = 1)),
    CONSTRAINT "reactions_emoji_check" CHECK ((("char_length"("emoji") >= 1) AND ("char_length"("emoji") <= 16)))
);


ALTER TABLE "public"."reactions" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."reactions_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."reactions_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."reactions_id_seq" OWNED BY "public"."reactions"."id";



CREATE TABLE IF NOT EXISTS "public"."tournament_matches" (
    "id" "uuid" NOT NULL,
    "tournament_id" integer NOT NULL,
    "bracket" "text" NOT NULL,
    "round" smallint NOT NULL,
    "slot" smallint NOT NULL,
    "group_no" smallint,
    "p1_id" integer,
    "p2_id" integer,
    "winner_id" integer,
    "game_id" "uuid",
    "winner_to" "uuid",
    "winner_to_slot" smallint,
    "loser_to" "uuid",
    "loser_to_slot" smallint,
    CONSTRAINT "tournament_matches_bracket_check" CHECK (("bracket" = ANY (ARRAY['group'::"text", 'winners'::"text", 'losers'::"text", 'final'::"text", 'league'::"text"]))),
    CONSTRAINT "tournament_matches_group_no_check" CHECK ((("bracket" = 'group'::"text") = ("group_no" IS NOT NULL))),
    CONSTRAINT "tournament_matches_loser_slot_check" CHECK (("loser_to_slot" = ANY (ARRAY[1, 2]))),
    CONSTRAINT "tournament_matches_winner_check" CHECK ((("winner_id" IS NULL) OR ("winner_id" = "p1_id") OR ("winner_id" = "p2_id"))),
    CONSTRAINT "tournament_matches_winner_slot_check" CHECK (("winner_to_slot" = ANY (ARRAY[1, 2])))
);


ALTER TABLE "public"."tournament_matches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tournament_players" (
    "tournament_id" integer NOT NULL,
    "player_id" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tournament_players" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tournaments" (
    "id" integer NOT NULL,
    "club_id" integer NOT NULL,
    "name" "text" NOT NULL,
    "format" "text" NOT NULL,
    "category" smallint,
    "legs" smallint DEFAULT 1 NOT NULL,
    "advance" smallint,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "discipline" "public"."Discipline" DEFAULT '9ball'::"public"."Discipline" NOT NULL,
    "race_to" smallint DEFAULT 5 NOT NULL,
    "race_semi" smallint,
    "race_final" smallint,
    CONSTRAINT "tournaments_advance_check" CHECK ((("format" = 'group_knockout'::"text") = ("advance" IS NOT NULL))),
    CONSTRAINT "tournaments_advance_values_check" CHECK (("advance" = ANY (ARRAY[2, 4, 8, 16]))),
    CONSTRAINT "tournaments_category_check" CHECK (("category" = ANY (ARRAY[1, 2, 3]))),
    CONSTRAINT "tournaments_format_check" CHECK (("format" = ANY (ARRAY['double_elim'::"text", 'league'::"text", 'group_knockout'::"text"]))),
    CONSTRAINT "tournaments_legs_check" CHECK (("legs" = ANY (ARRAY[1, 2]))),
    CONSTRAINT "tournaments_name_check" CHECK ((("char_length"("btrim"("name")) >= 1) AND ("char_length"("btrim"("name")) <= 60))),
    CONSTRAINT "tournaments_race_final_check" CHECK ((("race_final" IS NULL) OR (("race_final" >= 1) AND ("race_final" <= 50)))),
    CONSTRAINT "tournaments_race_semi_check" CHECK ((("race_semi" IS NULL) OR (("race_semi" >= 1) AND ("race_semi" <= 50)))),
    CONSTRAINT "tournaments_race_to_check" CHECK ((("race_to" >= 1) AND ("race_to" <= 50))),
    CONSTRAINT "tournaments_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'groups'::"text", 'running'::"text", 'done'::"text"])))
);


ALTER TABLE "public"."tournaments" OWNER TO "postgres";


ALTER TABLE "public"."tournaments" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."tournaments_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."training_plan_steps" (
    "id" integer NOT NULL,
    "plan_id" integer NOT NULL,
    "drill_id" integer NOT NULL,
    "step_order" integer NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "drill_log_id" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "training_plan_steps_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'completed'::"text", 'skipped'::"text"])))
);


ALTER TABLE "public"."training_plan_steps" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."training_plan_steps_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."training_plan_steps_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."training_plan_steps_id_seq" OWNED BY "public"."training_plan_steps"."id";



CREATE TABLE IF NOT EXISTS "public"."training_plans" (
    "id" integer NOT NULL,
    "player_id" integer NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."training_plans" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."training_plans_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."training_plans_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."training_plans_id_seq" OWNED BY "public"."training_plans"."id";



ALTER TABLE ONLY "public"."challenges" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."challenges_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."clubs" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."clubs_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."comments" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."comments_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."drill_logs" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."drill_logs_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."drills" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."drills_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."reactions" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."reactions_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."training_plan_steps" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."training_plan_steps_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."training_plans" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."training_plans_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."challenges"
    ADD CONSTRAINT "challenges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clubs"
    ADD CONSTRAINT "clubs_join_code_key" UNIQUE ("join_code");



ALTER TABLE ONLY "public"."clubs"
    ADD CONSTRAINT "clubs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."drill_logs"
    ADD CONSTRAINT "drill_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."drills"
    ADD CONSTRAINT "drills_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."games"
    ADD CONSTRAINT "games_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."people"
    ADD CONSTRAINT "people_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."people"
    ADD CONSTRAINT "people_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."players"
    ADD CONSTRAINT "players_club_person_key" UNIQUE ("club_id", "person_id");



ALTER TABLE ONLY "public"."players"
    ADD CONSTRAINT "players_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reactions"
    ADD CONSTRAINT "reactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tournament_matches"
    ADD CONSTRAINT "tournament_matches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tournament_matches"
    ADD CONSTRAINT "tournament_matches_position_key" UNIQUE NULLS NOT DISTINCT ("tournament_id", "bracket", "group_no", "round", "slot");



ALTER TABLE ONLY "public"."tournament_players"
    ADD CONSTRAINT "tournament_players_pkey" PRIMARY KEY ("tournament_id", "player_id");



ALTER TABLE ONLY "public"."tournaments"
    ADD CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."training_plan_steps"
    ADD CONSTRAINT "training_plan_steps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."training_plan_steps"
    ADD CONSTRAINT "training_plan_steps_plan_id_step_order_key" UNIQUE ("plan_id", "step_order");



ALTER TABLE ONLY "public"."training_plans"
    ADD CONSTRAINT "training_plans_pkey" PRIMARY KEY ("id");



CREATE INDEX "challenges_club_idx" ON "public"."challenges" USING "btree" ("club_id", "status");



CREATE UNIQUE INDEX "clubs_slug_key" ON "public"."clubs" USING "btree" ("slug");



CREATE INDEX "comments_game_idx" ON "public"."comments" USING "btree" ("game_id", "created_at");



CREATE INDEX "comments_log_idx" ON "public"."comments" USING "btree" ("drill_log_id", "created_at");



CREATE INDEX "games_club_idx" ON "public"."games" USING "btree" ("club_id", "created_at" DESC);



CREATE INDEX "idx_drill_logs_drill" ON "public"."drill_logs" USING "btree" ("drill_id");



CREATE INDEX "idx_drill_logs_player" ON "public"."drill_logs" USING "btree" ("player_id");



CREATE INDEX "idx_training_plan_steps_plan" ON "public"."training_plan_steps" USING "btree" ("plan_id");



CREATE INDEX "idx_training_plans_player" ON "public"."training_plans" USING "btree" ("player_id");



CREATE UNIQUE INDEX "people_slug_key" ON "public"."people" USING "btree" ("slug");



CREATE INDEX "players_club_idx" ON "public"."players" USING "btree" ("club_id", "status");



CREATE INDEX "players_person_idx" ON "public"."players" USING "btree" ("person_id");



CREATE INDEX "reactions_game_idx" ON "public"."reactions" USING "btree" ("game_id");



CREATE UNIQUE INDEX "reactions_game_once" ON "public"."reactions" USING "btree" ("author_player_id", "game_id", "emoji") WHERE ("game_id" IS NOT NULL);



CREATE INDEX "reactions_log_idx" ON "public"."reactions" USING "btree" ("drill_log_id");



CREATE UNIQUE INDEX "reactions_log_once" ON "public"."reactions" USING "btree" ("author_player_id", "drill_log_id", "emoji") WHERE ("drill_log_id" IS NOT NULL);



CREATE INDEX "tournament_matches_t_idx" ON "public"."tournament_matches" USING "btree" ("tournament_id", "bracket", "group_no", "round", "slot");



CREATE INDEX "tournaments_club_idx" ON "public"."tournaments" USING "btree" ("club_id", "status");



CREATE OR REPLACE TRIGGER "clubs_set_slug" BEFORE INSERT ON "public"."clubs" FOR EACH ROW EXECUTE FUNCTION "public"."clubs_set_slug"();



CREATE OR REPLACE TRIGGER "people_drop_orphan" AFTER DELETE ON "public"."players" FOR EACH ROW EXECUTE FUNCTION "public"."people_drop_orphan"();



CREATE OR REPLACE TRIGGER "people_guard_user_id" BEFORE UPDATE ON "public"."people" FOR EACH ROW EXECUTE FUNCTION "public"."people_guard_user_id"();



CREATE OR REPLACE TRIGGER "people_set_slug" BEFORE INSERT ON "public"."people" FOR EACH ROW EXECUTE FUNCTION "public"."people_set_slug"();



CREATE OR REPLACE TRIGGER "players_guard_membership" BEFORE UPDATE ON "public"."players" FOR EACH ROW EXECUTE FUNCTION "public"."players_guard_membership"();



CREATE OR REPLACE TRIGGER "players_recount_members" AFTER INSERT OR DELETE OR UPDATE OF "status", "club_id" ON "public"."players" FOR EACH ROW EXECUTE FUNCTION "public"."clubs_recount_members"();



CREATE OR REPLACE TRIGGER "tournament_matches_guard" BEFORE UPDATE ON "public"."tournament_matches" FOR EACH ROW EXECUTE FUNCTION "public"."tournament_match_guard"();



ALTER TABLE ONLY "public"."challenges"
    ADD CONSTRAINT "challenges_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."challenges"
    ADD CONSTRAINT "challenges_from_player_id_fkey" FOREIGN KEY ("from_player_id") REFERENCES "public"."players"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."challenges"
    ADD CONSTRAINT "challenges_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."challenges"
    ADD CONSTRAINT "challenges_to_player_id_fkey" FOREIGN KEY ("to_player_id") REFERENCES "public"."players"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clubs"
    ADD CONSTRAINT "clubs_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_author_player_id_fkey" FOREIGN KEY ("author_player_id") REFERENCES "public"."players"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_drill_log_id_fkey" FOREIGN KEY ("drill_log_id") REFERENCES "public"."drill_logs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."drill_logs"
    ADD CONSTRAINT "drill_logs_drill_id_fkey" FOREIGN KEY ("drill_id") REFERENCES "public"."drills"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."drill_logs"
    ADD CONSTRAINT "drill_logs_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."drills"
    ADD CONSTRAINT "drills_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id");



ALTER TABLE ONLY "public"."drills"
    ADD CONSTRAINT "drills_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."games"
    ADD CONSTRAINT "games_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."games"
    ADD CONSTRAINT "games_player_1_id_fkey" FOREIGN KEY ("player_1_id") REFERENCES "public"."players"("id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."games"
    ADD CONSTRAINT "games_player_1b_id_fkey" FOREIGN KEY ("player_1b_id") REFERENCES "public"."players"("id");



ALTER TABLE ONLY "public"."games"
    ADD CONSTRAINT "games_player_2_id_fkey" FOREIGN KEY ("player_2_id") REFERENCES "public"."players"("id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."games"
    ADD CONSTRAINT "games_player_2b_id_fkey" FOREIGN KEY ("player_2b_id") REFERENCES "public"."players"("id");



ALTER TABLE ONLY "public"."people"
    ADD CONSTRAINT "people_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."players"
    ADD CONSTRAINT "players_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."players"
    ADD CONSTRAINT "players_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reactions"
    ADD CONSTRAINT "reactions_author_player_id_fkey" FOREIGN KEY ("author_player_id") REFERENCES "public"."players"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reactions"
    ADD CONSTRAINT "reactions_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reactions"
    ADD CONSTRAINT "reactions_drill_log_id_fkey" FOREIGN KEY ("drill_log_id") REFERENCES "public"."drill_logs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reactions"
    ADD CONSTRAINT "reactions_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournament_matches"
    ADD CONSTRAINT "tournament_matches_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tournament_matches"
    ADD CONSTRAINT "tournament_matches_loser_to_fkey" FOREIGN KEY ("loser_to") REFERENCES "public"."tournament_matches"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tournament_matches"
    ADD CONSTRAINT "tournament_matches_p1_id_fkey" FOREIGN KEY ("p1_id") REFERENCES "public"."players"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tournament_matches"
    ADD CONSTRAINT "tournament_matches_p2_id_fkey" FOREIGN KEY ("p2_id") REFERENCES "public"."players"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tournament_matches"
    ADD CONSTRAINT "tournament_matches_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournament_matches"
    ADD CONSTRAINT "tournament_matches_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "public"."players"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tournament_matches"
    ADD CONSTRAINT "tournament_matches_winner_to_fkey" FOREIGN KEY ("winner_to") REFERENCES "public"."tournament_matches"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tournament_players"
    ADD CONSTRAINT "tournament_players_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournament_players"
    ADD CONSTRAINT "tournament_players_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournaments"
    ADD CONSTRAINT "tournaments_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."training_plan_steps"
    ADD CONSTRAINT "training_plan_steps_drill_id_fkey" FOREIGN KEY ("drill_id") REFERENCES "public"."drills"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."training_plan_steps"
    ADD CONSTRAINT "training_plan_steps_drill_log_id_fkey" FOREIGN KEY ("drill_log_id") REFERENCES "public"."drill_logs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."training_plan_steps"
    ADD CONSTRAINT "training_plan_steps_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."training_plans"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."training_plans"
    ADD CONSTRAINT "training_plans_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE CASCADE;



CREATE POLICY "Admin can add players" ON "public"."players" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_club_admin"("club_id"));



CREATE POLICY "Admin can create tournaments" ON "public"."tournaments" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_club_admin"("club_id"));



CREATE POLICY "Admin can delete matches" ON "public"."tournament_matches" FOR DELETE TO "authenticated" USING ("public"."is_club_admin"("public"."tournament_club"("tournament_id")));



CREATE POLICY "Admin can delete tournaments" ON "public"."tournaments" FOR DELETE TO "authenticated" USING ("public"."is_club_admin"("club_id"));



CREATE POLICY "Admin can generate matches" ON "public"."tournament_matches" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_club_admin"("public"."tournament_club"("tournament_id")));



CREATE POLICY "Admin can remove players" ON "public"."players" FOR DELETE TO "authenticated" USING ("public"."is_club_admin"("club_id"));



CREATE POLICY "Admin can update guests in their club" ON "public"."people" FOR UPDATE TO "authenticated" USING ((("user_id" IS NULL) AND "public"."person_is_admins_guest"("id"))) WITH CHECK (("user_id" IS NULL));



CREATE POLICY "Admin can update tournaments" ON "public"."tournaments" FOR UPDATE TO "authenticated" USING ("public"."is_club_admin"("club_id")) WITH CHECK ("public"."is_club_admin"("club_id"));



CREATE POLICY "Authenticated users can create clubs" ON "public"."clubs" FOR INSERT TO "authenticated" WITH CHECK (("owner_id" = "auth"."uid"()));



CREATE POLICY "Author can remove reactions" ON "public"."reactions" FOR DELETE TO "authenticated" USING (("public"."is_own_player"("author_player_id") OR "public"."is_club_admin"("club_id")));



CREATE POLICY "Author or admin can delete comments" ON "public"."comments" FOR DELETE TO "authenticated" USING (("public"."is_own_player"("author_player_id") OR "public"."is_club_admin"("club_id")));



CREATE POLICY "Challenger can withdraw" ON "public"."challenges" FOR DELETE TO "authenticated" USING (("public"."is_own_player"("from_player_id") OR "public"."is_club_admin"("club_id")));



CREATE POLICY "Creator or admin can delete drills" ON "public"."drills" FOR DELETE TO "authenticated" USING ((("created_by" = "auth"."uid"()) OR "public"."is_drill_admin"()));



CREATE POLICY "Creator or admin can update drills" ON "public"."drills" FOR UPDATE TO "authenticated" USING ((("created_by" = "auth"."uid"()) OR "public"."is_drill_admin"())) WITH CHECK (((("created_by" = "auth"."uid"()) AND (("club_id" IS NULL) OR "public"."is_club_member"("club_id"))) OR "public"."is_drill_admin"()));



CREATE POLICY "Either side can respond" ON "public"."challenges" FOR UPDATE TO "authenticated" USING (("public"."is_own_player"("to_player_id") OR "public"."is_own_player"("from_player_id"))) WITH CHECK (("public"."is_own_player"("to_player_id") OR "public"."is_own_player"("from_player_id")));



CREATE POLICY "Entrant or admin can withdraw" ON "public"."tournament_players" FOR DELETE TO "authenticated" USING (("public"."is_own_player"("player_id") OR "public"."is_club_admin"("public"."tournament_club"("tournament_id"))));



CREATE POLICY "Entrants of public tournaments are readable by anyone" ON "public"."tournament_players" FOR SELECT TO "anon" USING ("public"."is_public_club"("public"."tournament_club"("tournament_id")));



CREATE POLICY "Games of public clubs are readable by anyone" ON "public"."games" FOR SELECT TO "anon" USING ("public"."is_public_club"("club_id"));



CREATE POLICY "Matches of public tournaments are readable by anyone" ON "public"."tournament_matches" FOR SELECT TO "anon" USING ("public"."is_public_club"("public"."tournament_club"("tournament_id")));



CREATE POLICY "Members can add club games" ON "public"."games" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_club_member"("club_id"));



CREATE POLICY "Members can delete club games" ON "public"."games" FOR DELETE TO "authenticated" USING ("public"."is_club_member"("club_id"));



CREATE POLICY "Members can delete drill logs" ON "public"."drill_logs" FOR DELETE TO "authenticated" USING ("public"."can_touch_player"("player_id"));



CREATE POLICY "Members can enter themselves" ON "public"."tournament_players" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_club_member"("public"."tournament_club"("tournament_id")) AND (EXISTS ( SELECT 1
   FROM "public"."players"
  WHERE (("players"."id" = "tournament_players"."player_id") AND ("players"."club_id" = "public"."tournament_club"("tournament_players"."tournament_id"))))) AND ("public"."is_own_player"("player_id") OR "public"."is_club_admin"("public"."tournament_club"("tournament_id")))));



CREATE POLICY "Members can insert their own club drills" ON "public"."drills" FOR INSERT TO "authenticated" WITH CHECK ((("created_by" = "auth"."uid"()) AND ("club_id" IS NOT NULL) AND "public"."is_club_member"("club_id")));



CREATE POLICY "Members can read comments" ON "public"."comments" FOR SELECT TO "authenticated" USING ("public"."is_club_member"("club_id"));



CREATE POLICY "Members can read drill logs" ON "public"."drill_logs" FOR SELECT TO "authenticated" USING ("public"."can_touch_player"("player_id"));



CREATE POLICY "Members can read plan steps" ON "public"."training_plan_steps" FOR SELECT TO "authenticated" USING ("public"."can_touch_plan"("plan_id"));



CREATE POLICY "Members can read reactions" ON "public"."reactions" FOR SELECT TO "authenticated" USING ("public"."is_club_member"("club_id"));



CREATE POLICY "Members can read training plans" ON "public"."training_plans" FOR SELECT TO "authenticated" USING ("public"."can_touch_player"("player_id"));



CREATE POLICY "Members can record results" ON "public"."tournament_matches" FOR UPDATE TO "authenticated" USING ("public"."is_club_member"("public"."tournament_club"("tournament_id"))) WITH CHECK ("public"."is_club_member"("public"."tournament_club"("tournament_id")));



CREATE POLICY "Members can send challenges" ON "public"."challenges" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_club_member"("club_id") AND "public"."is_own_player"("from_player_id")));



CREATE POLICY "Members can update club players" ON "public"."players" FOR UPDATE TO "authenticated" USING ("public"."is_club_member"("club_id")) WITH CHECK ("public"."is_club_member"("club_id"));



CREATE POLICY "Members can update plan steps" ON "public"."training_plan_steps" FOR UPDATE TO "authenticated" USING ("public"."can_touch_plan"("plan_id")) WITH CHECK ("public"."can_touch_plan"("plan_id"));



CREATE POLICY "Members can update training plans" ON "public"."training_plans" FOR UPDATE TO "authenticated" USING ("public"."can_touch_player"("player_id")) WITH CHECK ("public"."can_touch_player"("player_id"));



CREATE POLICY "Members can view club challenges" ON "public"."challenges" FOR SELECT TO "authenticated" USING ("public"."is_club_member"("club_id"));



CREATE POLICY "Members can view club drills or the shared catalog" ON "public"."drills" FOR SELECT TO "authenticated" USING ((("club_id" IS NULL) OR "public"."is_club_member"("club_id")));



CREATE POLICY "Members can view club games" ON "public"."games" FOR SELECT TO "authenticated" USING ("public"."is_club_member"("club_id"));



CREATE POLICY "Members can view club players" ON "public"."players" FOR SELECT TO "authenticated" USING (("public"."is_club_member"("club_id") OR ("person_id" IN ( SELECT "people"."id"
   FROM "public"."people"
  WHERE ("people"."user_id" = "auth"."uid"())))));



CREATE POLICY "Members can view club tournaments" ON "public"."tournaments" FOR SELECT TO "authenticated" USING ("public"."is_club_member"("club_id"));



CREATE POLICY "Members can view entrants" ON "public"."tournament_players" FOR SELECT TO "authenticated" USING ("public"."is_club_member"("public"."tournament_club"("tournament_id")));



CREATE POLICY "Members can view people in their clubs" ON "public"."people" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."person_shares_club"("id")));



CREATE POLICY "Members can view their clubs" ON "public"."clubs" FOR SELECT TO "authenticated" USING (("public"."is_club_member"("id") OR "public"."is_club_admin"("id")));



CREATE POLICY "Members can view tournament matches" ON "public"."tournament_matches" FOR SELECT TO "authenticated" USING ("public"."is_club_member"("public"."tournament_club"("tournament_id")));



CREATE POLICY "Members can write comments" ON "public"."comments" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_club_member"("club_id") AND "public"."is_own_player"("author_player_id")));



CREATE POLICY "Members can write drill logs" ON "public"."drill_logs" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_touch_player"("player_id"));



CREATE POLICY "Members can write plan steps" ON "public"."training_plan_steps" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_touch_plan"("plan_id"));



CREATE POLICY "Members can write reactions" ON "public"."reactions" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_club_member"("club_id") AND "public"."is_own_player"("author_player_id")));



CREATE POLICY "Members can write training plans" ON "public"."training_plans" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_touch_player"("player_id"));



CREATE POLICY "Own person can be updated" ON "public"."people" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Own row can be updated" ON "public"."players" FOR UPDATE TO "authenticated" USING (("person_id" IN ( SELECT "people"."id"
   FROM "public"."people"
  WHERE ("people"."user_id" = "auth"."uid"())))) WITH CHECK (("person_id" IN ( SELECT "people"."id"
   FROM "public"."people"
  WHERE ("people"."user_id" = "auth"."uid"()))));



CREATE POLICY "Owner can delete club" ON "public"."clubs" FOR DELETE TO "authenticated" USING ("public"."is_club_admin"("id"));



CREATE POLICY "Owner can update club" ON "public"."clubs" FOR UPDATE TO "authenticated" USING ("public"."is_club_admin"("id")) WITH CHECK (("owner_id" = "auth"."uid"()));



CREATE POLICY "People of public clubs are readable by anyone" ON "public"."people" FOR SELECT TO "anon" USING ("public"."person_in_public_club"("id"));



CREATE POLICY "Players of public clubs are readable by anyone" ON "public"."players" FOR SELECT TO "anon" USING ((("status" = 'active'::"text") AND "public"."is_public_club"("club_id")));



CREATE POLICY "Public clubs are readable by anyone" ON "public"."clubs" FOR SELECT TO "anon" USING ("is_public");



CREATE POLICY "The shared drill catalog is readable by anyone" ON "public"."drills" FOR SELECT TO "anon" USING (("club_id" IS NULL));



CREATE POLICY "Tournaments of public clubs are readable by anyone" ON "public"."tournaments" FOR SELECT TO "anon" USING ("public"."is_public_club"("club_id"));



ALTER TABLE "public"."challenges" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clubs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."drill_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."drills" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."games" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."people" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."players" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tournament_matches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tournament_players" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tournaments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."training_plan_steps" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."training_plans" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."challenges";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."comments";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."drill_logs";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."games";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."people";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."players";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."reactions";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."tournament_matches";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."tournament_players";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."tournaments";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."training_plan_steps";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."add_guest_player"("cid" integer, "pname" "text", "cat" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."add_guest_player"("cid" integer, "pname" "text", "cat" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_guest_player"("cid" integer, "pname" "text", "cat" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."can_touch_plan"("pid" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."can_touch_plan"("pid" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_touch_plan"("pid" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."can_touch_player"("pid" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."can_touch_player"("pid" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_touch_player"("pid" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."club_preview"("code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."club_preview"("code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."club_preview"("code" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."club_slug_reserved"() TO "anon";
GRANT ALL ON FUNCTION "public"."club_slug_reserved"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."club_slug_reserved"() TO "service_role";



GRANT ALL ON FUNCTION "public"."clubs_recount_members"() TO "anon";
GRANT ALL ON FUNCTION "public"."clubs_recount_members"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."clubs_recount_members"() TO "service_role";



GRANT ALL ON FUNCTION "public"."clubs_set_slug"() TO "anon";
GRANT ALL ON FUNCTION "public"."clubs_set_slug"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."clubs_set_slug"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_club"("club_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_club"("club_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_club_admin"("cid" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."is_club_admin"("cid" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_club_admin"("cid" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."is_club_member"("cid" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."is_club_member"("cid" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_club_member"("cid" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."is_drill_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_drill_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_drill_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_own_player"("pid" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."is_own_player"("pid" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_own_player"("pid" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."is_public_club"("cid" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."is_public_club"("cid" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_public_club"("cid" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."join_club"("code" "text", "claim_player_id" integer, "display_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."join_club"("code" "text", "claim_player_id" integer, "display_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."people_drop_orphan"() TO "anon";
GRANT ALL ON FUNCTION "public"."people_drop_orphan"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."people_drop_orphan"() TO "service_role";



GRANT ALL ON FUNCTION "public"."people_guard_user_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."people_guard_user_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."people_guard_user_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."people_set_slug"() TO "anon";
GRANT ALL ON FUNCTION "public"."people_set_slug"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."people_set_slug"() TO "service_role";



GRANT ALL ON FUNCTION "public"."person_in_public_club"("pid" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."person_in_public_club"("pid" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."person_in_public_club"("pid" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."person_is_admins_guest"("pid" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."person_is_admins_guest"("pid" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."person_is_admins_guest"("pid" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."person_shares_club"("pid" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."person_shares_club"("pid" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."person_shares_club"("pid" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."players_guard_membership"() TO "anon";
GRANT ALL ON FUNCTION "public"."players_guard_membership"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."players_guard_membership"() TO "service_role";



GRANT ALL ON FUNCTION "public"."slugify"("txt" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."slugify"("txt" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."slugify"("txt" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."tournament_club"("tid" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."tournament_club"("tid" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."tournament_club"("tid" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."tournament_match_guard"() TO "anon";
GRANT ALL ON FUNCTION "public"."tournament_match_guard"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."tournament_match_guard"() TO "service_role";


















GRANT ALL ON TABLE "public"."challenges" TO "anon";
GRANT ALL ON TABLE "public"."challenges" TO "authenticated";
GRANT ALL ON TABLE "public"."challenges" TO "service_role";



GRANT ALL ON SEQUENCE "public"."challenges_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."challenges_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."challenges_id_seq" TO "service_role";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."clubs" TO "anon";
GRANT ALL ON TABLE "public"."clubs" TO "authenticated";
GRANT ALL ON TABLE "public"."clubs" TO "service_role";



GRANT SELECT("id") ON TABLE "public"."clubs" TO "anon";



GRANT SELECT("name") ON TABLE "public"."clubs" TO "anon";



GRANT SELECT("created_at") ON TABLE "public"."clubs" TO "anon";



GRANT SELECT("logo_url") ON TABLE "public"."clubs" TO "anon";



GRANT SELECT("theme_color") ON TABLE "public"."clubs" TO "anon";



GRANT SELECT("slug") ON TABLE "public"."clubs" TO "anon";



GRANT SELECT("is_public") ON TABLE "public"."clubs" TO "anon";



GRANT SELECT("member_count") ON TABLE "public"."clubs" TO "anon";



GRANT SELECT("address") ON TABLE "public"."clubs" TO "anon";



GRANT SELECT("city") ON TABLE "public"."clubs" TO "anon";



GRANT SELECT("country") ON TABLE "public"."clubs" TO "anon";



GRANT SELECT("lat") ON TABLE "public"."clubs" TO "anon";



GRANT SELECT("lon") ON TABLE "public"."clubs" TO "anon";



GRANT ALL ON SEQUENCE "public"."clubs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."clubs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."clubs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."comments" TO "anon";
GRANT ALL ON TABLE "public"."comments" TO "authenticated";
GRANT ALL ON TABLE "public"."comments" TO "service_role";



GRANT ALL ON SEQUENCE "public"."comments_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."comments_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."comments_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."drill_logs" TO "anon";
GRANT ALL ON TABLE "public"."drill_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."drill_logs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."drill_logs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."drill_logs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."drill_logs_id_seq" TO "service_role";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."drills" TO "anon";
GRANT ALL ON TABLE "public"."drills" TO "authenticated";
GRANT ALL ON TABLE "public"."drills" TO "service_role";



GRANT SELECT("id") ON TABLE "public"."drills" TO "anon";



GRANT SELECT("name") ON TABLE "public"."drills" TO "anon";



GRANT SELECT("description") ON TABLE "public"."drills" TO "anon";



GRANT SELECT("difficulty") ON TABLE "public"."drills" TO "anon";



GRANT SELECT("skill_type") ON TABLE "public"."drills" TO "anon";



GRANT SELECT("setup_instructions") ON TABLE "public"."drills" TO "anon";



GRANT SELECT("scoring_method") ON TABLE "public"."drills" TO "anon";



GRANT SELECT("max_score") ON TABLE "public"."drills" TO "anon";



GRANT SELECT("ball_positions") ON TABLE "public"."drills" TO "anon";



GRANT SELECT("shot_paths") ON TABLE "public"."drills" TO "anon";



GRANT SELECT("created_at") ON TABLE "public"."drills" TO "anon";



GRANT SELECT("club_id") ON TABLE "public"."drills" TO "anon";



GRANT ALL ON SEQUENCE "public"."drills_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."drills_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."drills_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."games" TO "anon";
GRANT ALL ON TABLE "public"."games" TO "authenticated";
GRANT ALL ON TABLE "public"."games" TO "service_role";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."people" TO "anon";
GRANT ALL ON TABLE "public"."people" TO "authenticated";
GRANT ALL ON TABLE "public"."people" TO "service_role";



GRANT SELECT("id") ON TABLE "public"."people" TO "anon";



GRANT SELECT("slug") ON TABLE "public"."people" TO "anon";



GRANT SELECT("name") ON TABLE "public"."people" TO "anon";



GRANT SELECT("avatar_url") ON TABLE "public"."people" TO "anon";



GRANT SELECT("is_public") ON TABLE "public"."people" TO "anon";



GRANT ALL ON SEQUENCE "public"."people_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."people_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."people_id_seq" TO "service_role";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."players" TO "anon";
GRANT ALL ON TABLE "public"."players" TO "authenticated";
GRANT ALL ON TABLE "public"."players" TO "service_role";



GRANT SELECT("id") ON TABLE "public"."players" TO "anon";



GRANT SELECT("category") ON TABLE "public"."players" TO "anon";



GRANT SELECT("club_id") ON TABLE "public"."players" TO "anon";



GRANT SELECT("status") ON TABLE "public"."players" TO "anon";



GRANT SELECT("person_id") ON TABLE "public"."players" TO "anon";



GRANT ALL ON SEQUENCE "public"."players_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."players_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."players_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."reactions" TO "anon";
GRANT ALL ON TABLE "public"."reactions" TO "authenticated";
GRANT ALL ON TABLE "public"."reactions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."reactions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."reactions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."reactions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."tournament_matches" TO "anon";
GRANT ALL ON TABLE "public"."tournament_matches" TO "authenticated";
GRANT ALL ON TABLE "public"."tournament_matches" TO "service_role";



GRANT ALL ON TABLE "public"."tournament_players" TO "anon";
GRANT ALL ON TABLE "public"."tournament_players" TO "authenticated";
GRANT ALL ON TABLE "public"."tournament_players" TO "service_role";



GRANT ALL ON TABLE "public"."tournaments" TO "anon";
GRANT ALL ON TABLE "public"."tournaments" TO "authenticated";
GRANT ALL ON TABLE "public"."tournaments" TO "service_role";



GRANT ALL ON SEQUENCE "public"."tournaments_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."tournaments_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."tournaments_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."training_plan_steps" TO "anon";
GRANT ALL ON TABLE "public"."training_plan_steps" TO "authenticated";
GRANT ALL ON TABLE "public"."training_plan_steps" TO "service_role";



GRANT ALL ON SEQUENCE "public"."training_plan_steps_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."training_plan_steps_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."training_plan_steps_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."training_plans" TO "anon";
GRANT ALL ON TABLE "public"."training_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."training_plans" TO "service_role";



GRANT ALL ON SEQUENCE "public"."training_plans_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."training_plans_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."training_plans_id_seq" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































