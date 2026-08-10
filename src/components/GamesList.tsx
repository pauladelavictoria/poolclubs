import type { Game } from "@/types";
import React from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import SocialBar from "@/components/SocialBar";
import { LuSwords } from "react-icons/lu";
import { dayLabel } from "@/libs/dayLabel";
import { useT } from "@/i18n";

interface GamesListProps {
  games: Game[];
  playerName?: string;
  showDates?: boolean;
  /** Off for the TV board, which nobody is standing close enough to tap. */
  showSocial?: boolean;
}

/**
 * A result is a score. The figure is the focal element — mono, tabular, large
 * enough to read at arm's length in a dim room. The winning side gets the
 * weight; the losing side is demoted rather than marked in red, because red
 * means "act" everywhere else in this app.
 */
export default function GamesList({
  games,
  playerName,
  showDates,
  showSocial = true,
}: GamesListProps) {
  const { t, locale } = useT();

  const timeFmt = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });

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
    <div className="space-y-1.5">
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

        const p1Score = parseInt(player_1_score, 10) || 0;
        const p2Score = parseInt(player_2_score, 10) || 0;
        const p1Won = p1Score > p2Score;
        const p2Won = p2Score > p1Score;

        // On a player's own page, mark the frames they took. Losses are simply
        // left plain — absence reads as loss without spending a second colour.
        let accent = "border-hairline";
        if (playerName) {
          const inTeam1 =
            player_1_name === playerName || player_1b_name === playerName;
          const inTeam2 =
            player_2_name === playerName || player_2b_name === playerName;
          if ((inTeam1 && p1Won) || (inTeam2 && p2Won)) {
            accent = "border-hairline border-l-2 border-l-pot";
          }
        }

        const date = new Date(created_at);
        const day = date.toDateString();
        const newDate =
          index === 0 ||
          day !== new Date(games[index - 1].created_at).toDateString();

        const side = (won: boolean) =>
          won ? "font-semibold text-ink" : "text-ink-faint";

        return (
          <React.Fragment key={id}>
            {showDates && newDate && (
              <h3 className="px-1 pb-1 pt-5 text-caption font-medium uppercase tracking-[0.08em] text-ink-faint first:pt-0">
                {dayLabel(date, t, locale)}
              </h3>
            )}
            <div
              className={`flex items-center gap-3 rounded-control border bg-pocket px-3 py-2.5 transition-colors duration-150 hover:bg-felt-raised ${accent}`}
            >
              <time
                dateTime={created_at}
                className="hidden w-10 shrink-0 font-mono text-caption tabular-nums text-ink-ghost sm:block"
              >
                {timeFmt.format(date)}
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
              <span className="hidden w-10 shrink-0 text-right text-caption font-medium text-ink-ghost sm:block">
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
