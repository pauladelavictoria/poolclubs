import { createFileRoute } from "@tanstack/react-router";
import { ClubPlayersTab } from "@/pages/public/PublicClubPage";

/** Everyone who plays here and chose to be listed. */
export const Route = createFileRoute("/_public/clubs/$slug/players")({
  component: ClubPlayersTab,
});
