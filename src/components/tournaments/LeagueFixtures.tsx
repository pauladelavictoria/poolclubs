import { useState } from "react";
import MatchCard, {
  WatchButton,
  type MatchLive,
} from "@/components/games/MatchCard";
import GameLinkOverlay from "@/components/games/GameLinkOverlay";
import { PlayerOptions } from "@/components/players/PlayerOptions";
import Side, { type SidePerson } from "@/components/social/feed/Side";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Select";
import {
  sortPlayedMatches,
  type BracketIndex,
} from "@/libs/algorithms/bracket";
import {
  dayLabel,
  playedTimeOf,
  startsNewDay,
} from "@/libs/algorithms/dayLabel";
import type { TournamentMatch } from "@/types";
import { useT } from "@/i18n";

/** How many results a page of the timeline holds. */
const PAGE = 30;

/**
 * A league's results as a timeline, newest first, under one heading per day —
 * the home feed's shape, since a club league is read the same way: "what
 * happened lately". What is still owed is not listed: a round robin's pending
 * half is every pairing nobody has got to, and the table already says who is
 * behind. Shared by the club's own tournament page and the public one.
 */
export default function LeagueFixtures({
  matches,
  personOf,
  clubSlug,
  playerIds,
  meId,
  liveOf,
  emptyHint,
}: {
  matches: TournamentMatch[];
  /** Face, name and slug for an id — the club roster on either side. */
  personOf: (id: number) => SidePerson | undefined;
  clubSlug?: string;
  /** The entrants, for the player filter. */
  playerIds: number[];
  meId?: number | null;
  liveOf?: (match: TournamentMatch) => MatchLive | undefined;
  /** Under "no games yet". */
  emptyHint?: string;
}) {
  const { t, locale } = useT();
  /** Whose results to show, "" for everyone's. A string because it is a
   *  <select>'s value. */
  const [fixturesOf, setFixturesOf] = useState("");
  const [limit, setLimit] = useState(PAGE);

  // A walkover has no game and so no day; the table counts it, the timeline
  // has nothing to show for it.
  const mine = matches.filter(
    (m) =>
      fixturesOf === "" ||
      m.p1_id === Number(fixturesOf) ||
      m.p2_id === Number(fixturesOf),
  );
  const settled = mine.filter((m) => m.winner_id !== null).length;
  const played = sortPlayedMatches(mine.filter((m) => m.game));
  const shown = played.slice(0, limit);
  // One heading and one grid per day, the home feed's rhythm.
  const days: TournamentMatch[][] = [];
  shown.forEach((match, i) => {
    const at = new Date(match.game!.played_at);
    const prev = shown[i - 1]?.game && new Date(shown[i - 1].game!.played_at);
    if (startsNewDay(at, prev || undefined)) days.push([]);
    days[days.length - 1].push(match);
  });

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <h2 className="text-h3 font-semibold text-ink">
          {t("games.title")}{" "}
          {/* Played of the whole schedule — of one player's, when filtered. */}
          <span className="font-mono tabular-nums text-ink-faint">
            {settled} / {mine.length}
          </span>
        </h2>
        {/* It filters the results, not the table: a table of one row is not
            a standing. Your own name leads — see PlayerOptions. */}
        <Select
          size="sm"
          className="max-w-[14rem]"
          value={fixturesOf}
          aria-label={t("tournaments.filterByPlayer")}
          onChange={(e) => {
            setFixturesOf(e.target.value);
            setLimit(PAGE);
          }}
        >
          <option value="">{t("games.allPlayers")}</option>
          <PlayerOptions
            players={playerIds.map((id) => ({
              id,
              name: personOf(id)?.name ?? "—",
            }))}
            meId={meId}
          />
        </Select>
      </div>

      {shown.length === 0 ? (
        <EmptyState title={t("tournaments.noGamesYet")} hint={emptyHint} />
      ) : (
        days.map((day, i) => (
          <div key={day[0].id}>
            <h3
              className={`px-1 pb-1.5 text-caption font-medium uppercase tracking-[0.08em] text-ink-faint ${
                i === 0 ? "" : "pt-4"
              }`}
              // "Today" depends on the reader's timezone — see dayLabel.
              suppressHydrationWarning
            >
              {dayLabel(new Date(day[0].game!.played_at), t, locale)}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {day.map((match) => (
                <ResultCard
                  key={match.id}
                  match={match}
                  personOf={personOf}
                  clubSlug={clubSlug}
                  onWatch={liveOf?.(match)?.onWatch}
                />
              ))}
            </div>
          </div>
        ))
      )}

      {played.length > limit && (
        <div className="flex justify-center pt-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setLimit((n) => n + PAGE)}
          >
            {t("common.showMore")}
          </Button>
        </div>
      )}
    </section>
  );
}

/** One result the way the home feed draws it: faces either side of the score,
 *  the winner carrying the weight. The whole card opens the result. */
function ResultCard({
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
