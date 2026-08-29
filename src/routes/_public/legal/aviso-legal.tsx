import { createFileRoute } from "@tanstack/react-router";
import ProsePage from "@/pages/public/ProsePage";
import { publicMeta, canonical } from "@/libs/algorithms/publicMeta";

/**
 * LSSI-CE art. 10. Required of any information-society service offered from
 * Spain, and it is the page that has to carry a real name, NIF and address —
 * see OPERATOR in src/content/legal.ts, which is still placeholders.
 *
 * The path keeps its Spanish name in all three languages: it is a Spanish legal
 * obligation, and it is the name somebody looks for.
 */
export const Route = createFileRoute("/_public/legal/aviso-legal")({
  head: ({ match }) => ({
    meta: publicMeta({
      title: "Aviso legal · PoolClubs",
      description: "Operator information, as required by article 10 LSSI-CE.",
      path: "/legal/aviso-legal",
      origin: match.context.origin,
      fallback: "default",
    }),
    links: canonical("/legal/aviso-legal", match.context.origin),
  }),
  component: () => <ProsePage id="aviso-legal" />,
});
