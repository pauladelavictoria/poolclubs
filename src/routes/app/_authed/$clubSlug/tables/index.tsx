import { createFileRoute, redirect } from "@tanstack/react-router";

/** The tables grid is the top of /today now. Kept as a redirect: this URL is
 *  what a club's own bookmark bar points at. `/tables/$tableId` stays — it is
 *  one table's own screen, and a pinned tablet lives on it. */
export const Route = createFileRoute("/app/_authed/$clubSlug/tables/")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/app/$clubSlug/today", params, replace: true });
  },
});
