import { createFileRoute } from "@tanstack/react-router";
import ClubMembersPage from "@/pages/app/ClubMembersPage";

/** The way in, and everyone who took it. */
export const Route = createFileRoute("/app/_authed/$clubSlug/club/members")({
  component: ClubMembersPage,
});
