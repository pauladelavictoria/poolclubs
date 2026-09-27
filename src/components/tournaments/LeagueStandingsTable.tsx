import { BallBadge } from "@/components/ui/BallBadge";
import { CategoryBadge } from "@/components/ui/CategoryBadge";
import type { Standing } from "@/libs/algorithms/leagueTable";
import { type Category } from "@/types";
import { useT } from "@/i18n";
import PlayerLink from "@/components/players/PlayerLink";

export type CategoryOf = (id: number) => Category | null | undefined;

/** The table itself. Split out so a combined draw can render one per division
 *  without the two layouts drifting apart. */
export function LeagueStandingsTable({
  rows,
  nameOf,
  slugOf,
  categoryOf,
  qualify,
  showPoints,
  open,
  setOpen,
}: {
  rows: Standing[];
  nameOf: (id: number) => string;
  slugOf?: (id: number) => string | undefined;
  categoryOf?: CategoryOf;
  qualify: number;
  showPoints: boolean;
  open: number | null;
  setOpen: (id: number | null) => void;
}) {
  const { t } = useT();
  // The one number the row is ranked on, which is the one that can't be folded
  // away on a phone: points where a league keeps them, wins in a group table,
  // which has none.
  const tail = showPoints ? "" : "hidden sm:table-cell";

  return (
    <table className="w-full">
      <caption className="sr-only">{t("tournaments.standings")}</caption>
      <thead>
        <tr className="text-caption font-medium uppercase tracking-[0.08em] text-ink-faint">
          <th scope="col" className="w-14 py-2 pl-4 pr-3 text-left font-medium">
            #
          </th>
          <th scope="col" className="py-2 pr-3 text-left font-medium">
            {t("ranking.player")}
          </th>
          {/* Below `sm` the row keeps only what a standing is: who, and how
              many. The working behind the number is a tap away rather than a
              column squeezed to three characters. */}
          {categoryOf && (
            <th
              scope="col"
              className="hidden py-2 pr-3 text-left font-medium sm:table-cell"
            >
              {t("tournaments.category")}
            </th>
          )}
          <th
            scope="col"
            className="hidden py-2 pr-3 text-right font-medium sm:table-cell"
          >
            {t("tournaments.played")}
          </th>
          <th
            scope="col"
            className="hidden py-2 pr-3 text-right font-medium sm:table-cell"
          >
            {t("tournaments.racks")}
          </th>
          <th
            scope="col"
            className={`py-2 pr-4 text-right font-medium ${tail}`}
          >
            {t("tournaments.wins")}
          </th>
          {showPoints && (
            <th scope="col" className="py-2 pr-4 text-right font-medium">
              {t("tournaments.points")}
            </th>
          )}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => {
          const expanded = open === row.playerId;
          return [
            <tr
              key={row.playerId}
              // A row is a row, not a button: aria-expanded is allowed on
              // role=row, which is what a <tr> already is, so the disclosure
              // needs no wrapper element that a table can't hold anyway.
              aria-expanded={expanded}
              tabIndex={0}
              onClick={() => setOpen(expanded ? null : row.playerId)}
              onKeyDown={(e) => {
                if (e.key !== "Enter" && e.key !== " ") return;
                e.preventDefault();
                setOpen(expanded ? null : row.playerId);
              }}
              className={[
                "cursor-pointer transition-colors duration-150 hover:bg-felt-raised has-[[data-highlight]]:bg-strike-tint sm:cursor-default",
                // The cut, drawn where it actually falls rather than as a badge
                // on each qualifying row. In the tournament's own colour: where
                // the line lands is a fact about the draw, not something anyone
                // can act on. Suppressed under an open row, where the line
                // would fall between a row and its own detail.
                qualify > 0 && index === qualify - 1 && !expanded
                  ? "border-b-2 border-strike"
                  : "",
              ].join(" ")}
            >
              <td className="py-2.5 pl-4 pr-3">
                <BallBadge rank={index + 1} />
              </td>
              <td className="py-2.5 pr-3">
                <PlayerLink
                  playerId={row.playerId}
                  playerSlug={slugOf?.(row.playerId)}
                  // A tap on a name follows the player; it doesn't also unfold
                  // the row underneath it.
                  onClick={(e) => e.stopPropagation()}
                  className="block max-w-[10rem] truncate font-medium text-ink transition-colors duration-150 hover:text-strike sm:max-w-none"
                >
                  {nameOf(row.playerId)}
                </PlayerLink>
              </td>
              {categoryOf && (
                <td className="hidden py-2.5 pr-3 sm:table-cell">
                  {categoryOf(row.playerId) && (
                    <CategoryBadge category={categoryOf(row.playerId)!} />
                  )}
                </td>
              )}
              <td className="hidden py-2.5 pr-3 text-right sm:table-cell">
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
              <td className={`py-2.5 pr-4 text-right ${tail}`}>
                <span className="font-mono text-h4 font-semibold tabular-nums text-ink">
                  {row.wins}
                </span>
              </td>
              {showPoints && (
                <td className="py-2.5 pr-4 text-right">
                  <span className="font-mono text-h4 font-semibold tabular-nums text-strike">
                    {row.points}
                  </span>
                </td>
              )}
            </tr>,
            expanded ? (
              <tr key={`${row.playerId}-detail`} className="sm:hidden">
                <td colSpan={3} className="pb-3 pl-4 pr-4">
                  <dl className="flex flex-wrap gap-x-6 gap-y-1 text-caption text-ink-faint">
                    {categoryOf?.(row.playerId) && (
                      <div className="flex items-center gap-2">
                        <dt>{t("tournaments.category")}</dt>
                        <dd>
                          <CategoryBadge category={categoryOf(row.playerId)!} />
                        </dd>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <dt>{t("tournaments.played")}</dt>
                      <dd className="font-mono tabular-nums text-ink">
                        {row.played}
                      </dd>
                    </div>
                    {showPoints && (
                      <div className="flex items-center gap-2">
                        <dt>{t("tournaments.wins")}</dt>
                        <dd className="font-mono tabular-nums text-ink">
                          {row.wins}
                        </dd>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <dt>{t("tournaments.racks")}</dt>
                      <dd className="font-mono tabular-nums text-ink">
                        {row.racksWon}
                        <span className="text-ink-ghost">/{row.racksLost}</span>
                      </dd>
                    </div>
                  </dl>
                </td>
              </tr>
            ) : null,
          ];
        })}
      </tbody>
    </table>
  );
}
