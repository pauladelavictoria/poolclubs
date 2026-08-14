import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import AddGamePage from "@/pages/AddGamePage";

export const Route = createFileRoute("/app/_authed/$clubSlug/games/new")({
  staticData: {
    section: "games",
    crumbs: [{ labelKey: "nav.games", to: "/app/$clubSlug/games" }],
  },
  // Arrives set when a challenge is being played out, so the form can close the
  // challenge with the result.
  validateSearch: z.object({
    challenge: z.coerce.number().int().positive().optional(),
  }),
  component: AddGamePage,
});
