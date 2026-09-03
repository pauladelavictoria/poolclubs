import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import DrillsPage from "@/pages/app/DrillsPage";
import { drillsQuery } from "@/queries/drills";
import { DIFFICULTIES, SKILL_TYPES } from "@/types";

/** The filters are in the URL so the loader can key on them — and so a filtered
 *  library is a link. */
const searchSchema = z.object({
  difficulty: z.enum(DIFFICULTIES).optional(),
  skill: z.enum(SKILL_TYPES).optional(),
});

export const Route = createFileRoute("/app/_authed/$clubSlug/drills/")({
  staticData: { section: "drills" },
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient.query({
      ...drillsQuery(context.activeClubId, {
        difficulty: deps.difficulty,
        skill_type: deps.skill,
      }),
      staleTime: "static",
    }),
  component: DrillsPage,
});
