import { createFileRoute, redirect } from "@tanstack/react-router";

/** The board by the door is a section of /today now. Kept as a redirect: this
 *  URL is on somebody's home screen. */
export const Route = createFileRoute("/app/_authed/$clubSlug/night")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/app/$clubSlug/today", params, replace: true });
  },
});
