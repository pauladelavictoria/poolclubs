import TournamentPodium from "@/components/tournaments/TournamentPodium";
import { resolveBracket, tournamentResults } from "@/libs/algorithms/bracket";
import { type PublicTournamentListItem } from "@/queries/public/tournaments";

/**
 * Who won it, on the card that says it is over — the one fact an archive is
 * read for, and the reason the archive is cards now.
 *
 * The tournament's own podium at tile size (`compact`): the same three steps,
 * faces only. Same reading too — see PODIUM_COLS for what it costs (fixtures,
 * not games).
 */
export function TournamentCardPodium({
  tournament,
}: {
  tournament: PublicTournamentListItem;
}) {
  const matches = tournament.tournament_matches;
  // /search asks for a leaner row, and an unfinished draw has no podium to
  // read: both simply draw nothing.
  if (tournament.status !== "done" || !matches?.length) return null;

  // An entrant whose row was withheld (a claimed guest, a deleted person) has
  // no name to draw and simply is not in the map — the step falls back to a
  // dash rather than dropping out of the podium.
  const roster = tournament.roster ?? [];
  const byId = new Map(
    roster.flatMap(({ player, partner }) =>
      [player, partner].flatMap((p) =>
        p?.person ? [[p.id, p.person] as const] : [],
      ),
    ),
  );
  const partners = new Map(
    roster.flatMap(({ player, partner }) =>
      player && partner ? [[player.id, partner.id] as const] : [],
    ),
  );

  const { podium: places } = tournamentResults(
    tournament,
    roster.flatMap(({ player }) => (player?.person ? [player.id] : [])),
    resolveBracket(matches),
  );

  if (places.first === null) return null;

  return (
    // Padding on top only: the plinths sit straight on the footer's rule,
    // which is the floor of this podium.
    <div className="pt-3">
      <TournamentPodium
        places={places}
        byId={byId}
        partners={partners}
        compact
      />
    </div>
  );
}
