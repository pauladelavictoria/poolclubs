-- =============================================
-- A1 — the seeded demo club (docs/marketing-plan.md)
-- =============================================
--
-- Real rows, not a fake session mode. Twenty members, ~200 games spread over
-- three months, one finished double-elimination tournament with a real
-- bracket, a handful of drill logs and some feed reactions/comments — enough
-- that a club owner opens /clubs/<slug> and sees a club that has clearly been
-- alive for a season, not an empty form. See the "Why A1 outranks everything"
-- note in the marketing plan: the pitch is "this is your club in six weeks,"
-- and nobody believes that from a blank screen.
--
-- Ownership: the club and every fake member belong to whichever account is
-- signed in as pauladelavictoria@gmail.com (this repo's operator) — that
-- account must have used the app at least once already, so it has an
-- auth.users row and a people row to attach the demo club's admin membership
-- to. Everything else (the 20 members, their games, the tournament, the drill
-- logs) is fictional and owned only by the demo club.
--
-- Idempotent: re-running this deletes the previous run's demo club by its
-- fixed slug first. ON DELETE CASCADE on clubs takes players, games,
-- tournaments, tournament_matches/players, reactions and comments with it;
-- the people_drop_orphan trigger then drops the now-orphaned fictional people
-- rows (it never touches the operator's own people row, which still has a
-- user_id). Apply with `npm run db:sql sql/demo-club.sql`.
--
-- The bracket wiring (winner_to/loser_to/winner_to_slot/loser_to_slot for all
-- 14 matches) is not hand-guessed: it is the literal output of
-- src/libs/bracket.ts's buildKnockout(seed 1..8, {doubleElim:true,
-- singleFrom:2}), fully played out, transcribed here as constants. Re-derive
-- it with node if the entrant count or single_from ever changes — do not
-- edit the wiring by hand.
--
-- Discipline/scores/dates are invented for plausibility, not drawn from any
-- real club.
-- =============================================

BEGIN;

DO $demo$
DECLARE
  v_slug          text := 'billar-ruzafa-demo';
  v_owner_uuid    uuid;
  v_owner_person  bigint;
  v_club_id       integer;
  v_club_created  timestamptz := now() - interval '100 days';

  v_member_names  text[] := ARRAY[
    'Javier Moreno','Sara Campos','Alejandro Ruiz','Marta Iglesias',
    'Diego Fernández','Lucía Navarro','Pablo Serrano','Elena Gómez',
    'Carlos Herrera','Ana Belén Torres','Miguel Ángel Ramos','Cristina Vidal',
    'Raúl Pascual','Nuria Esteban','Sergio Molina','Beatriz Aguilar',
    'Iván Domínguez','Paloma Reyes','Óscar Lozano','Rocío Blázquez'
  ];
  -- First 8 are the tournament's category-1 field, in seed order.
  v_member_categories double precision[] := ARRAY[
    1,1,1,1,1,1,1,1,
    2,2,2,2,2,2,2,2,
    3,3,3,3
  ];
  -- pravatar.cc img ids, hand-picked to match each name's gender (the roster
  -- alternates M/F) after actually viewing the photos — pravatar's set also
  -- has kids, group shots and costume/joke photos mixed in, which a bare
  -- sequential img=i would have handed out at random.
  v_avatar_imgs   int[] := ARRAY[
    3,5,7,9,8,10,11,16,12,19,
    13,20,14,21,17,23,18,24,33,25
  ];
  v_person_id     bigint;
  v_player_id     bigint;
  v_player_ids    bigint[] := '{}';
  -- v_player_ids[1..8] doubles as the tournament seed list once the loop below
  -- finishes, since the first 8 names inserted are the category-1 players.

  -- ---- 200 casual games, spread across the last ~90 days ------------------
  v_is_doubles    boolean;
  v_n             int;
  v_p1 bigint; v_p1b bigint; v_p2 bigint; v_p2b bigint;
  v_race int; v_lose int; v_s1 int; v_s2 int;
  v_disciplines   "Discipline"[] := ARRAY['8ball','9ball','9ball','10ball']::"Discipline"[];
  v_ts            timestamptz;
  i               int;

  -- ---- the tournament -------------------------------------------------
  v_tournament_id integer;
  -- One row per bracket match (TM1..TM14), in the exact shape buildKnockout()
  -- produced for 8 seeded entrants, doubleElim:true, singleFrom:2 (full
  -- double elimination, grand final only, no bracket reset).
  v_bracket   text[]  := ARRAY['winners','winners','winners','winners','winners','winners','winners',
                                'losers','losers','losers','losers','losers','losers','final'];
  v_round     int[]   := ARRAY[1,1,1,1,2,2,3, 1,1,2,2,3,4, 4];
  v_slotn     int[]   := ARRAY[0,1,2,3,0,1,0, 0,1,0,1,0,0, 0];
  v_p1seed    int[]   := ARRAY[1,4,2,3,8,2,4, 1,7,1,6,8,3, 2];
  v_p2seed    int[]   := ARRAY[8,5,7,6,4,3,2, 5,6,8,3,3,4, 3];
  v_winseed   int[]   := ARRAY[8,4,2,3,4,2,2, 1,6,8,3,3,3, 2];
  -- race_to=5 for every match except the two semis (7) and the final (9) —
  -- see raceFor() in src/libs/bracket.ts: the last round of each of the
  -- winners/losers brackets is the semi race, 'final' is its own race.
  v_racev     int[]   := ARRAY[5,5,5,5,5,5,7, 5,5,5,5,5,7, 9];
  v_losescore int[]   := ARRAY[3,2,1,4,3,3,4, 2,3,4,2,1,5, 6];
  v_wintoidx  int[]   := ARRAY[5,5,6,6,7,7,14, 10,11,12,12,13,14, NULL];
  v_wintoslot int[]   := ARRAY[1,2,1,2,1,2,1,  1,1,1,2,1,2, NULL];
  v_lostoidx  int[]   := ARRAY[8,8,9,9,10,11,13, NULL,NULL,NULL,NULL,NULL,NULL, NULL];
  v_lostoslot int[]   := ARRAY[1,2,1,2,2,2,2,  NULL,NULL,NULL,NULL,NULL,NULL, NULL];
  v_match_ids uuid[];
  v_game_id   uuid;
  v_tour_ts   timestamptz := v_club_created + interval '75 days';

  -- ---- drill logs, reactions, comments -------------------------------
  v_drill_names text[] := ARRAY[
    'F1 · Tiro cortado progresivo', 'F6 · Serie de embocada',
    'S1 · Fila de bolas (Bachelors)', 'Runout de 3 bolas', 'Mighty X',
    'RDS 100 - 16 rachas', 'PPC 01 · 9 bolas Bachelor 1'
  ];
  v_drill_id  integer;
  v_max_score integer;
  v_drill_log_id integer;
  v_emojis    text[] := ARRAY['🔥','👏','😮','💪','🎱','😂'];
  v_game_comments text[] := ARRAY[
    '¡Menuda partida!', 'Vaya remontada 😅', 'Hay que entrenar la salida, macho',
    'GG, la próxima te gano', '¡Qué nivel el sábado!', 'No me lo puedo creer, qué tiro'
  ];
  v_drill_comments text[] := ARRAY[
    'Buen ritmo esta semana', 'A por el 100 la próxima', '¡Sigue así!'
  ];
