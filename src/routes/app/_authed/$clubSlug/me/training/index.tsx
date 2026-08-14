import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * "me" resolves to the signed-in player's own URL, so a link can exist before
 * the id is known. A redirect in beforeLoad rather than a component rendering
 * <Navigate>: nothing mounts, nothing fetches, and the address bar only ever
 * shows the real page.
 */
export const Route = createFileRoute("/app/_authed/$clubSlug/me/training/")({
  beforeLoad: ({ context, params }) => {
    throw redirect({
      to: "/app/$clubSlug/players/$playerId/training",
      params: { ...params, playerId: String(context.player.id) },
    });
  },
});
