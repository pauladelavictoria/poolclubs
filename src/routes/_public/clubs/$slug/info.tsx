import { createFileRoute } from "@tanstack/react-router";
import { ClubInfoTab } from "@/pages/public/PublicClubPage";

/** What the club says it is: its room, its hours, its phone. */
export const Route = createFileRoute("/_public/clubs/$slug/info")({
  component: ClubInfoTab,
});
