import { createFileRoute } from "@tanstack/react-router";
import ProsePage from "@/pages/public/ProsePage";
import { publicMeta, canonical } from "@/libs/publicMeta";

/** The rules of the service, including the two promises the pitch makes: 16+
 *  accounts with juniors as guest players, and the beta clubs' free-forever. */
export const Route = createFileRoute("/_public/legal/terms")({
  head: ({ match }) => ({
    meta: publicMeta({
      title: "Terms of use · PoolClubs",
      description:
        "Who can use PoolClubs, what to expect from the service, and what it expects from you.",
      path: "/legal/terms",
      origin: match.context.origin,
      fallback: "default",
    }),
    links: canonical("/legal/terms", match.context.origin),
  }),
  component: () => <ProsePage id="terms" />,
});
