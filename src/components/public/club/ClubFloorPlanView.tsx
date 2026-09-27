import { Card } from "@/components/ui/Card";
import { SectionHead } from "@/components/ui/SectionHead";
import { type PublicClubTable } from "@/queries/public/clubs";
import TableFloorPlanSvg from "@/components/club/TableFloorPlanSvg";
import {
  fitViewBox,
  type TablePlacement,
} from "@/libs/algorithms/tableFloorPlan";
import { useT } from "@/i18n";

/**
 * The room, drawn to scale — read-only, built from the exact geometry
 * ClubFloorPlanEditor edits (see tableFloorPlan.ts and TableFloorPlanSvg).
 * Absent when no table has been placed on the admin's floor plan yet.
 */
export function ClubFloorPlanView({ tables }: { tables: PublicClubTable[] }) {
  const { t } = useT();
  const placed: TablePlacement[] = tables
    .filter((table) => table.map_x != null && table.map_y != null)
    .map((table) => ({
      id: table.id,
      x: table.map_x!,
      y: table.map_y!,
      rotationDeg: table.map_rotation ?? 0,
      type: table.type,
      size: table.size,
    }));

  if (placed.length === 0) return null;

  const labels = Object.fromEntries(
    tables.map((table) => [table.id, table.label]),
  );

  return (
    <section className="mt-8">
      <SectionHead title={t("club.floorPlanTitle")} />
      <Card className="mt-4 p-4">
        <TableFloorPlanSvg
          tables={placed}
          labels={labels}
          viewBox={fitViewBox(placed)}
          className="h-72 w-full rounded-card bg-pocket sm:h-96"
        />
      </Card>
    </section>
  );
}
