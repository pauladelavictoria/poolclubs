-- =============================================
-- games.player_*_id — ON DELETE CASCADE
-- =============================================
--
-- Removing a member is supposed to take their matches and drill logs with
-- them — that's what the confirm dialog already tells the admin
-- ("Sus partidos y resultados de ejercicios se borran también", see
-- club.removeConfirm in src/i18n) and what the comment in useClub.tsx's
-- removeMember says. drill_logs really does cascade. games never did: its
-- four player_*_id foreign keys were added with no ON DELETE clause, which
-- defaults to NO ACTION. So deleting a player who has ever recorded a match
-- fails outright with a 23503 foreign key violation, and nothing about that
-- player — including their pending challenges — actually goes away.
--
-- A game with a NOT NULL player_1_id/player_2_id makes SET NULL a bigger
-- change than this needs (and would leave half a match on the board); CASCADE
-- is what the existing confirm copy already promises, so this makes the
-- schema match it. Deleting the game row then cascades on down the chain
-- that's already wired for it: comments/reactions on that game (ON DELETE
-- CASCADE), and the game_id on any challenge or tournament_matches row that
-- pointed at it (ON DELETE SET NULL — the challenge/fixture survives, just
-- forgets which game settled it).
--
-- Postgres has no ALTER ... ON DELETE; each constraint has to be dropped and
-- re-added. ON UPDATE CASCADE is preserved on the two that already had it.
--
-- Apply with `npm run db:sql sql/games-player-delete-cascade.sql`, then
-- `npm run db:dump` and `npm run db:types` (db:dump needs Docker; if it is
-- not available, sql/schema.sql has to be hand-edited to match — see the
-- comment at the bottom of this file for exactly what changed).

BEGIN;

ALTER TABLE games DROP CONSTRAINT games_player_1_id_fkey;
ALTER TABLE games
    ADD CONSTRAINT games_player_1_id_fkey FOREIGN KEY (player_1_id)
    REFERENCES players(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE games DROP CONSTRAINT games_player_2_id_fkey;
ALTER TABLE games
    ADD CONSTRAINT games_player_2_id_fkey FOREIGN KEY (player_2_id)
    REFERENCES players(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE games DROP CONSTRAINT games_player_1b_id_fkey;
ALTER TABLE games
    ADD CONSTRAINT games_player_1b_id_fkey FOREIGN KEY (player_1b_id)
    REFERENCES players(id) ON DELETE CASCADE;

ALTER TABLE games DROP CONSTRAINT games_player_2b_id_fkey;
ALTER TABLE games
    ADD CONSTRAINT games_player_2b_id_fkey FOREIGN KEY (player_2b_id)
    REFERENCES players(id) ON DELETE CASCADE;

COMMIT;

-- ---------------------------------------------------------------------------
-- Hand-edit checklist for sql/schema.sql if `npm run db:dump` cannot run
-- (needs Docker): in the four ALTER TABLE ONLY "public"."games" ADD
-- CONSTRAINT "games_player_*_fkey" statements, append " ON DELETE CASCADE"
-- to each (keeping the existing " ON UPDATE CASCADE" on player_1_id and
-- player_2_id).
-- ---------------------------------------------------------------------------
