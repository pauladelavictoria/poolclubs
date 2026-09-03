import { createFileRoute, redirect } from "@tanstack/react-router";
import DrillEditorPage from "@/pages/app/DrillEditorPage";
import { drillQuery } from "@/queries/drills";
import { canEditDrill } from "@/libs/algorithms/drillPermissions";
import { ADMIN_PLAYER_ID } from "@/hooks/useAuth";

export const Route = createFileRoute(
  "/app/_authed/$clubSlug/drills/$drillId/edit",
)({
  staticData: {
    section: "drills",
    crumbs: [
      { labelKey: "drills.title", to: "/app/$clubSlug/drills" },
      { labelKey: "drills.detailTitle", to: "/app/$clubSlug/drills/$drillId" },
    ],
  },
  // Drills are one global library, so who may edit one is a property of the
  // drill, not of the club. Checked here rather than after render, which is
  // where the old <Navigate> did it.
  loader: async ({ context, params }) => {
    const drill = await context.queryClient.query({
      ...drillQuery(Number(params.drillId)),
      staleTime: "static",
    });

    const isAdmin = context.player.id === ADMIN_PLAYER_ID;
    if (!canEditDrill(drill.created_by, context.user.id, isAdmin)) {
      throw redirect({ to: "/app/$clubSlug/drills/$drillId", params });
    }

    return drill;
  },
  component: DrillEditorPage,
});
