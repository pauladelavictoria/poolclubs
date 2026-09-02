import { createFileRoute } from "@tanstack/react-router";
import RankingNightPage from "@/pages/app/RankingNightPage";
import { clubTablesQuery, liveMatchesQuery } from "@/queries/live";

/**
 * The ranking night: what we are playing, the tables, who could be on one, who
 * is here. Replaces /tables and /today, which were two halves and then one half
 * of this.
 *
 * The roster it needs is the one the club layout already primed; the tables and
 * the live rows are its own.
 */
export const Route = createFileRoute("/app/_authed/$clubSlug/night")({
  staticData: { section: "home" },
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(
        clubTablesQuery(context.activeClubId),
      ),
      context.queryClient.ensureQueryData(
        liveMatchesQuery(context.activeClubId),
      ),
    ]),
  component: RankingNightPage,
});
