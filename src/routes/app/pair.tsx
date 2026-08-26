import { createFileRoute } from "@tanstack/react-router";
import PairDevicePage from "@/pages/app/PairDevicePage";

/**
 * Outside the signed-in guard on purpose: a tablet arriving here has no account
 * yet, and the code is what gets it one. Inside /app so the installed PWA opens
 * it rather than the browser — the same reason login lives here.
 */
export const Route = createFileRoute("/app/pair")({
  component: PairDevicePage,
});
