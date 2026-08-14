import { createFileRoute, redirect } from "@tanstack/react-router";
import ClubPage from "@/pages/ClubPage";
import { clubMembersQuery } from "@/queries/players";

/** Club settings: the roster including pending requests, plus name, crest and
 *  accent. Admins only, and the drawer hides the link for everyone else. */
export const Route = createFileRoute("/app/_authed/$clubSlug/club")({
  beforeLoad: ({ context, params }) => {
    if (!context.isClubAdmin) {
      throw redirect({ to: "/app/$clubSlug", params });
    }
  },
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(
      clubMembersQuery(context.activeClubId),
    ),
  component: ClubPage,
});
