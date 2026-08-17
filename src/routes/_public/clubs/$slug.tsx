import { createFileRoute, notFound } from "@tanstack/react-router";
import PublicClubPage, { CLUB_GAMES_LIMIT } from "@/pages/public/PublicClubPage";
import { gamesQuery } from "@/queries/games";
import {
  publicClubQuery,
  publicClubRosterQuery,
  publicTournamentsQuery,
} from "@/queries/public";
import { publicMeta, canonical } from "@/libs/publicMeta";

/**
 * A club's public profile.
 *
 * The loader *returns* the club rather than only priming the cache, because
 * `head` is handed `loaderData` and nothing else it could read a name from — an
 * og:title has to be in the first response for a crawler, so it cannot wait for
 * a component to render.
 */
export const Route = createFileRoute("/_public/clubs/$slug")({
  loader: async ({ context, params }) => {
    const club = await context.queryClient.ensureQueryData(
      publicClubQuery(params.slug),
    );
    // No such club, or it opted out. Indistinguishable on purpose: whether a
    // private club exists is itself private.
    if (!club) throw notFound();

    // Awaited together: all three are above the fold, and the ranking is
    // computed from the games, so a page that paints without them paints wrong.
    await Promise.all([
      context.queryClient.ensureQueryData(publicClubRosterQuery(club.id)),
      context.queryClient.ensureQueryData(
        gamesQuery(club.id, { pageSize: CLUB_GAMES_LIMIT }),
      ),
      context.queryClient.ensureQueryData(
        publicTournamentsQuery({ clubId: club.id }),
      ),
    ]);

    return { club, origin: context.origin };
  },
  head: ({ loaderData }) => {
    // Undefined while the match is pending or errored — the root's own head is
    // the fallback in that case.
    if (!loaderData) return {};
    const { club, origin } = loaderData;
    const path = `/clubs/${club.slug}`;
    return {
      meta: publicMeta({
        title: `${club.name} · PoolClubs`,
        description: `${club.name} on PoolClubs: ${club.member_count} members, with rankings, match results and tournaments.`,
        path,
        origin,
        image: club.logo_url,
        fallback: "clubs",
      }),
      links: canonical(path, origin),
    };
  },
  component: PublicClubPage,
});
