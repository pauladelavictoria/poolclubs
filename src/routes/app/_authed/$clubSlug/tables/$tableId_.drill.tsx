import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import TableDrillPage from "@/pages/app/TableDrillPage";

export const Route = createFileRoute(
  "/app/_authed/$clubSlug/tables/$tableId_/drill",
)({
  staticData: {
    section: "home",
    crumbs: [{ labelKey: "nav.night", to: "/app/$clubSlug/night" }],
    // Same screen as the table it hangs off: a tablet on the rail, no tab bar.
    fullBleed: true,
  },
  // Who is shooting, picked on the table's own page before coming here.
  validateSearch: z.object({
    player: z.coerce.number().int().positive().optional().catch(undefined),
  }),
  component: TableDrillPage,
});
