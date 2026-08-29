import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import PairDevicePage from "@/pages/app/PairDevicePage";

/**
 * Outside the signed-in guard on purpose: a tablet arriving here has no account
 * yet, and the code is what gets it one. Inside /app so the installed PWA opens
 * it rather than the browser — the same reason login lives here.
 */
export const Route = createFileRoute("/app/pair")({
  validateSearch: z.object({
    // Carried by the QR the club's table settings show, so the tablet only has
    // to confirm. Still redeemed by the same server function as a typed code —
    // it comes off the URL, so it buys nothing but the typing.
    code: z.string().optional(),
  }),

  component: PairDevicePage,
});
