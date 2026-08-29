import { createFileRoute } from "@tanstack/react-router";
import ClubTablesCard from "@/components/club/ClubTablesCard";

/** The room itself: the tables, and the tablet bolted to each one. The card
 *  carries the whole tab, so there is no page wrapper around it. */
export const Route = createFileRoute("/app/_authed/$clubSlug/club/tables")({
  component: ClubTablesCard,
});
