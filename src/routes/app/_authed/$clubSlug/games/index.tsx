import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import GamesPage, { PAGE_SIZE } from "@/pages/app/GamesPage";
import { gamesQuery } from "@/queries/games";

/**
 * The filters live in the URL rather than in useState.
 *
 * A loader can only key on the URL, so page-2-filtered-by-division had to become
 * something the address bar knows about. It also means a filtered view is now a
 * link somebody can send.
 */
const searchSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  playerId: z.coerce.number().int().positive().optional(),
  category: z.coerce.number().int().min(1).max(3).optional(),
});

export const Route = createFileRoute("/app/_authed/$clubSlug/games/")({
  staticData: { section: "games" },
  validateSearch: searchSchema,
  // Only what the loader reads, or every unrelated search change refetches.
  loaderDeps: ({ search }) => ({
    page: search.page,
    playerId: search.playerId,
    category: search.category,
  }),
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(
      gamesQuery(context.activeClubId, { ...deps, pageSize: PAGE_SIZE }),
    ),
  component: GamesPage,
});
