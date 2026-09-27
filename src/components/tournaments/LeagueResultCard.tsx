import { WatchButton } from "@/components/games/WatchButton";
import GameLinkOverlay from "@/components/games/GameLinkOverlay";
import Side, { type SidePerson } from "@/components/social/feed/Side";
import { Card } from "@/components/ui/Card";
import { playedTimeOf } from "@/libs/algorithms/dayLabel";
import type { TournamentMatch } from "@/types";
import { useT } from "@/i18n";

/** One result the way the home feed draws it: faces either side of the score,
 *  the winner carrying the weight. The whole card opens the result. */
export function LeagueResultCard({
  match,
  personOf,
  clubSlug,
  onWatch,
}: {
  match: TournamentMatch;
  personOf: (id: number) => SidePerson | undefined;
  clubSlug?: string;
  onWatch?: () => void;
}) {
  const { locale } = useT();
  const game = match.game!;
  // The game seats whoever sat down first; the card reads fixture order.
  const racks = (id: number | null) =>
    id === game.player_1_id ? game.player_1_score : game.player_2_score;
  const p1 = racks(match.p1_id);
  const p2 = racks(match.p2_id);
  const side = (id: number | null) => {
    const person = id === null ? undefined : personOf(id);
    return person ? [person] : [];
  };

  return (
    <Card className="relative px-4 py-3 transition-colors duration-150 hover:bg-rail">
      {match.game_id && (
        <GameLinkOverlay gameId={match.game_id} clubSlug={clubSlug} />
      )}
      <div className="flex items-center justify-between gap-3">
        {onWatch ? <WatchButton onWatch={onWatch} /> : <span />}
        <time
          dateTime={game.played_at}
          className="font-mono text-caption tabular-nums text-ink-ghost"
          suppressHydrationWarning
        >
          {playedTimeOf(new Date(game.played_at), locale)}
        </time>
      </div>
      <div className="mt-1 flex items-center gap-3">
        <Side people={side(match.p1_id)} won={p1 > p2} />
        <span className="flex h-12 shrink-0 items-center self-start font-mono text-h2 font-semibold tabular-nums">
          <span className={p1 > p2 ? "text-ink" : "text-ink-faint"}>{p1}</span>
          <span className="px-1 text-ink-ghost">-</span>
          <span className={p2 > p1 ? "text-ink" : "text-ink-faint"}>{p2}</span>
        </span>
        <Side people={side(match.p2_id)} won={p2 > p1} />
      </div>
    </Card>
  );
}
