import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import OverlayScoreboard from "@/components/live/OverlayScoreboard";
import { bracketIndex, raceFor, resolveBracket } from "@/libs/algorithms/bracket";
import { publicClubRosterQuery } from "@/queries/public/clubs";
import { publicLiveMatchByTournamentMatchQuery } from "@/queries/public/live";
import type { PublicPlayer } from "@/queries/public/clubs";
import type { TournamentMatch } from "@/types";

const route = getRouteApi("/overlay/$tournamentId/$matchId");

/** ids to {name, country} entries — there is no seat to walk away from on an
 *  overlay, a live match's own seats are never empty, but a stray id not in
 *  the roster still gets a placeholder name rather than vanishing. */
const entriesOf = (ids: (number | null)[], roster: PublicPlayer[]) =>
  ids
    .filter((id): id is number => id !== null)
    .map((id) => {
      const player = roster.find((p) => p.id === id);
      return { name: player?.name ?? "—", country: player?.country ?? null };
    });

/**
 * One tournament fixture, as the OBS Browser Source bolted to its table sees
 * it — see docs/youtube-streaming.md Phase 1. The loader has already thrown
 * notFound() for a bad id, a private club, or a match that doesn't exist in
 * that tournament, so this only ever renders live, finished or not-yet-
 * started.
 */
export default function OverlayMatchPage() {
  const { tournament, matchId } = route.useLoaderData();
  const { data: roster } = useSuspenseQuery(
    publicClubRosterQuery(tournament.club_id),
  );
  const { data: live } = useQuery(
    publicLiveMatchByTournamentMatchQuery(matchId),
  );

  const matches = resolveBracket(
    tournament.tournament_matches as TournamentMatch[],
  );
  const index = bracketIndex(matches);
  const matchNumber = index.number(matchId);
  const match = matches.find((m) => m.id === matchId);

  // Transparent no matter what renders below: a scene left running between
  // matches must show clean camera, not the app's own felt canvas.
  const style = <style>{`html,body{background:transparent}`}</style>;

  if (!tournament.club) return style;

  const club = { slug: tournament.club.slug, name: tournament.club.name };

  if (live) {
    return (
      <>
        {style}
        <OverlayScoreboard
          side1={{ entries: entriesOf([live.player_1_id, live.player_1b_id], roster) }}
          side2={{ entries: entriesOf([live.player_2_id, live.player_2b_id], roster) }}
          score1={live.player_1_score}
          score2={live.player_2_score}
          raceTo={live.race_to}
          discipline={live.discipline}
          lastSide={live.last_side}
          live
          matchNumber={matchNumber}
          club={club}
        />
      </>
    );
  }

  // Finished: the fixture's own game embed carries the final score.
  // game.player_1_id says which of p1_id/p2_id filed as "player 1" — the
  // other one is whichever of the two it is not.
  if (match?.game) {
    const { game } = match;
    const otherId = match.p1_id === game.player_1_id ? match.p2_id : match.p1_id;

    return (
      <>
        {style}
        <OverlayScoreboard
          side1={{ entries: entriesOf([game.player_1_id], roster) }}
          side2={{ entries: entriesOf([otherId], roster) }}
          score1={game.player_1_score}
          score2={game.player_2_score}
          raceTo={raceFor(match, tournament, matches)}
          discipline={tournament.discipline}
          live={false}
          matchNumber={matchNumber}
          club={club}
        />
      </>
    );
  }

  // Not started yet. Nothing to show.
  return style;
}
