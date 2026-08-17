-- =============================================
-- A5 — played_at on games (docs/marketing-plan.md)
-- =============================================
--
-- games only ever had created_at — when the row was written, not when the
-- match happened. That is fine until a club wants to load its notebook from
-- last season: every one of those results would land on today's ranking and
-- today's Elo instead of its own day. played_at is the column that separates
-- "when I typed this in" from "when the balls were actually potted."
--
-- created_at stays. It keeps its original job — row insertion time, an audit
-- fact — and nothing in the app should read it for chronology any more; every
-- call site that did has been repointed at played_at in this same change.
--
-- Backfilled from created_at because that is the best guess available for
-- history recorded before this column existed: those games are their own
-- insertion time, same as they read today.
--
-- Apply with `npm run db:sql sql/game-played-at.sql`, then `npm run db:dump`
-- and `npm run db:types` (db:dump needs Docker; if it is not available,
-- sql/schema.sql has to be hand-edited to match — see the comment at the
-- bottom of this file for exactly what changed).

BEGIN;

ALTER TABLE games ADD COLUMN played_at timestamptz;

UPDATE games SET played_at = created_at;

ALTER TABLE games ALTER COLUMN played_at SET NOT NULL;
ALTER TABLE games ALTER COLUMN played_at SET DEFAULT now();

-- Replaces games_club_idx: every list/filter/Elo read is now ordered by
-- played_at, so that is the column worth an index on (club_id, _ desc).
DROP INDEX IF EXISTS games_club_idx;
CREATE INDEX games_club_played_idx ON games USING btree (club_id, played_at DESC);

COMMIT;

-- ---------------------------------------------------------------------------
-- Hand-edit checklist for sql/schema.sql if `npm run db:dump` cannot run
-- (needs Docker): add `"played_at" timestamp with time zone DEFAULT "now"()
-- NOT NULL` to the games CREATE TABLE, and replace the games_club_idx line
-- with `CREATE INDEX "games_club_played_idx" ON "public"."games" USING
-- "btree" ("club_id", "played_at" DESC);`.
-- ---------------------------------------------------------------------------
