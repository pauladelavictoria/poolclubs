import type { BracketIndex } from "@/libs/algorithms/bracket";
import type { BracketSide, TournamentMatch } from "@/types";
import { useT } from "@/i18n";
import { stageLabel } from "@/libs/algorithms/broadcastTitle";
import { type MatchLive } from "@/components/games/MatchCard";
import { MatchListRow } from "./MatchListRow";
import { isBye } from "./isBye";

/** Reading order of a tournament: groups, then the main draw, then the repêchage
 *  it feeds, then the match everything has been building to. Kept in step with
 *  the numbering in libs/algorithms/bracket/, which sorts by the same thing. */
const ORDER: BracketSide[] = ["group", "league", "winners", "losers", "final"];

/**
 * The same fixtures as the bracket, as a running order.
 *
 * A bracket answers "who plays whom next"; this answers "what happened, in what
 * order" — which is the question anyone catching up on a tournament night is
 * actually asking, and it does not need a horizontal scrollbar to do it.
 */
export default function MatchList({
  matches,
  nameOf,
  slugOf,
  clubSlug,
  index,
  raceFor,
  onRecord,
  liveOf,
}: {
  matches: TournamentMatch[];
  nameOf: (id: number) => string;
  /** The person's slug for each id, for the public side's /players/:slug
   *  links. Omitted inside a club, where PlayerLink uses the club route. */
  slugOf?: (id: number) => string | undefined;
  /** The club's slug on the public side, so a played fixture can link to the
   *  result's own page. Omitted inside a club, where the route carries it. */
  clubSlug?: string;
  index: BracketIndex;
  /** How many racks a fixture runs to; shown once per stage. */
  raceFor: (match: TournamentMatch) => number;
  /** Returns null for a match this viewer cannot file a result for. */
  onRecord: (match: TournamentMatch) => (() => void) | null;
  /** Running score and video per fixture — the public page only. */
  liveOf?: (match: TournamentMatch) => MatchLive | undefined;
}) {
  const { t } = useT();

  // A bye is not a fixture: nobody turned up for it and nobody is going to.
  // Twelve of them above four real openers is how a field of twenty pads out to
  // a draw of thirty-two, and listing them buries the matches that exist.
  const sorted = matches
    .filter((m) => !isBye(m))
    .sort(
      (a, b) =>
        ORDER.indexOf(a.bracket) - ORDER.indexOf(b.bracket) ||
        a.round - b.round ||
        (a.group_no ?? 0) - (b.group_no ?? 0) ||
        a.slot - b.slot,
    );

  const stages: { key: string; label: string; rows: TournamentMatch[] }[] = [];
  for (const match of sorted) {
    // Knockout rounds are stages; a round robin's "round" is only the order the
    // fixtures came out of the generator, and nobody plays to it.
    const key =
      match.bracket === "group"
        ? `group:${match.group_no}`
        : match.bracket === "league"
          ? "league"
          : `${match.bracket}:${match.round}`;
    let last = stages[stages.length - 1];
    if (last?.key !== key) {
      last = { key, label: stageLabel(match, t), rows: [] };
      stages.push(last);
    }
    last.rows.push(match);
  }

  return (
    <div className="space-y-4">
      {stages.map((stage) => (
        <section key={stage.key}>
          <h3 className="mb-1 flex flex-wrap items-baseline gap-x-2 px-1 text-caption font-medium uppercase tracking-[0.08em] text-ink-faint">
            {stage.label && <span>{stage.label}</span>}
            <span className="normal-case tracking-normal text-ink-ghost">
              {t("tournaments.raceLabel", { n: raceFor(stage.rows[0]) })}
            </span>
          </h3>
          <ul className="divide-y divide-hairline overflow-hidden rounded-control border border-hairline">
            {stage.rows.map((match) => (
              <li key={match.id}>
                <MatchListRow
                  match={match}
                  index={index}
                  nameOf={nameOf}
                  slugOf={slugOf}
                  clubSlug={clubSlug}
                  onRecord={onRecord(match) ?? undefined}
                  live={liveOf?.(match)}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
