import { createFileRoute } from "@tanstack/react-router";
import ProsePage from "@/pages/public/ProsePage";
import { publicMeta, canonical } from "@/libs/algorithms/publicMeta";

/**
 * GDPR arts. 13–14: the policy has to be reachable at the point where data is
 * collected, which is the signup screen and the join link. Blocking for the
 * first signup that is not us.
 */
export const Route = createFileRoute("/_public/legal/privacy")({
  head: ({ match }) => ({
    meta: publicMeta({
      title: "Privacy policy · PoolClubs",
      description:
        "What PoolClubs processes, why, who can see it, and how to exercise your rights.",
      path: "/legal/privacy",
      origin: match.context.origin,
      fallback: "default",
    }),
    links: canonical("/legal/privacy", match.context.origin),
  }),
  component: () => <ProsePage id="privacy" />,
});
