-- How far the double elimination goes.
--
-- Apply with `npm run db:sql sql/tournament-single-from.sql`, then
-- `npm run db:dump` and `npm run db:types`. See sql/README.md — schema.sql is
-- the source of truth, this file is the change that produced it.
--
-- `single_from` is the number of players left when the two brackets merge into
-- one single-elimination stage. 2 is the grand final, which is a full
-- double-elimination draw and the default; 16 is the shape a lot of pool events
-- run — two lives until the last 16, one after it. A value at or above the
-- padded field size means the whole draw is single elimination, which the
-- bracket builder clamps to rather than rejecting.
--
-- Only `double_elim` reads it. It is left unconstrained against `format`
-- (unlike `advance`) because the default is also the answer for every other
-- format: a league and a group phase merge nothing.

ALTER TABLE public.tournaments
    ADD COLUMN IF NOT EXISTS single_from smallint NOT NULL DEFAULT 2;

ALTER TABLE public.tournaments
    DROP CONSTRAINT IF EXISTS tournaments_single_from_check;

ALTER TABLE public.tournaments
    ADD CONSTRAINT tournaments_single_from_check
        CHECK (single_from = ANY (ARRAY[2, 4, 8, 16, 32]));
