import type { BracketIndex } from "@/libs/algorithms/bracket";
import type { TournamentMatch } from "@/types";
import { useT } from "@/i18n";
import GameLinkOverlay from "@/components/games/GameLinkOverlay";
import PlayerLink from "@/components/players/PlayerLink";
import { type MatchLive } from "@/components/games/MatchCard";
import { LiveDot } from "@/components/games/LiveDot";
import { WatchButton } from "@/components/games/WatchButton";
import { isBye } from "./isBye";

export function MatchListRow({
  match,
  index,
  nameOf,
  slugOf,
  clubSlug,
  onRecord,
  live,
}: {
  match: TournamentMatch;
  index: BracketIndex;
  nameOf: (id: number) => string;
  slugOf?: (id: number) => string | undefined;
  clubSlug?: string;
  onRecord?: () => void;
  live?: MatchLive;
}) {
  const { t } = useT();
  const game = match.game;
  const played = match.winner_id !== null;

  const racksFor = (playerId: number | null) => {
    if (!game || playerId === null) return null;
    return game.player_1_id === playerId
      ? game.player_1_score
      : game.player_2_score;
  };

  const walkover = isBye(match);

  const name = (playerId: number | null, slot: 1 | 2) => {
    if (playerId !== null) return nameOf(playerId);
    if (walkover) return t("tournaments.walkover");
    const from = index.source(match.id, slot);
    if (!from) return t("tournaments.tbd");
    return t(
      from.kind === "winner" ? "tournaments.winnerOf" : "tournaments.loserOf",
      { n: from.number },
    );
  };

  const nameNode = (playerId: number | null, slot: 1 | 2) => {
    if (playerId === null) return name(playerId, slot);
    return (
      <PlayerLink
        playerId={playerId}
        playerSlug={slugOf?.(playerId)}
        onClick={(e) => e.stopPropagation()}
        className="relative transition-colors duration-150 hover:text-strike"
      >
        {name(playerId, slot)}
      </PlayerLink>
    );
  };

  const tone = (playerId: number | null) =>
    playerId === null
      ? "text-ink-ghost"
      : played && playerId === match.winner_id
        ? "font-semibold text-ink"
        : played
          ? "text-ink-faint"
          : "text-ink";

  const score = (playerId: number | null, slot: 1 | 2) => {
    if (live?.score) return String(live.score[slot - 1]);
    const racks = racksFor(playerId);
    if (racks !== null) return String(racks);
    // A walkover has no racks; the winner still needs something in the column.
    return played && playerId === match.winner_id
      ? t("tournaments.walkoverMark")
      : "";
  };

  const content = (
    // Names share the leftover width evenly, so a long one cannot push the
    // scores off centre.
    <div
      className={`grid w-full items-center gap-2 px-3 py-2.5 ${
        live?.onWatch
          ? "grid-cols-[1.75rem_1fr_auto_auto_1fr_auto]"
          : "grid-cols-[1.75rem_1fr_auto_auto_1fr]"
      }`}
    >
      <span className="font-mono text-caption tabular-nums text-ink-ghost">
        {live?.score ? <LiveDot /> : index.number(match.id)}
      </span>
      <span
        className={`min-w-0 truncate text-right text-body ${tone(match.p1_id)}`}
      >
        {nameNode(match.p1_id, 1)}
      </span>
      {played || live?.score ? (
        <>
          <span
            className={`w-5 text-center font-mono text-body tabular-nums ${
              live?.score ? "font-semibold text-strike" : tone(match.p1_id)
            }`}
          >
            {score(match.p1_id, 1)}
          </span>
          <span
            className={`w-5 text-center font-mono text-body tabular-nums ${
              live?.score ? "font-semibold text-strike" : tone(match.p2_id)
            }`}
          >
            {score(match.p2_id, 2)}
          </span>
        </>
      ) : (
        // Nothing to show yet, and two empty cells leave the row with a hole in
        // the middle. One dash across both keeps the names hung off a centre.
        // ponytail: punctuation, so not a translated string.
        <span className="col-span-2 w-10 text-center font-mono text-body text-ink-ghost">
          –
        </span>
      )}
      <span className={`min-w-0 truncate text-body ${tone(match.p2_id)}`}>
        {nameNode(match.p2_id, 2)}
      </span>
      {live?.onWatch && <WatchButton onWatch={live.onWatch} />}
    </div>
  );

  // Same split as the bracket: a played row is filled, one still to come is an
  // outline.
  // A row holding a highlighted name lights up — that is the whole mechanism
  // behind tapping a player: no state reaches here, only the marked child.
  const surface = `relative has-[[data-highlight]]:bg-strike-tint ${
    played ? "bg-felt-raised" : "bg-felt"
  }`;

  // A fixture that has been played is a result, and a result has a page: the
  // whole row is the way to it. Only the names opt out — here they follow a
  // player through the draw instead.
  const link = match.game_id ? (
    <GameLinkOverlay gameId={match.game_id} clubSlug={clubSlug} />
  ) : null;

  if (!onRecord)
    return (
      <div
        className={`${surface} ${
          link ? "transition-colors duration-150 hover:bg-rail" : ""
        }`}
      >
        {link}
        {content}
      </div>
    );

  // Not a native <button> because a player's name inside it is a link to
  // their page, and interactive content cannot nest inside a <button>.
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onRecord}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onRecord();
        }
      }}
      aria-label={t("tournaments.recordFor", {
        p1: name(match.p1_id, 1),
        p2: name(match.p2_id, 2),
      })}
      className={`flex w-full cursor-pointer text-left transition-colors duration-150 hover:bg-rail ${surface}`}
    >
      {content}
    </div>
  );
}
