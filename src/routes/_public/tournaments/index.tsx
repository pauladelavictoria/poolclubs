import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import PublicTournamentsPage from "@/pages/public/PublicTournamentsPage";
import { publicTournamentsQuery } from "@/queries/public/tournaments";
import { publicMeta } from "@/libs/algorithms/publicMeta";

/** Literals rather than the exported DISCIPLINES/format lists: those are typed
 *  as plain arrays, and z.enum needs a tuple of literals to keep the parsed
 *  value narrowed. DIFFICULTIES and SKILL_TYPES are `as const` for this same
 *  reason — these three unions have no `as const` list yet, and inlining them
 *  here is cheaper than adding one for a single caller. */
const searchSchema = z.object({
  q: z.string().trim().max(80).optional(),
  status: z.enum(["open", "groups", "running", "done"]).optional(),
  format: z.enum(["double_elim", "league", "group_knockout"]).optional(),
  discipline: z.enum(["8ball", "9ball", "10ball"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
});

export const Route = createFileRoute("/_public/tournaments/")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(publicTournamentsQuery(deps)),
  head: ({ match }) => ({
    meta: publicMeta({
      title: "Tournaments · PoolClubs",
      description:
        "Pool tournaments across every club on PoolClubs — brackets, leagues, entrants and results.",
      path: "/tournaments",
      origin: match.context.origin,
      fallback: "tournaments",
    }),
  }),
  component: PublicTournamentsPage,
});
