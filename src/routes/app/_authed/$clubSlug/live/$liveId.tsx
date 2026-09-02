import { createFileRoute } from "@tanstack/react-router";
import LiveMatchPage from "@/pages/app/LiveMatchPage";
import { liveMatchQuery } from "@/queries/live";

export const Route = createFileRoute("/app/_authed/$clubSlug/live/$liveId")({
  staticData: {
    section: "games",
    crumbs: [{ labelKey: "nav.night", to: "/app/$clubSlug/night" }],
    // The scoreboard is the screen. Nobody mid-rack wants a tab bar offering
    // them the rankings, and the space it reserves is the space the score
    // should be read from.
    fullBleed: true,
    // On the club's tablet the scoreboard is the whole screen. The bar has
    // nothing on it that belongs to a device, and its height comes straight off
    // the numerals. A player on their own phone still gets it.
    bareOnDevice: true,
  },
  // Often the first thing a tab loads — both players open this link straight
  // from a message — so the match itself is primed rather than waited for.
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(liveMatchQuery(params.liveId)),
  component: LiveMatchPage,
});
