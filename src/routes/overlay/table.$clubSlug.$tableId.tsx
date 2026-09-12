import { createFileRoute } from "@tanstack/react-router";
import OverlayTablePage from "@/pages/public/OverlayTablePage";

/**
 * The OBS Browser Source bolted to one table — see
 * docs/youtube-streaming.md Phase 1. Table-keyed rather than match-keyed so a
 * pre-generated OBS scene's URL never needs touching again between rounds or
 * tournaments — a camera is bolted to a table, not to a fixture.
 *
 * No loader: unlike the match-keyed route, nobody ever 404s here — see
 * OverlayTablePage for why a bad param just renders transparent instead.
 * Also left out of publicCache.ts's PUBLIC_PREFIXES, same reason as the
 * match-keyed route.
 */
export const Route = createFileRoute("/overlay/table/$clubSlug/$tableId")({
  component: OverlayTablePage,
});
