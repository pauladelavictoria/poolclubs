import type { DailyRankingEntry } from "@/types";
import { CategoryBadge } from "@/components/ui/Ball";
import { ScoreString } from "@/components/ui/ScoreString";
import { useAuth } from "@/hooks/useAuth";
import type { ViewMode } from "./Ranking";
import { useT } from "@/i18n";
import { AppLink } from "@/components/AppLink";

interface RankingTableProps {
  entries: DailyRankingEntry[];
  gamesLabel: string;
  viewMode: ViewMode;
}

/**
 * The ladder. Where a tournament is a few big cards and a game is a small inset
 * pill, a ranking is a dense typographic table with no chrome at all: ruled
 * rows, a spine down the rank column, and the rating as the largest object on
 * the page.
 *
 * The rank is set in mono digits rather than a coloured ball — that is what
 * keeps this from reading as the same component as a tournament's LeagueTable,
 * which keeps the balls because inside a draw the top three *are* a podium.
 * Here the number is a position on a long list, so it is written, not awarded.
 */
export default function RankingTable({
  entries,
  gamesLabel,
  viewMode,
}: RankingTableProps) {
  const { player } = useAuth();
  const { t } = useT();

  return (
    <table className="w-full">
      <caption className="sr-only">{t("ranking.standings")}</caption>
      <thead>
        <tr className="text-caption font-medium uppercase tracking-[0.08em] text-ink-faint">
          {/* The spine. A rule down the rank column is what makes a list of
              names read as an ordered ladder rather than as a grid of facts. */}
          <th
            scope="col"
            className="w-12 border-r border-hairline py-2 pl-4 pr-3 text-right font-medium"
          >
            #
          </th>
          {/* Its own column, not a tail on the name: a left-anchored strip of
              divisions can be scanned down, an inline badge can't. */}
          {viewMode === "combined" && (
            <th
              scope="col"
              className="w-14 py-2 pl-3 pr-3 text-left font-medium"
            >
              {t("ranking.categoryShort")}
            </th>
          )}
          <th scope="col" className="py-2 pl-3 text-left font-medium">
            {t("ranking.player")}
          </th>
          <th
            scope="col"
            className="hidden py-2 pr-6 text-right font-medium md:table-cell"
          >
            {t("ranking.won")}
          </th>
          <th
            scope="col"
            className="hidden py-2 text-right font-medium sm:table-cell"
          >
            {gamesLabel}
          </th>
          <th scope="col" className="py-2 pr-4 text-right font-medium">
            {t("ranking.points")}
          </th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry, index) => (
          <tr
            key={entry.playerId}
            className={`border-b border-hairline transition-colors duration-150 last:border-0 hover:bg-felt-raised ${
              // Your own row is lifted, not tinted: being yours is not
              // something to act on, and yellow is what "act" means here.
              entry.playerId === player?.id ? "bg-felt-raised" : ""
            }`}
          >
            <td className="w-12 border-r border-hairline py-2 pl-4 pr-3 text-right">
              <span
                className={`font-mono text-body tabular-nums ${
                  index < 3 ? "font-semibold text-ink" : "text-ink-faint"
                }`}
              >
                {index + 1}
              </span>
            </td>

            {viewMode === "combined" && (
              <td className="py-2 pl-3 pr-3">
                <CategoryBadge category={entry.category} />
              </td>
            )}

            <td className="py-2 pl-3 pr-3">
              <AppLink
                to="/app/$clubSlug/players/$playerId"
                params={{ playerId: entry.playerId }}
                className={`block truncate text-ink transition-colors duration-150 hover:text-strike ${
                  entry.playerId === player?.id
                    ? "font-semibold"
                    : "font-medium"
                }`}
              >
                {entry.playerName}
              </AppLink>
              {/* Form drops under the name once the column is gone */}
              <div className="mt-1 sm:hidden">
                <ScoreString results={entry.last10Games ?? []} />
              </div>
            </td>

            <td className="hidden py-2 pr-6 text-right md:table-cell">
              <span className="font-mono text-caption tabular-nums text-ink-faint">
                {entry.gamesWon}
                <span className="text-ink-ghost">/{entry.gamesPlayed}</span>
              </span>
            </td>

            <td className="hidden py-2 text-right sm:table-cell">
              <ScoreString results={entry.last10Games ?? []} />
            </td>

            {/* The one figure the whole page exists to show, so it is the
                largest thing on it. */}
            <td className="py-2 pr-4 text-right">
              <span className="font-mono text-h3 font-semibold tabular-nums text-ink">
                {entry.points}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
