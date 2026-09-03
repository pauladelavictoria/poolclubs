import { createFileRoute } from "@tanstack/react-router";
import LandingPage from "@/pages/public/LandingPage";
import { canonical, publicMeta } from "@/libs/algorithms/publicMeta";

/**
 * The public front door. Everything a signed-in member uses lives under /app,
 * which is also the PWA's start URL — so installing the app skips the pitch.
 *
 * The head is the same helper every other public page uses. It was missing
 * here, which is the one place it is most expensive to miss: this is the URL
 * people actually paste into a chat, and with no og:image the card was a line
 * of text.
 */
export const Route = createFileRoute("/_public/")({
  head: ({ match }) => ({
    meta: publicMeta({
      // The headline, not the product name: og:site_name already prints
      // "PoolClubs" above it, and a tab reading only the brand tells a visitor
      // with nine tabs open nothing.
      title: "Todo lo que juega tu club, en un sitio.",
      description:
        "PoolClubs lleva el registro de tu club de billar: rankings Elo, resultados de partidas, retos, torneos y planes de entrenamiento.",
      path: "/",
      origin: match.context.origin,
      fallback: "default",
    }),
    links: canonical("/", match.context.origin),
  }),
  component: LandingPage,
});
