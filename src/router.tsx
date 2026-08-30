// First, and for side effects only: patches the runtime APIs an old tablet's
// Chrome lacks before any dependency below gets a chance to call one.
import "@/libs/browser/polyfills";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { routeTree } from "./routeTree.gen";
import { makeQueryClient } from "@/libs/queryClient";
import RouteError from "@/components/layout/RouteError";
import { NotFound } from "@/components/layout/NotFound";

/**
 * Called once per request on the server and once per page load in the browser.
 *
 * The QueryClient is created here rather than imported so each request gets its
 * own cache — see libs/queryClient.ts. It goes into the router context, which is
 * how loaders reach it: `context.queryClient.ensureQueryData(...)`.
 */
export function getRouter() {
  const queryClient = makeQueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: "intent",
    // React Query owns freshness, the router owns retention. Left at its
    // default the router would consider preloaded data fresh and never let the
    // query cache decide, and the two would disagree about what is stale.
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: RouteError,
    defaultNotFoundComponent: NotFound,
    scrollRestoration: true,
    scrollToTopSelectors: ['[data-scroll-restoration-id="app-shell"]'],
  });

  // Dehydrates whatever the loaders primed into the HTML, so the client renders
  // from the server's data instead of refetching it.
  setupRouterSsrQueryIntegration({ router, queryClient });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
