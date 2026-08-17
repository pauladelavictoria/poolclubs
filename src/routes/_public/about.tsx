import { createFileRoute } from "@tanstack/react-router";
import ProsePage from "@/pages/public/ProsePage";
import { publicMeta, canonical } from "@/libs/publicMeta";

/** Who is behind this and why it exists — the authority signal the landing page
 *  buries in a feature body. */
export const Route = createFileRoute("/_public/about")({
  head: ({ match }) => ({
    meta: publicMeta({
      title: "About · PoolClubs",
      description:
        "A tool for pool clubs, built by people who have run tournaments and kept a ranking in a spreadsheet.",
      path: "/about",
      origin: match.context.origin,
      fallback: "default",
    }),
    links: canonical("/about", match.context.origin),
  }),
  component: () => <ProsePage id="about" />,
});
