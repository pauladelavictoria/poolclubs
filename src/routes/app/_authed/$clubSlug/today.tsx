import { createFileRoute, redirect } from "@tanstack/react-router";

/** The club night is called ranking night, and lives at /night. Kept as a
 *  redirect: this URL is on somebody's home screen, and was the one the nav
 *  pointed at for long enough to be bookmarked. */
export const Route = createFileRoute("/app/_authed/$clubSlug/today")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/app/$clubSlug/night", params, replace: true });
  },
});
