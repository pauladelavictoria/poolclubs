import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import PublicDrillsPage from "@/pages/public/PublicDrillsPage";
import { publicDrillsQuery } from "@/queries/public/drills";
import { publicMeta } from "@/libs/algorithms/publicMeta";
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
    context.queryClient.query({
      ...publicDrillsQuery({
        q: deps.q,
        difficulty: deps.difficulty,
        skill_type: deps.skill,
      }),
      staleTime: "static",
    }),
  head: ({ match }) => ({
    meta: publicMeta({
      title: "Ejercicios de billar · PoolClubs",
      description:
        "Biblioteca gratuita de ejercicios de billar con diagramas de mesa, colocación y puntuación. Filtra por dificultad y por la habilidad que entrenan.",
      path: "/drills",
      origin: match.context.origin,
      fallback: "drills",
    }),
  }),
  component: PublicDrillsPage,
});