BEGIN
  -- 0. Clean slate for a re-run. tournament_matches first, as a plain DELETE:
  -- cascading the club delete straight to players would instead UPDATE ...
  -- SET p1_id/p2_id = NULL on any surviving match rows (the FK is ON DELETE
  -- SET NULL, not CASCADE), and that UPDATE trips tournament_match_guard,
  -- which rejects it because auth.uid() is NULL in this raw-SQL session and
  -- so is_club_admin() reads false. Deleting the matches outright first
  -- leaves nothing for that SET NULL to touch.
  DELETE FROM tournament_matches WHERE tournament_id IN (
    SELECT t.id FROM tournaments t JOIN clubs c ON c.id = t.club_id WHERE c.slug = v_slug
  );
  DELETE FROM clubs WHERE slug = v_slug;

  -- 1. The operator's own account owns the club.
  SELECT id INTO v_owner_uuid FROM auth.users WHERE email = 'pauladelavictoria@gmail.com';
  IF v_owner_uuid IS NULL THEN
    RAISE EXCEPTION 'no auth.users row for pauladelavictoria@gmail.com — sign into the app with that account first';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM drills WHERE name = ANY (v_drill_names)) THEN
    RAISE EXCEPTION 'none of the demo drill names exist yet — run sql/drills-seed-*.sql first';
  END IF;

  INSERT INTO clubs (name, slug, owner_id, is_public, address, city, country, lat, lon, theme_color, created_at)
  VALUES ('Club de Billar Ruzafa', v_slug, v_owner_uuid, true,
          'Carrer de Sueca, 24', 'Valencia', 'ES', 39.4589, -0.3746, 'green', v_club_created)
  RETURNING id INTO v_club_id;

  -- 2. The operator is also a member, so the demo club shows up in their own
  -- club switcher and they can walk a prospect through the authed app, not
  -- only the public page.
  SELECT id INTO v_owner_person FROM people WHERE user_id = v_owner_uuid;
  INSERT INTO players (club_id, person_id, category, status)
  VALUES (v_club_id, v_owner_person, 1, 'active');

  -- 3. Twenty fictional members. Avatars come from pravatar.cc — a
  -- placeholder-face service built for exactly this (mockups/demos), not
  -- scraped photos of real people, so there is no consent question.
  FOR i IN 1..array_length(v_member_names, 1) LOOP
    INSERT INTO people (name, avatar_url)
    VALUES (v_member_names[i], 'https://i.pravatar.cc/300?img=' || v_avatar_imgs[i])
    RETURNING id INTO v_person_id;
    INSERT INTO players (club_id, person_id, category, status)
    VALUES (v_club_id, v_person_id, v_member_categories[i], 'active')
    RETURNING id INTO v_player_id;
    v_player_ids := v_player_ids || v_player_id;
  END LOOP;

  -- 4. ~200 casual games over the last 90 days. mode/discipline/scores are
  -- randomised; created_at is what the app sorts and computes Elo by (there
  -- is no played_at yet — that is A5).
  --
  -- Picks by indexing v_player_ids with random(), not `unnest(...) ORDER BY
  -- random() LIMIT n` — the latter looks idiomatic but for n>1 Postgres
  -- reliably returned the SAME n rows on every call here (verified: 15/15
  -- identical picks in isolation), which is exactly what put almost all 200
  -- games between the same two players the first time this was seeded. Plain
  -- array indexing has no such bug — drill_logs below always used it and came
  -- out properly spread.
  v_n := array_length(v_player_ids, 1);
  FOR i IN 1..200 LOOP
    v_is_doubles := random() < 0.15;

    v_p1 := v_player_ids[1 + floor(random() * v_n)::int];
    LOOP
      v_p2 := v_player_ids[1 + floor(random() * v_n)::int];
      EXIT WHEN v_p2 <> v_p1;
    END LOOP;

    IF v_is_doubles THEN
      LOOP
        v_p1b := v_player_ids[1 + floor(random() * v_n)::int];
        EXIT WHEN v_p1b NOT IN (v_p1, v_p2);
      END LOOP;
      LOOP
        v_p2b := v_player_ids[1 + floor(random() * v_n)::int];
        EXIT WHEN v_p2b NOT IN (v_p1, v_p2, v_p1b);
      END LOOP;
    ELSE
      v_p1b := NULL;
      v_p2b := NULL;
    END IF;

    v_race := 5 + floor(random() * 4)::int;       -- winner: 5-8
    v_lose := floor(random() * v_race)::int;      -- loser: 0..(winner-1)
    IF random() < 0.5 THEN v_s1 := v_race; v_s2 := v_lose;
    ELSE v_s1 := v_lose; v_s2 := v_race; END IF;

    v_ts := v_club_created + interval '10 days' + (random() * interval '85 days');

    INSERT INTO games (
      club_id, player_1_id, player_2_id, player_1b_id, player_2b_id,
      player_1_score, player_2_score, mode, discipline, created_at
    ) VALUES (
      v_club_id, v_p1, v_p2, v_p1b, v_p2b,
      v_s1, v_s2,
      (CASE WHEN v_is_doubles THEN 'doubles' ELSE 'single' END)::"GameMode",
      v_disciplines[1 + floor(random() * 4)::int],
      v_ts
    );
  END LOOP;

  -- 5. One finished double-elimination tournament among the 8 category-1
  -- members (v_player_ids[1..8], already in seed order).
  INSERT INTO tournaments (
    club_id, name, format, category, legs, single_from, status,
    discipline, race_to, race_semi, race_final, created_at
  ) VALUES (
    v_club_id, 'Copa de Otoño', 'double_elim', 1, 1, 2, 'done',
    '9ball', 5, 7, 9, v_tour_ts - interval '10 days'
  ) RETURNING id INTO v_tournament_id;

  INSERT INTO tournament_players (tournament_id, player_id)
  SELECT v_tournament_id, v_player_ids[s] FROM generate_series(1, 8) AS s;

  FOR i IN 1..14 LOOP
    v_match_ids[i] := extensions.uuid_generate_v4();
  END LOOP;

  -- Reverse order: every match's winner_to/loser_to points to a match with a
  -- higher index (a later round), and those FKs are NOT DEFERRABLE, so the
  -- target row must already exist. Walking 14 down to 1 guarantees that.
  FOR i IN REVERSE 14..1 LOOP
    INSERT INTO games (
      club_id, player_1_id, player_2_id, player_1_score, player_2_score,
      mode, discipline, created_at
    ) VALUES (
      v_club_id, v_player_ids[v_p1seed[i]], v_player_ids[v_p2seed[i]],
      CASE WHEN v_p1seed[i] = v_winseed[i] THEN v_racev[i] ELSE v_losescore[i] END,
      CASE WHEN v_p2seed[i] = v_winseed[i] THEN v_racev[i] ELSE v_losescore[i] END,
      'single', '9ball', v_tour_ts + (i * interval '12 minutes')
    ) RETURNING id INTO v_game_id;

    INSERT INTO tournament_matches (
      id, tournament_id, bracket, round, slot, p1_id, p2_id, winner_id, game_id,
      winner_to, winner_to_slot, loser_to, loser_to_slot
    ) VALUES (
      v_match_ids[i], v_tournament_id, v_bracket[i], v_round[i], v_slotn[i],
      v_player_ids[v_p1seed[i]], v_player_ids[v_p2seed[i]], v_player_ids[v_winseed[i]], v_game_id,
      CASE WHEN v_wintoidx[i] IS NULL THEN NULL ELSE v_match_ids[v_wintoidx[i]] END, v_wintoslot[i],
      CASE WHEN v_lostoidx[i] IS NULL THEN NULL ELSE v_match_ids[v_lostoidx[i]] END, v_lostoslot[i]
    );

    -- A round of applause on the grand final, from a club-mate who wasn't
    -- in it — v_player_ids[9] is the first category-2 player, a spectator.
    IF v_bracket[i] = 'final' THEN
      INSERT INTO reactions (club_id, author_player_id, game_id, emoji)
      VALUES (v_club_id, v_player_ids[9], v_game_id, '🏆');
      INSERT INTO comments (club_id, author_player_id, game_id, body)
      VALUES (v_club_id, v_player_ids[9], v_game_id,
              'Enhorabuena campeona, menuda final 🏆');
    END IF;
  END LOOP;

  -- 6. Drill logs — a handful of practice sessions against the real global
  -- drill library, spread across the same 90 days.
  FOR i IN 1..35 LOOP
    -- Picks among whichever of v_drill_names actually exist, rather than
    -- indexing the list directly — not every seed file may be applied to
    -- every environment, and a name miss must not insert a NULL drill_id.
    SELECT id, max_score INTO v_drill_id, v_max_score
    FROM drills WHERE name = ANY (v_drill_names) ORDER BY random() LIMIT 1;

    INSERT INTO drill_logs (drill_id, player_id, score, max_score, created_at)
    VALUES (
      v_drill_id,
      v_player_ids[1 + floor(random() * array_length(v_player_ids, 1))::int],
      round(v_max_score * (0.4 + random() * 0.6))::int,
      v_max_score,
      v_club_created + interval '5 days' + (random() * interval '90 days')
    ) RETURNING id INTO v_drill_log_id;

    IF random() < 0.15 THEN
      INSERT INTO comments (club_id, author_player_id, drill_log_id, body)
      SELECT v_club_id, v_player_ids[1 + floor(random() * array_length(v_player_ids, 1))::int],
             v_drill_log_id, v_drill_comments[1 + floor(random() * array_length(v_drill_comments, 1))::int];
    END IF;
  END LOOP;

  -- 7. Feed reactions and comments on the casual games, so the activity feed
  -- reads like a club that talks to itself.
  FOR v_game_id IN
    SELECT id FROM games
    WHERE club_id = v_club_id
      AND id NOT IN (
        SELECT game_id FROM tournament_matches
        WHERE tournament_id = v_tournament_id AND game_id IS NOT NULL
      )
    ORDER BY random() LIMIT 20
  LOOP
    INSERT INTO reactions (club_id, author_player_id, game_id, emoji)
    VALUES (
      v_club_id, v_player_ids[1 + floor(random() * array_length(v_player_ids, 1))::int],
      v_game_id, v_emojis[1 + floor(random() * array_length(v_emojis, 1))::int]
    )
    ON CONFLICT DO NOTHING;

    IF random() < 0.4 THEN
      INSERT INTO comments (club_id, author_player_id, game_id, body)
      VALUES (
        v_club_id, v_player_ids[1 + floor(random() * array_length(v_player_ids, 1))::int],
        v_game_id, v_game_comments[1 + floor(random() * array_length(v_game_comments, 1))::int]
      );
    END IF;
  END LOOP;

  RAISE NOTICE 'demo club % (id %) seeded: % members, % games, 1 tournament (% matches), % drill logs',
    v_slug, v_club_id, array_length(v_player_ids, 1) + 1,
    (SELECT count(*) FROM games WHERE club_id = v_club_id),
    (SELECT count(*) FROM tournament_matches WHERE tournament_id = v_tournament_id),
    (SELECT count(*) FROM drill_logs WHERE player_id = ANY (v_player_ids));
END $demo$ LANGUAGE plpgsql;

COMMIT;
