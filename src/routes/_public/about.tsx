import { createFileRoute } from "@tanstack/react-router";
import ProsePage from "@/pages/public/ProsePage";
import { publicMeta, canonical } from "@/libs/algorithms/publicMeta";

/** Who is behind this and why it exists — the authority signal the landing page
 *  buries in a feature body. */
export const Route = createFileRoute("/_public/about")({
  head: ({ match }) => ({
    meta: publicMeta({
      title: "Qué es · PoolClubs",
      description:
        "Una herramienta para clubes de billar, hecha por gente que ha organizado torneos y ha llevado un ranking en una hoja de cálculo.",
      path: "/about",
      origin: match.context.origin,
      fallback: "default",
    }),
    links: canonical("/about", match.context.origin),
  }),
  component: () => <ProsePage id="about" />,
});
