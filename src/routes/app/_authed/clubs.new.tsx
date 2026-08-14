import { createFileRoute } from "@tanstack/react-router";
import ClubOnboardingPage from "@/pages/ClubOnboardingPage";

/**
 * Outside $clubSlug on purpose: starting or joining another club is the one
 * club-shaped thing you can do without being in one — and it is also where
 * somebody with no club at all lands.
 */
export const Route = createFileRoute("/app/_authed/clubs/new")({
  component: ClubOnboardingPage,
});
