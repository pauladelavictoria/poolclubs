import { createFileRoute } from "@tanstack/react-router";
import ClubRequestPage from "@/pages/public/ClubRequestPage";
import { publicMeta, canonical } from "@/libs/algorithms/publicMeta";

/**
 * A static sibling of /clubs/$slug, and it wins the match — which is why "new"
 * is in the reserved slug list on both sides (libs/algorithms/slug.ts and
 * club_slug_reserved in sql/schema.sql).
 */
export const Route = createFileRoute("/_public/clubs/new")({
  head: ({ match }) => ({
    meta: publicMeta({
      title: "Da de alta tu club · PoolClubs",
      description:
        "¿Tu club no está en PoolClubs? Pídenos que lo demos de alta y te lo dejamos listo para invitar a tus socios.",
      path: "/clubs/new",
      origin: match.context.origin,
      fallback: "clubs",
    }),
    links: canonical("/clubs/new", match.context.origin),
  }),
  component: ClubRequestPage,
});
