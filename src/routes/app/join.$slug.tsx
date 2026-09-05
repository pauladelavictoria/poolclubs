import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import JoinClubPage from "@/pages/app/JoinClubPage";
import { clubPreviewQuery } from "@/queries/club";

/**
 * The invite link, and the one place a membership is asked for.
 *
 * Public, all the way through: the club's name and its unclaimed players are
 * what the link is for, and somebody without an account has to be able to read
 * them before deciding to make one. The page sends them to sign up and brings
 * them back — see JoinClubPage.
 */
export const Route = createFileRoute("/app/join/$slug")({
  validateSearch: z.object({
    // Set by $clubSlug when somebody arrives at a club they asked to join but
    // has not actually asked yet — the sign-up round trip. It means "file the
    // request and get out of the way", so the page submits it itself.
    auto: z.literal(1).optional().catch(undefined),
  }),

  // Awaited, so the club's name and the way in are in the server's HTML: this
  // is where an invite link lands somebody who has never signed in, and a card
  // that is blank until JavaScript arrives is a card they close.
  //
  // The catch is what keeps it off the error boundary — a bad slug stays a
  // state the page renders ("that link doesn't work"), which is what the
  // component reads back out of the cache.
  loader: ({ context, params }) =>
    context.queryClient
      .query({ ...clubPreviewQuery(params.slug), staleTime: "static" })
      .catch(() => null),

  component: JoinClubPage,
});
