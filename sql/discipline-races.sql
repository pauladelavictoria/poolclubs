-- Which game is being played, and how long a tournament match runs for.
--
-- Apply with `npm run db:sql sql/discipline-races.sql`, then `npm run db:dump`
-- and `npm run db:types`. See sql/README.md.
--
-- Two separate ideas that arrive together:
--   * `discipline` — 8-ball, 9-ball or 10-ball. Every game has one; a
--     tournament is played in exactly one of them.
--   * race length — a tournament match is won by reaching a fixed number of
--     racks. It is stored on the tournament rather than on each match, because
--     the number of rounds is not known until the draw is made: the race for a
--     given match is derived from how far through the draw it sits
--     (src/libs/bracket.ts, raceFor).

-- A real enum like "GameMode", so the generated types come through narrowed.
CREATE TYPE public."Discipline" AS ENUM ('8ball', '9ball', '10ball');


-- Existing rows are backfilled by the default: the club has been playing
-- 9-ball, and nothing recorded before today says otherwise.
ALTER TABLE public.games
    ADD COLUMN discipline public."Discipline" NOT NULL DEFAULT '9ball';


ALTER TABLE public.tournaments
    ADD COLUMN discipline public."Discipline" NOT NULL DEFAULT '9ball',
    -- The race every match runs to unless it is one of the two below.
    ADD COLUMN race_to smallint NOT NULL DEFAULT 5,
    -- Optional longer races for the closing stages. NULL means "same as
    -- race_to". Named by stage rather than by round number because a round
    -- number means nothing until the field size is known, whereas "the final"
    -- is something an organiser can decide on the day they open entries.
    ADD COLUMN race_semi smallint,
    ADD COLUMN race_final smallint,
    ADD CONSTRAINT tournaments_race_to_check
        CHECK (race_to BETWEEN 1 AND 50),
    ADD CONSTRAINT tournaments_race_semi_check
        CHECK (race_semi IS NULL OR race_semi BETWEEN 1 AND 50),
    ADD CONSTRAINT tournaments_race_final_check
        CHECK (race_final IS NULL OR race_final BETWEEN 1 AND 50);
