import type { Game } from "@/types";
import React from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import SocialBar from "@/components/SocialBar";
import { LuSwords } from "react-icons/lu";
import { dayLabel, startsNewDay, timeOf } from "@/libs/dayLabel";
import { useT } from "@/i18n";

interface GamesListProps {
  games: Game[];
  /** Whose page this is, if anyone's — their won frames get the accent. By id,
   *  because the names on a row are a copy from when it was written. */
  playerId?: number;
  showDates?: boolean;
  /** Off for the TV board, which nobody is standing close enough to tap. */
  showSocial?: boolean;
  /**
   * Pin the day headings under the app bar while their frames scroll past.
   * Only on a page where this list is the page — sticky does nothing inside an
   * `overflow-hidden` card, so it stays off by default.
   */
  stickyDates?: boolean;
}

/**
 * The tape: what the club played, newest first, at the tightest rhythm in the
 * app. There are thousands of these and each one is a single fact, so the row
 * is a small inset pill rather than a card — the surface goes *down* from the
 * page, which is what stops a result reading like a tournament or a drill.
 *
 * A result is a score. The figure is the focal element — mono, tabular, large
 * enough to read at arm's length in a dim room. The winning side gets the
 * weight; the losing side is demoted rather than marked in red, because red
 * means "act" everywhere else in this app.
 */
export default function GamesList({
  games,
  playerId,
  showDates,
  showSocial = true,
  stickyDates = false,
}: GamesListProps) {
  const { t, locale } = useT();

  if (!games || games.length === 0) {
    return (
      <EmptyState
        icon={<LuSwords className="h-5 w-5" />}
        title={t("games.emptyTitle")}
        hint={t("games.emptyHint")}
      />
    );
  }

  return (
    <div className="space-y-1">
      {games.map((game, index) => {
        const {
          id,
          player_1_name,
          player_1_score,
          player_2_score,
          player_2_name,
          player_1b_name,
          player_2b_name,
          mode,
          created_at,
        } = game;

        const isDoubles = mode === "doubles";
        const team1 = isDoubles
          ? `${player_1_name} / ${player_1b_name}`
          : player_1_name;
        const team2 = isDoubles
          ? `${player_2_name} / ${player_2b_name}`
          : player_2_name;

        // bigint columns, so these arrive as numbers
        const p1Score = player_1_score;
        const p2Score = player_2_score;
        const p1Won = p1Score > p2Score;
        const p2Won = p2Score > p1Score;

        // On a player's own page, mark the frames they took. Losses are simply
        // left plain — absence reads as loss without spending a second colour.
        let accent = "border-hairline";
        if (playerId) {
          const inTeam1 =
            game.player_1_id === playerId || game.player_1b_id === playerId;
          const inTeam2 =
            game.player_2_id === playerId || game.player_2b_id === playerId;
          if ((inTeam1 && p1Won) || (inTeam2 && p2Won)) {
            accent = "border-hairline border-l-2 border-l-pot";
          }
        }

        const date = new Date(created_at);
        const newDate = startsNewDay(
          date,
          index > 0 ? new Date(games[index - 1].created_at) : undefined,
        );

        const side = (won: boolean) =>
          won ? "font-semibold text-ink" : "text-ink-faint";

        return (
          <React.Fragment key={id}>
            {showDates && newDate && (
              // A day is a rule across the tape, not a card header. 3.5rem is
              // the app bar; the env() term is the notch the bar itself clears.
              <h3
                className={[
                  "px-2 pb-1.5 pt-5 text-caption font-medium uppercase tracking-[0.08em] text-mark-games first:pt-0",
                  stickyDates
                    ? "sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-10 -mx-1 border-b border-hairline bg-pocket/90 backdrop-blur-sm"
                    : "",
                ].join(" ")}
              >
                {dayLabel(date, t, locale)}
              </h3>
            )}
            <div
              className={`flex items-center gap-3 rounded-control border bg-pocket px-3 py-2 transition-colors duration-150 hover:bg-felt-raised ${accent}`}
            >
              <time
                dateTime={created_at}
                className="hidden w-12 shrink-0 font-mono text-caption tabular-nums text-ink-ghost sm:block"
              >
                {timeOf(date, locale)}
              </time>
              <span className={`flex-1 truncate text-right ${side(p1Won)}`}>
                {team1}
              </span>
              <span className="shrink-0 font-mono text-h4 font-semibold tabular-nums">
                <span className={p1Won ? "text-ink" : "text-ink-faint"}>
                  {p1Score}
                </span>
                <span className="px-1 text-ink-ghost">-</span>
                <span className={p2Won ? "text-ink" : "text-ink-faint"}>
                  {p2Score}
                </span>
              </span>
              <span className={`flex-1 truncate ${side(p2Won)}`}>{team2}</span>
              <span className="hidden w-12 shrink-0 text-right text-caption font-medium text-ink-ghost sm:block">
                {isDoubles ? "2v2" : ""}
              </span>
            </div>
            {showSocial && <SocialBar target={{ gameId: id }} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}
