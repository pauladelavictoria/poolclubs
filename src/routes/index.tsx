import { createFileRoute } from "@tanstack/react-router";
import LandingPage from "@/pages/LandingPage";

/**
 * The public front door. Everything a signed-in member uses lives under /app,
 * which is also the PWA's start URL — so installing the app skips the pitch.
 */
export const Route = createFileRoute("/")({
  component: LandingPage,
});
