import { createFileRoute } from "@tanstack/react-router";
import InvitePrintPage from "@/pages/app/InvitePrintPage";

/**
 * The printable invite poster.
 *
 * No guard of its own: any member of the club may invite — the drawer's "send
 * invite" says as much — and the club layout above has already turned away
 * everybody else. The code on the sheet only gets somebody as far as a join
 * request, which an admin still has to approve.
 */
export const Route = createFileRoute("/app/_authed/$clubSlug/invite/print")({
  staticData: {
    crumbs: [{ labelKey: "nav.clubSettings", to: "/app/$clubSlug/club" }],
  },
  component: InvitePrintPage,
});
