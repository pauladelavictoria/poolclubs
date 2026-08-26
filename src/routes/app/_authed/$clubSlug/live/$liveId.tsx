import { createFileRoute } from "@tanstack/react-router";
import LiveMatchPage from "@/pages/app/LiveMatchPage";
import { liveMatchQuery } from "@/queries/live";

export const Route = createFileRoute("/app/_authed/$clubSlug/live/$liveId")({
  staticData: {
    section: "games",
    crumbs: [{ labelKey: "nav.today", to: "/app/$clubSlug/today" }],
    // The scoreboard is the screen. Nobody mid-rack wants a tab bar offering
    // them the rankings, and the space it reserves is the space the score
    // should be read from.
    fullBleed: true,
  },
  // Often the first thing a tab loads — both players open this link straight
  // from a message — so the match itself is primed rather than waited for.
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(liveMatchQuery(params.liveId)),
  component: LiveMatchPage,
});
