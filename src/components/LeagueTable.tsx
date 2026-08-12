import { Link } from "react-router-dom";
import { BallBadge } from "@/components/ui/Ball";
import type { Standing } from "@/libs/leagueTable";
import { useT } from "@/i18n";

/**
 * The table a round robin produces. One of these for a league, one per group
 * for a group tournament — which is why `qualify` is a count rather than a
 * flag: it draws the line the bracket is cut at.
 */
export default function LeagueTable({
  rows,
  nameOf,
  qualify = 0,
}: {
  rows: Standing[];
  nameOf: (id: number) => string;
  /** How many of the top places go through. 0 for a plain league. */
  qualify?: number;
}) {
  const { t } = useT();

  return (
    <table className="w-full">
      <caption className="sr-only">{t("tournaments.standings")}</caption>
      <thead>
        <tr className="text-caption font-medium uppercase tracking-[0.08em] text-ink-faint">
          <th scope="col" className="w-14 py-2 pl-4 pr-3 text-left font-medium">
            #
          </th>
          <th scope="col" className="py-2 text-left font-medium">
            {t("ranking.player")}
          </th>
          <th scope="col" className="py-2 pr-3 text-right font-medium">
            {t("tournaments.played")}
          </th>
          <th
            scope="col"
            className="hidden py-2 pr-3 text-right font-medium sm:table-cell"
          >
            {t("tournaments.racks")}
          </th>
          <th scope="col" className="py-2 pr-4 text-right font-medium">
            {t("tournaments.wins")}
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr
            key={row.playerId}
            className={[
              "transition-colors duration-150 hover:bg-felt-raised",
              // The cut, drawn where it actually falls rather than as a badge
              // on each qualifying row. In the tournament's own colour: where
              // the line lands is a fact about the draw, not something anyone
              // can act on.
              qualify > 0 && index === qualify - 1
                ? "border-b-2 border-mark-tournaments"
                : "",
            ].join(" ")}
          >
            <td className="py-2.5 pl-4 pr-3">
              <BallBadge rank={index + 1} />
            </td>
            <td className="py-2.5 pr-3">
              <Link
                to={`/app/players/${row.playerId}`}
                className="block truncate font-medium text-ink transition-colors duration-150 hover:text-strike"
              >
                {nameOf(row.playerId)}
              </Link>
            </td>
            <td className="py-2.5 pr-3 text-right">
              <span className="font-mono text-caption tabular-nums text-ink-faint">
                {row.played}
              </span>
            </td>
            <td className="hidden py-2.5 pr-3 text-right sm:table-cell">
              <span className="font-mono text-caption tabular-nums text-ink-faint">
                {row.racksWon}
                <span className="text-ink-ghost">/{row.racksLost}</span>
              </span>
            </td>
            <td className="py-2.5 pr-4 text-right">
              <span className="font-mono text-h4 font-semibold tabular-nums text-ink">
                {row.wins}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
