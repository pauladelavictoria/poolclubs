import { createFileRoute } from "@tanstack/react-router";
import ClubOnboardingPage from "@/pages/app/ClubOnboardingPage";

/**
 * Where somebody with no club at all lands, sent here by /app's signpost.
 *
 * Outside $clubSlug on purpose: it is the one page in the app that belongs to no
 * club. Under /clubs because that segment is already reserved against a club
 * slug ever taking it — see libs/algorithms/slug.ts.
 */
export const Route = createFileRoute("/app/_authed/clubs/none")({
  component: ClubOnboardingPage,
});
