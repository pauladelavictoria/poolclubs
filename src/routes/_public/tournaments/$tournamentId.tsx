import { createFileRoute, notFound } from "@tanstack/react-router";
import PublicTournamentPage from "@/pages/public/PublicTournamentPage";
import { publicClubRosterQuery } from "@/queries/public/clubs";
import { publicTournamentQuery } from "@/queries/public/tournaments";
import { publicMeta, canonical } from "@/libs/algorithms/publicMeta";
import { resolveBracket, tournamentResults } from "@/libs/algorithms/bracket";
import { podiumIds } from "@/libs/algorithms/cards";
// The dictionary, not the reader's language: link previews are Spanish — a
// crawler's Accept-Language is not the reader's — and the card route this
// page's og:image points at says the same status from the same key.
//
// The entrant count was in the description instead of the status, and a card
// cached by a chat app the day entries opened kept claiming "4 entrants" for
// the rest of the tournament. Status goes stale too, but only once per phase
// and in the safe direction.
import { translate } from "@/i18n/translate";
import { FORMAT_KEY, type TournamentMatch } from "@/types";

export const Route = createFileRoute("/_public/tournaments/$tournamentId")({
  loader: async ({ context, params }) => {
    const id = Number(params.tournamentId);
    if (!Number.isInteger(id) || id < 1) throw notFound();

    const tournament = await context.queryClient.query({
      ...publicTournamentQuery(id),
      staleTime: "static",
    });
    if (!tournament) throw notFound();

    // The roster is what turns entrant ids and fixture slots into names. Without
    // it the bracket renders as numbers.
    await context.queryClient.query({
      ...publicClubRosterQuery(tournament.club_id),
      staleTime: "static",
    });

    return { tournament, origin: context.origin };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const { tournament, origin } = loaderData;
    // The same reading the card route draws from, so the version changes
    // exactly when the picture does — a corrected result included.
    const { podium } = tournamentResults(
      tournament,
      tournament.tournament_players.map((e) => e.player_id),
      resolveBracket(tournament.tournament_matches as TournamentMatch[]),
    );
    const path = `/tournaments/${tournament.id}`;
    const club = tournament.club?.name;
    return {
      meta: publicMeta({
        title: `${tournament.name} · PoolClubs`,
        description: [
          club && `${club}.`,
          `${translate("es", `tournaments.status.${tournament.status}`)},`,
          `${translate("es", `tournaments.${FORMAT_KEY[tournament.format]}`).toLowerCase()}.`,
          "Cuadro, clasificación y resultados.",
        ]
          .filter(Boolean)
          .join(" "),
        path,
        origin,
        // Never the club's logo_url — that column holds a data: URI, which
        // publicMeta drops and no crawler would fetch anyway. This route hands
        // back the podium card once a member's browser has drawn one, and the
        // app's default card until then.
        // `v` is a cache-buster, not a parameter the route reads — see the club
        // route for why. The card is the phase until it finishes and the
        // podium after, so both are what has to change it.
        image: `/api/og/tournaments/${tournament.id}.png?v=${tournament.status}-${podiumIds(podium).join(".")}`,
        // 1200x630, whether it is the podium card or the default one the route
        // falls back to. Without this the card previews as a thumbnail.
        wideImage: true,
        fallback: "tournaments",
      }),
      links: canonical(path, origin),
    };
  },
  component: PublicTournamentPage,
});
