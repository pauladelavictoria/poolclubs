import { usePlayerLookup } from "@/hooks/usePlayers";
import { useTournament } from "@/hooks/useTournaments";
import TournamentPodium from "@/components/tournaments/TournamentPodium";
import SocialBar from "@/components/social/SocialBar";
import { resolveBracket, tournamentResults } from "@/libs/algorithms/bracket";
import { type Tournament } from "@/types";
import { TournamentFeedHead } from "./TournamentFeedHead";

/** A tournament that is over: who was on the podium, nothing else. The bracket
 *  behind it is a tap away. */
export function TournamentResultCard({
  tournament,
}: {
  tournament: Tournament;
}) {
  const { byId } = usePlayerLookup();
  const { data: detail } = useTournament(tournament.id);

  const matches = resolveBracket(detail?.tournament_matches ?? []);
  const entrants = (detail?.tournament_players ?? []).map((e) => e.player_id);

  const { podium: places } = tournamentResults(tournament, entrants, matches);

  return (
    <>
      <TournamentFeedHead tournament={tournament} label="tournaments.results" />
      <TournamentPodium places={places} byId={byId} />
      {/* The result is the thing people talk about, so the thread hangs off the
          tournament itself — not off the final game, which is where it would
          land if this reused the match card's bar. */}
      <SocialBar target={{ tournamentId: tournament.id }} preview />
    </>
  );
}
