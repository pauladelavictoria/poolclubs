import { useState } from "react";
import { BallBadge, CategoryBadge } from "@/components/ui/Ball";
import { CardHeader } from "@/components/ui/Card";
import { Segmented } from "@/components/ui/Segmented";
import type { ViewMode } from "@/components/ranking/Ranking";
import type { Standing } from "@/libs/algorithms/leagueTable";
import { CATEGORIES, type Category } from "@/types";
import { useT } from "@/i18n";
import ResultsGrid from "@/components/tournaments/ResultsGrid";
import type { ResultMatch } from "@/libs/algorithms/leagueTable";
import PlayerLink from "@/components/players/PlayerLink";

type CategoryOf = (id: number) => Category | null | undefined;

/**
 * The table a round robin produces. One of these for a league, one per group
 * for a group tournament — which is why `qualify` is a count rather than a
 * flag: it draws the line the bracket is cut at.
 *
 * Where the draw is a combined one, the same choice the ranking offers is
 * offered here: one table, or one per division. The two answer different
 * questions — who is winning the league, and who is winning their own division
 * — and a combined league is the only place both are live at once.
 */
export default function LeagueTable({
  rows,
  title,
  nameOf,
  slugOf,
  categoryOf,
  qualify = 0,
  showPoints = false,
  matches,
}: {
  rows: Standing[];
  /** The card's own heading, rendered here rather than by the caller so the
   *  divisions toggle can share its row instead of taking a strip of its own
   *  underneath. Omitted by the group tables, which have no toggle. */
  title?: React.ReactNode;
  nameOf: (id: number) => string;
  /** The person's slug for each id, for the public side's /players/:slug
   *  links. Omitted inside a club, where PlayerLink uses the club route. */
  slugOf?: (id: number) => string | undefined;
  /** Each entrant's own category, shown only where the tournament itself sets
   *  no single category — a combined draw is the one case where two rows here
   *  can be playing under different rules. */
  categoryOf?: CategoryOf;
  /** How many of the top places go through. 0 for a plain league. */
  qualify?: number;
  /** A league has its own points column; a group table has no points config of
   *  its own, so it stays off rather than show everyone tied at 0. */
  showPoints?: boolean;
  /** The fixtures behind the table. Given, the card offers the results grid
   *  beside it — see ResultsGrid. */
  matches?: (ResultMatch & { round: number })[];
}) {
  const { t } = useT();
  const [view, setView] = useState<ViewMode>("combined");
  const [shape, setShape] = useState<"table" | "grid">("table");
  // Which row is open on a phone. One at a time: the table is a ladder, and a
  // ladder with four rows unfolded is no longer one. Ignored from `sm` up,
  // where every column is on screen anyway. It lives out here so a row stays
  // open across a switch of view — the id is the same row either way.
  const [open, setOpen] = useState<number | null>(null);

  // Only the divisions actually playing, in their own order. One of them means
  // a combined draw that happens to have drawn one division, which is not a
  // choice worth offering.
  const divisions = categoryOf
    ? CATEGORIES.filter((cat) =>
        rows.some((r) => categoryOf(r.playerId) === cat),
      )
    : [];

  const grid = matches && shape === "grid";
  // The grid is always the whole field: the divisions split the table only.
  const split = divisions.length >= 2 && !grid;

  const table = (subset: Standing[], perDivision: boolean) => (
    <StandingsTable
      rows={subset}
      nameOf={nameOf}
      slugOf={slugOf}
      // Split out, the badge on every row would say what the heading above it
      // already says.
      categoryOf={perDivision ? undefined : categoryOf}
      qualify={perDivision ? 0 : qualify}
      showPoints={showPoints}
      open={open}
      setOpen={setOpen}
    />
  );

  const shapeToggle = matches && (
    <Segmented
      className="max-sm:w-full max-sm:*:flex-1 max-sm:*:justify-center"
      label={t("tournaments.view")}
      value={shape}
      onChange={setShape}
      options={[
        { value: "table", label: t("tournaments.standings") },
        { value: "grid", label: t("tournaments.resultsGrid") },
      ]}
    />
  );
  const divisionToggle = split && (
    <Segmented
      className="max-sm:w-full max-sm:*:flex-1 max-sm:*:justify-center"
      label={t("ranking.view")}
      value={view}
      onChange={setView}
      options={[
        { value: "combined", label: t("ranking.combined") },
        { value: "byCategory", label: t("ranking.byCategory") },
      ]}
    />
  );

  return (
    <>
      {(title || shapeToggle || divisionToggle) && (
        <CardHeader
          title={title}
          action={
            (shapeToggle || divisionToggle) && (
              <div className="flex flex-wrap justify-end gap-2 max-sm:w-full">
                {shapeToggle}
                {divisionToggle}
              </div>
            )
          }
        />
      )}

      {grid ? (
        <ResultsGrid
          players={rows.map((r) => r.playerId)}
          matches={matches}
          nameOf={nameOf}
          slugOf={slugOf}
        />
      ) : !split || view === "combined" ? (
        table(rows, false)
      ) : (
        <div className="divide-y divide-hairline">
          {divisions.map((cat) => {
            const subset = rows.filter((r) => categoryOf!(r.playerId) === cat);
            return (
              <section key={cat}>
                <div className="flex items-center justify-between gap-3 border-b border-hairline px-4 pb-2 pt-4">
                  <h3 className="text-h3 font-semibold text-strike">
                    {t(`category.${cat}`)}
                  </h3>
                  <span className="font-mono text-caption tabular-nums text-ink-faint">
                    {t("ranking.playersCount", { n: subset.length })}
                  </span>
                </div>
                {table(subset, true)}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}

/** The table itself. Split out so a combined draw can render one per division
 *  without the two layouts drifting apart. */
function StandingsTable({
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
