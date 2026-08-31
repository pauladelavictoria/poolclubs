import { createFileRoute } from "@tanstack/react-router";
import ProsePage from "@/pages/public/ProsePage";
import { publicMeta, canonical } from "@/libs/algorithms/publicMeta";

/**
 * The price, while there isn't one.
 *
 * A club owner looks for this page before he looks at the product, and its
 * absence reads as "there is a price and they won't say it". The answer today is
 * free, and the sentence that matters is the grandfathering: the clubs in the
 * beta keep it free once there is a fee.
 */
export const Route = createFileRoute("/_public/pricing")({
  head: ({ match }) => ({
    meta: publicMeta({
      title: "Precios · PoolClubs",
      description:
        "Gratis durante la beta, y gratis para siempre para los clubes que la prueben. Los jugadores nunca pagan.",
      path: "/pricing",
      origin: match.context.origin,
      fallback: "default",
    }),
    links: canonical("/pricing", match.context.origin),
  }),
  component: () => <ProsePage id="pricing" />,
});
