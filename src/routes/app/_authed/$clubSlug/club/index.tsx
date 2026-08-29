import { createFileRoute } from "@tanstack/react-router";
import ClubInfoPage from "@/pages/app/ClubInfoPage";

/** Name, crest, accent, where it is and what clock it keeps. */
export const Route = createFileRoute("/app/_authed/$clubSlug/club/")({
  component: ClubInfoPage,
});
