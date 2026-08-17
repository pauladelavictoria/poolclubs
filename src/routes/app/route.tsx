import { Outlet, createFileRoute } from "@tanstack/react-router";

/**
 * /app, with no chrome and no guard.
 *
 * The nav rail, drawer and header used to live here, but they need to know which
 * club they are navigating — so they moved down to $clubSlug. What is left over
 * are the three doors that open from outside a club: signing in, following a
 * join link, and starting a club. All three are self-contained cards that want a
 * bare page.
 */
export const Route = createFileRoute("/app")({
  component: () => <Outlet />,
});
