import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import PublicDrillsPage from "@/pages/PublicDrillsPage";
import { publicDrillsQuery } from "@/queries/public";
import { publicMeta } from "@/libs/publicMeta";
import { DIFFICULTIES, SKILL_TYPES } from "@/types";

const searchSchema = z.object({
  q: z.string().trim().max(80).optional(),
  difficulty: z.enum(DIFFICULTIES).optional(),
  skill: z.enum(SKILL_TYPES).optional(),
});

export const Route = createFileRoute("/_public/drills/")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(
      publicDrillsQuery({
        q: deps.q,
        difficulty: deps.difficulty,
        skill_type: deps.skill,
      }),
    ),
  head: ({ match }) => ({
    meta: publicMeta({
      title: "Pool drills · PoolClubs",
      description:
        "A free library of pool practice drills with table diagrams, setup and scoring. Filter by difficulty and by the skill they train.",
      path: "/drills",
      origin: match.context.origin,
      fallback: "drills",
    }),
  }),
  component: PublicDrillsPage,
});
