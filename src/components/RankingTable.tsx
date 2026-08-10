import type { DailyRankingEntry } from "@/types";
import { Link } from "react-router-dom";
import { BallBadge, CategoryBadge } from "@/components/ui/Ball";
import { ScoreString } from "@/components/ui/ScoreString";
import { useAuth } from "@/hooks/useAuth";
import type { ViewMode } from "./Ranking";
import { useT } from "@/i18n";

interface RankingTableProps {
  entries: DailyRankingEntry[];
  gamesLabel: string;
  viewMode: ViewMode;
}

/**
 * The rating is the focal element: mono, tabular, heaviest thing in the row.
 * Name sits one tier below it, form and division are metadata. Rows are
 * separated by space and hover, not by a hairline under every one.
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
          {/* 16 padding + 28 ball + 12 gap. At w-11 the cell was exactly the
              ball, so the name sat flush against it. */}
          <th scope="col" className="w-14 py-2 pl-4 pr-3 text-left font-medium">
            #
          </th>
          {/* Its own column, not a tail on the name: a left-anchored strip of
              divisions can be scanned down, an inline badge can't. */}
          {viewMode === "combined" && (
            <th scope="col" className="w-14 py-2 pr-3 text-left font-medium">
              {t("ranking.categoryShort")}
            </th>
          )}
          <th scope="col" className="py-2 text-left font-medium">
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
            className={`transition-colors duration-150 hover:bg-felt-raised ${
              entry.playerId === player?.id ? "bg-strike-tint" : ""
            }`}
          >
            <td className="py-2.5 pl-4 pr-3">
              <BallBadge rank={index + 1} />
            </td>

            {viewMode === "combined" && (
              <td className="py-2.5 pr-3">
                <CategoryBadge category={entry.category} />
              </td>
            )}

            <td className="py-2.5 pr-3">
              <Link
                to={`/app/players/${entry.playerId}`}
                className="block truncate font-medium text-ink transition-colors duration-150 hover:text-strike"
              >
                {entry.playerName}
              </Link>
              {/* Form drops under the name once the column is gone */}
              <div className="mt-1 sm:hidden">
                <ScoreString results={entry.last10Games ?? []} />
              </div>
            </td>

            <td className="hidden py-2.5 pr-6 text-right md:table-cell">
              <span className="font-mono text-caption tabular-nums text-ink-faint">
                {entry.gamesWon}
                <span className="text-ink-ghost">/{entry.gamesPlayed}</span>
              </span>
            </td>

            <td className="hidden py-2.5 text-right sm:table-cell">
              <ScoreString results={entry.last10Games ?? []} />
            </td>

            <td className="py-2.5 pr-4 text-right">
              <span className="font-mono text-h4 font-semibold tabular-nums text-ink">
                {entry.points}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
