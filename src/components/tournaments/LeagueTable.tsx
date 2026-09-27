import { useState } from "react";
import { LuGrid3X3, LuListOrdered, LuTrendingUp } from "react-icons/lu";
import { CardHeader } from "@/components/ui/CardHeader";
import { Segmented } from "@/components/ui/Segmented";
import type { ViewMode } from "@/components/ranking/Ranking";
import type { Standing } from "@/libs/algorithms/leagueTable";
import { CATEGORIES } from "@/types";
import { useT } from "@/i18n";
import ResultsGrid from "@/components/tournaments/ResultsGrid";
import StandingsChart from "@/components/tournaments/StandingsChart";
import type { LeaguePoints, ResultMatch } from "@/libs/algorithms/leagueTable";
import { type CategoryOf, LeagueStandingsTable } from "./LeagueStandingsTable";

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
  points,
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
  /** The league's scoring, so the chart can replay the table the same way. */
  points?: LeaguePoints;
}) {
  const { t } = useT();
  const [view, setView] = useState<ViewMode>("combined");
  const [shape, setShape] = useState<"table" | "grid" | "chart">("table");
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
  const chart = matches && shape === "chart";
  const split = divisions.length >= 2;

  const table = (subset: Standing[], perDivision: boolean) =>
    grid ? (
      // A division's rows against the whole field: a combined league plays
      // everyone, so its columns never split.
      <ResultsGrid
        players={subset.map((r) => r.playerId)}
        columns={rows.map((r) => r.playerId)}
        matches={matches}
        nameOf={nameOf}
        slugOf={slugOf}
      />
    ) : chart ? (
      <StandingsChart
        rows={subset}
        matches={matches}
        points={points}
        nameOf={nameOf}
      />
    ) : (
      <LeagueStandingsTable
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
        {
          value: "table",
          // The card's title already says "standings"; the tab names the shape.
          label: t("tournaments.viewTable"),
          icon: <LuListOrdered className="h-3.5 w-3.5" aria-hidden />,
        },
        {
          value: "grid",
          label: t("tournaments.resultsGrid"),
          icon: <LuGrid3X3 className="h-3.5 w-3.5" aria-hidden />,
        },
        {
          value: "chart",
          label: t("tournaments.standingsChart"),
          icon: <LuTrendingUp className="h-3.5 w-3.5" aria-hidden />,
        },
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

      {!split || view === "combined" ? (
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
