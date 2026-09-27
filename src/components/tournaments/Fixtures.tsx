import MatchCard, { type MatchLive } from "@/components/games/MatchCard";
import { type BracketIndex } from "@/libs/algorithms/bracket";
import type { TournamentMatch } from "@/types";

/** Fixtures as cards — a group's, on the club's tournament page. No matchday
 *  headings: the round a fixture was generated in means nothing to anybody. */
export function Fixtures({
  matches,
  nameOf,
  slugOf,
  clubSlug,
  index,
  recorder,
  liveOf,
}: {
  matches: TournamentMatch[];
  nameOf: (id: number) => string;
  slugOf?: (id: number) => string | undefined;
  clubSlug?: string;
  index: BracketIndex;
  recorder?: (match: TournamentMatch) => (() => void) | null;
  liveOf?: (match: TournamentMatch) => MatchLive | undefined;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {matches.map((match) => (
        <MatchCard
          key={match.id}
          match={match}
          nameOf={nameOf}
          slugOf={slugOf}
          clubSlug={clubSlug}
          index={index}
          onRecord={recorder?.(match) ?? undefined}
          live={liveOf?.(match)}
        />
      ))}
    </div>
  );
}
