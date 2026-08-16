import { createFileRoute, redirect } from "@tanstack/react-router";
import JoinClubPage from "@/pages/app/JoinClubPage";
import { clubPreviewQuery } from "@/queries/club";
import { loginLink } from "@/libs/nextPath";

/**
 * The invite link. Outside _authed because the preview is readable by anybody —
 * the club's name and its unclaimed players are what the link is for — but
 * joining needs an account, so this does its own bounce through login.
 */
export const Route = createFileRoute("/app/join/$code")({
  beforeLoad: ({ context, params }) => {
    if (!context.session) {
      throw redirect({ href: loginLink(`/app/join/${params.code}`) });
    }
  },

  // Deliberately not awaited into a hard failure: a bad code is a state the page
  // renders ("that link doesn't work"), not an error boundary.
  loader: ({ context, params }) => {
    void context.queryClient
      .ensureQueryData(clubPreviewQuery(params.code))
      .catch(() => null);
  },

  component: JoinClubPage,
});
