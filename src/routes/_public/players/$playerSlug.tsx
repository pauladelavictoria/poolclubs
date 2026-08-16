import { createFileRoute, notFound } from "@tanstack/react-router";
import PublicPlayerPage, {
  PUBLIC_PLAYER_GAMES_LIMIT,
} from "@/pages/PublicPlayerPage";
import { gamesQuery } from "@/queries/games";
import { publicClubRosterQuery, publicPersonQuery } from "@/queries/public";
import { publicMeta, canonical } from "@/libs/publicMeta";

export const Route = createFileRoute("/_public/players/$playerSlug")({
  loader: async ({ context, params }) => {
    const person = await context.queryClient.ensureQueryData(
      publicPersonQuery(params.playerSlug),
    );
    // Unknown slug, or every one of their clubs is hidden or their memberships
    // are still pending — all of them are a 404 out here, and for the same
    // reason: none is a public profile.
    if (!person || person.memberships.length === 0) throw notFound();

    // One pair of reads per club they play in. The roster comes along because
    // the games name opponents this page has to label, and the games because
    // the record is computed from them.
    //
    // ponytail: 2N round trips for someone in N clubs, and N is one or two for
    // almost everybody. If a serial multi-club player ever makes this slow, the
    // answer is one RPC returning the merged history, not a cache here.
    await Promise.all(
      person.memberships.flatMap((m) => [
        context.queryClient.ensureQueryData(publicClubRosterQuery(m.club.id)),
        context.queryClient.ensureQueryData(
          gamesQuery(m.club.id, {
            playerId: m.id,
            pageSize: PUBLIC_PLAYER_GAMES_LIMIT,
          }),
        ),
      ]),
    );

    return { person, origin: context.origin };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const { person, origin } = loaderData;
    const path = `/players/${person.slug}`;
    const clubs = person.memberships.map((m) => m.club.name);
    return {
      meta: publicMeta({
        title: `${person.name} · PoolClubs`,
        description: clubs.length
          ? `${person.name} plays for ${listed(clubs)}. Record, win rate and recent matches on PoolClubs.`
          : `${person.name} on PoolClubs: record, win rate and recent matches.`,
        path,
        origin,
        image: person.avatar_url,
        fallback: "players",
      }),
      links: canonical(path, origin),
    };
  },
  component: PublicPlayerPage,
});

/** "A", "A and B", "A, B and C" — a meta description is a sentence. */
function listed(names: string[]) {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
