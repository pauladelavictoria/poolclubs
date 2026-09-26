import PlayerLink from "@/components/players/PlayerLink";
import {
  fixturesBetween,
  resultFor,
  type ResultMatch,
} from "@/libs/algorithms/leagueTable";
import { useT } from "@/i18n";

/**
 * Every head-to-head of a round robin at once: a row per player, a column per
 * opponent, the cell the row player's result against them. Alphabetical, so a
 * name is found without knowing where it stands — the table beside it already
 * answers that. The column numbers are the row numbers.
 *
 * Two legs put two results in a cell, in the order they were drawn.
 *
 * `columns` widens the top axis past the rows — one division's players
 * against the whole combined field. A row keeps its column's number, so the
 * numbers still match across.
 */
export default function ResultsGrid({
  players,
  columns,
  matches,
  nameOf,
  slugOf,
}: {
  players: number[];
  /** Opponents along the top; the rows' own players when omitted. */
  columns?: number[];
  matches: (ResultMatch & { round: number })[];
  nameOf: (id: number) => string;
  slugOf?: (id: number) => string | undefined;
}) {
  const { t } = useT();
  const byName = (a: number, b: number) => nameOf(a).localeCompare(nameOf(b));
  const order = [...players].sort(byName);
  const cols = [...(columns ?? players)].sort(byName);
  const numberOf = new Map(cols.map((id, i) => [id, i + 1]));

  return (
    <>
      {/* ponytail: scrolls sideways past ~6 players on a phone; the table is
          the summary, this is the detail. */}
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0">
          <caption className="sr-only">{t("tournaments.resultsGrid")}</caption>
          <thead>
            <tr className="text-caption font-medium text-ink-faint">
              <th
                scope="col"
                className="sticky left-0 bg-felt py-2 pl-4 pr-3 text-left font-medium"
              >
                <span className="sr-only">{t("ranking.player")}</span>
              </th>
              {cols.map((id, i) => (
                <th
                  key={id}
                  scope="col"
                  className="min-w-12 px-1 py-2 text-center font-mono font-medium tabular-nums"
                >
                  <abbr title={nameOf(id)} className="no-underline">
                    {i + 1}
                  </abbr>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {order.map((rowId) => (
              // Striped for reading across. Opaque, not a tint: the name cell is
              // sticky and would show the scrolled cells through it.
              <tr
                key={rowId}
                className="group even:bg-[color-mix(in_oklab,var(--color-felt),var(--color-felt-raised)_40%)]"
              >
                <th
                  scope="row"
                  className="sticky left-0 border-t border-hairline bg-felt py-2 group-even:bg-[color-mix(in_oklab,var(--color-felt),var(--color-felt-raised)_40%)] pl-4 pr-3 text-left font-normal"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-5 shrink-0 font-mono text-caption tabular-nums text-ink-faint">
                      {numberOf.get(rowId)}
                    </span>
                    <PlayerLink
                      playerId={rowId}
                      playerSlug={slugOf?.(rowId)}
                      className="block max-w-[8rem] truncate text-body font-medium text-ink transition-colors duration-150 hover:text-strike sm:max-w-[12rem]"
                    >
                      {nameOf(rowId)}
                    </PlayerLink>
                  </span>
                </th>
                {cols.map((colId) => {
                  if (colId === rowId)
                    return (
                      <td
                        key={colId}
                        aria-hidden
                        className="border-t border-hairline bg-felt-raised"
                      />
                    );
                  const legs = fixturesBetween(matches, rowId, colId).sort(
                    (a, b) => a.round - b.round,
                  );
                  return (
                    <td
                      key={colId}
                      className="border-t border-hairline px-1 py-2 text-center font-mono text-caption tabular-nums"
                    >
                      {legs.map((m, i) => {
                        const res = resultFor(m, rowId);
                        return (
                          <span
                            key={i}
                            className={`block ${
                              !res
                                ? "text-ink-ghost"
                                : res.won
                                  ? "font-semibold text-strike"
                                  : "text-ink-faint"
                            }`}
                          >
                            {!res
                              ? "·"
                              : res.mine === null
                                ? t(
                                    res.won
                                      ? "tournaments.wins"
                                      : "tournaments.losses",
                                  )
                                : `${res.mine}–${res.theirs}`}
                          </span>
                        );
                      })}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
