import { createFileRoute } from "@tanstack/react-router";
import RankingAllTimePage from "@/pages/app/RankingAllTimePage";
import { gamesQuery } from "@/queries/games";

/** Elo over every game the club has played, so the whole list is the input. The
 *  key is the same one the dashboard primes — this is usually a cache hit. */
export const Route = createFileRoute("/app/_authed/$clubSlug/ranking/")({
  staticData: { section: "ranking" },
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(gamesQuery(context.activeClubId)),
  component: RankingAllTimePage,
});
