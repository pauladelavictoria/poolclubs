import { createFileRoute } from "@tanstack/react-router";
import ClubTablesCard from "@/components/club/ClubTablesCard";
import ClubFloorPlanEditor from "@/components/club/ClubFloorPlanEditor";

/** The room itself: the tables, the tablet bolted to each one, and the floor
 *  plan they sit on. No page wrapper of their own — the parent layout
 *  (club/route.tsx) already spaces its children. */
export const Route = createFileRoute("/app/_authed/$clubSlug/club/tables")({
  component: ClubTablesTab,
});

function ClubTablesTab() {
  return (
    <>
      <ClubTablesCard />
      <ClubFloorPlanEditor />
    </>
  );
}
