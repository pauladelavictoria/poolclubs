import { createFileRoute, redirect } from "@tanstack/react-router";
import OperatorPage from "@/pages/app/OperatorPage";
import { isOperator } from "@/hooks/useAuth";

/**
 * The operator's own page: every club at once.
 *
 * Outside $clubSlug, because it belongs to no club — and the club layout would
 * wrap it in one club's accent and one club's nav, which is the wrong frame for
 * a list of all of them.
 *
 * Two gates, on purpose. This one keeps the page out of the router for anyone
 * else; the SQL function behind it (sql/schema.sql) refuses to return
 * rows regardless. The client-side one is the courtesy, not the security.
 */
export const Route = createFileRoute("/app/_authed/ops")({
  beforeLoad: ({ context }) => {
    if (!isOperator(context.memberships)) throw redirect({ to: "/app" });
  },
  component: OperatorPage,
});
