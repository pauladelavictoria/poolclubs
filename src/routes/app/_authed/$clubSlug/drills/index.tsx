import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import DrillsPage from "@/pages/app/DrillsPage";
import { drillsQuery } from "@/queries/drills";

/** How the library is grouped. In the URL so it survives a reload and is a
 *  link; `.catch` because an old ?difficulty= link should still open. */
const searchSchema = z.object({
  group: z
    .enum(["difficulty", "skill"])
    .default("difficulty")
    .catch("difficulty"),
});

export const Route = createFileRoute("/app/_authed/$clubSlug/drills/")({
  staticData: { section: "drills" },
  validateSearch: searchSchema,
  loader: ({ context }) =>
    context.queryClient.query({
      ...drillsQuery(context.activeClubId),
      staleTime: "static",
    }),
  component: DrillsPage,
});
