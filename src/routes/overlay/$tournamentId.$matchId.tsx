import { createFileRoute, notFound } from "@tanstack/react-router";
import OverlayMatchPage from "@/pages/public/OverlayMatchPage";
import { publicClubRosterQuery } from "@/queries/public/clubs";
import { publicTournamentQuery } from "@/queries/public/tournaments";

/**
 * The OBS Browser Source for one fixture — see docs/youtube-streaming.md
 * Phase 1. Top level, not under `_public`, so it inherits none of
 * PublicShell's nav, footer or theme chrome, and deliberately left out of
 * publicCache.ts's PUBLIC_PREFIXES so the SSR HTML is never held in the CDN —
 * a table between racks must not serve a minute-old score.
 */
export const Route = createFileRoute("/overlay/$tournamentId/$matchId")({
  loader: async ({ context, params }) => {
    const tournamentId = Number(params.tournamentId);
    if (!Number.isInteger(tournamentId) || tournamentId < 1) throw notFound();

    const tournament = await context.queryClient.query({
      ...publicTournamentQuery(tournamentId),
      staleTime: "static",
    });
    // Also what a private club's tournament resolves to — publicTournamentQuery
    // filters on club.is_public, so this is the same 404 verification step 6
    // in the doc asks for.
    if (!tournament) throw notFound();

    const match = tournament.tournament_matches.find(
      (m) => m.id === params.matchId,
    );
    if (!match) throw notFound();

    // The roster is what turns p1_id/p2_id and the bracket's numbering into
    // names — see OverlayMatchPage.
    await context.queryClient.query({
      ...publicClubRosterQuery(tournament.club_id),
      staleTime: "static",
    });

    return { tournament, matchId: params.matchId };
  },
  component: OverlayMatchPage,
});
