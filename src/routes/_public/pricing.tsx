import { createFileRoute } from "@tanstack/react-router";
import ProsePage from "@/pages/public/ProsePage";
import { publicMeta, canonical } from "@/libs/algorithms/publicMeta";

/**
 * The price.
 *
 * A club owner looks for this page before looking at the product, and its
 * absence reads as "there is a price and they won't say it". So it says the
 * number: €15 a month per club, with the first month free for clubs that
 * join during the beta. No free-forever promise.
 */
export const Route = createFileRoute("/_public/pricing")({
  head: ({ match }) => ({
    meta: publicMeta({
      title: "Precios · PoolClubs",
      description:
        "15 € al mes por club. Los clubes que entran durante la beta tienen el primer mes gratis. Los jugadores no pagan nunca.",
      path: "/pricing",
      origin: match.context.origin,
      fallback: "default",
    }),
    links: canonical("/pricing", match.context.origin),
  }),
  component: () => <ProsePage id="pricing" />,
});
