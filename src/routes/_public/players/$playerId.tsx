import { createFileRoute, notFound } from "@tanstack/react-router";
import PublicPlayerPage, {
  PUBLIC_PLAYER_GAMES_LIMIT,
} from "@/pages/PublicPlayerPage";
import { gamesQuery } from "@/queries/games";
import { publicClubRosterQuery, publicPlayerQuery } from "@/queries/public";
import { publicMeta, canonical } from "@/libs/publicMeta";

export const Route = createFileRoute("/_public/players/$playerId")({
  loader: async ({ context, params }) => {
    const id = Number(params.playerId);
    if (!Number.isInteger(id) || id < 1) throw notFound();

    const player = await context.queryClient.ensureQueryData(
      publicPlayerQuery(id),
    );
    // Hidden player, hidden club, or still pending approval — all three are a
    // 404 out here, and for the same reason: none of them is a public profile.
    if (!player) throw notFound();

    // The roster comes along because a win rate is computed against the whole
    // club's games, and those games name opponents this page has to label.
    await Promise.all([
      context.queryClient.ensureQueryData(
        publicClubRosterQuery(player.club_id),
      ),
      context.queryClient.ensureQueryData(
        gamesQuery(player.club_id, {
          playerId: id,
          pageSize: PUBLIC_PLAYER_GAMES_LIMIT,
        }),
      ),
    ]);

    return { player, origin: context.origin };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const { player, origin } = loaderData;
    const path = `/players/${player.id}`;
    const club = player.club?.name;
    return {
      meta: publicMeta({
        title: `${player.name} · PoolClubs`,
        description: club
          ? `${player.name} plays for ${club}. Record, win rate and recent matches on PoolClubs.`
          : `${player.name} on PoolClubs: record, win rate and recent matches.`,
        path,
        origin,
        image: player.avatar_url,
        fallback: "players",
      }),
      links: canonical(path, origin),
    };
  },
  component: PublicPlayerPage,
});
