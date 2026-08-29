// Extension spelled out so `node src/libs/feedGroups.check.ts` can resolve it.
import { startsNewDay } from "./dayLabel.ts";

/** The shape the feed's grouping cares about: when it happened, and — for a
 *  match row — which fixtures it holds. Everything else on a feed row is passed
 *  through untouched. */
type GroupableRow<G> = {
  at: string;
  games?: G[];
};

/**
 * Fold runs of neighbouring matches from the same tournament into one row.
 *
 * A tournament night arrives as six or eight fixtures in a row, and six cards
 * saying the same tournament name is the feed telling you nothing six times.
 * Only neighbours are folded: a fixture with something else between it and the
 * rest belongs where it happened, and a run crossing midnight would otherwise
 * have to sit under one of the two day headings.
 *
 * @param rows Newest first, as the feed renders them.
 * @param tournamentOf Which tournament a game was filed under, if any.
 */
export function groupTournamentRuns<G, R>(
  rows: (GroupableRow<G> & R)[],
  tournamentOf: (game: G) => string | number | undefined,
): (GroupableRow<G> & R)[] {
  const out: (GroupableRow<G> & R)[] = [];

  for (const row of rows) {
    const id = row.games && tournamentOf(row.games[0]);
    const last = out[out.length - 1];
    const lastId = last?.games && tournamentOf(last.games[0]);

    if (
      row.games &&
      id !== undefined &&
      id === lastId &&
      !startsNewDay(new Date(row.at), new Date(last.at))
    ) {
      last.games!.push(...row.games);
      continue;
    }
    // Copied, not shared: the caller's rows are rebuilt every render from
    // cached query data, and growing one of their arrays in place would grow it
    // again on the next pass.
    out.push(row.games ? { ...row, games: [...row.games] } : row);
  }

  return out;
}
