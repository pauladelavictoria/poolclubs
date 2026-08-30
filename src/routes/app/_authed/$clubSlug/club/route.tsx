import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import PageTitle from "@/components/layout/PageTitle";
import ClubTabs from "@/components/club/ClubTabs";
import { clubMembersQuery } from "@/queries/players";
import { useT } from "@/i18n";

/** Club settings: what the club is, the room it plays in, and who is in it —
 *  one tab each. Admins only, and the drawer hides the link for everyone else. */
export const Route = createFileRoute("/app/_authed/$clubSlug/club")({
  beforeLoad: ({ context, params }) => {
    if (!context.isClubAdmin) {
      throw redirect({ to: "/app/$clubSlug", params });
    }
  },
  // Primed here rather than per tab: the roster is what Members renders, and
  // Tables reads the same list to find which tablet is paired to which table.
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(clubMembersQuery(context.activeClubId)),
  component: ClubSettingsLayout,
});

function ClubSettingsLayout() {
  const { t } = useT();

  // The club's own name is already in the app bar, three lines up, next to its
  // crest. Repeating it here said where you were and not what you were doing —
  // so the title names the page and the tabs name the part of it.
  return (
    <div className="mx-auto max-w-5xl space-y-4 px-3 py-4">
      <PageTitle title={t("club.settings")} />
      <ClubTabs />
      <Outlet />
    </div>
  );
}
