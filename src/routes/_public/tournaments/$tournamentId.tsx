import { createFileRoute, notFound } from "@tanstack/react-router";
import PublicTournamentPage from "@/pages/PublicTournamentPage";
import { publicClubRosterQuery, publicTournamentQuery } from "@/queries/public";
import { publicMeta, canonical } from "@/libs/publicMeta";
import type { TournamentFormat } from "@/types";

/**
 * Prose, not the i18n key. FORMAT_KEY maps the column onto "doubleElim" for
 * `t()`, which is the wrong shape for a sentence, and `head` cannot call `t()`
 * anyway — it runs outside React.
 *
 * Which is the honest limit of this file: link previews are English whatever the
 * visitor's language is. Localising them means reaching the dictionary from
 * outside the provider, and a crawler's Accept-Language is not the reader's.
 */
const FORMAT_PROSE: Record<TournamentFormat, string> = {
  double_elim: "double elimination",
  league: "league",
  group_knockout: "groups into a knockout",
};

export const Route = createFileRoute("/_public/tournaments/$tournamentId")({
  loader: async ({ context, params }) => {
    const id = Number(params.tournamentId);
    if (!Number.isInteger(id) || id < 1) throw notFound();

    const tournament = await context.queryClient.ensureQueryData(
      publicTournamentQuery(id),
    );
    if (!tournament) throw notFound();

    // The roster is what turns entrant ids and fixture slots into names. Without
    // it the bracket renders as numbers.
    await context.queryClient.ensureQueryData(
      publicClubRosterQuery(tournament.club_id),
    );

    return { tournament, origin: context.origin };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const { tournament, origin } = loaderData;
    const path = `/tournaments/${tournament.id}`;
    const club = tournament.club?.name;
    const entrants = tournament.tournament_players.length;
    return {
      meta: publicMeta({
        title: `${tournament.name} · PoolClubs`,
        description: [
          club && `${club}.`,
          `${entrants} entrants,`,
          `${FORMAT_PROSE[tournament.format]}.`,
          "Bracket, standings and results on PoolClubs.",
        ]
          .filter(Boolean)
          .join(" "),
        path,
        origin,
        image: tournament.club?.logo_url,
        fallback: "tournaments",
      }),
      links: canonical(path, origin),
    };
  },
  component: PublicTournamentPage,
});
