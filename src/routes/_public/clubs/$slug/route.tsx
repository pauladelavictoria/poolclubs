import { createFileRoute, notFound } from "@tanstack/react-router";
import PublicClubPage from "@/pages/public/PublicClubPage";
import { publicClubQuery, publicClubRosterQuery } from "@/queries/public/clubs";
import { publicMeta, canonical } from "@/libs/algorithms/publicMeta";

/**
 * A club's public profile: a shared hero, with the four things there are to
 * say about a club — what it is, what is on, who plays
 * there, what they have played — as four sub-routes under it.
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

    // Only what the frame itself draws: the roster is the hero's face pile, so
    // a page that paints without it paints wrong. Each tab loads its own.
    await context.queryClient.ensureQueryData(publicClubRosterQuery(club.id));

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
        description: `${club.name}: ${club.member_count} miembros, con rankings, resultados de partidas y torneos.`,
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
