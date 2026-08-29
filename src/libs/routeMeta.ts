import { useMatches, useParams } from "@tanstack/react-router";
import type { LinkProps } from "@tanstack/react-router";
import type { Key } from "@/i18n";
import type { SectionId } from "@/libs/sections";

/**
 * What a route is, said once, on the route.
 *
 * The app bar is mounted by the club layout and no longer knows which page is
 * under it, so the two things that used to be passed per page — which section
 * this belongs to and what it hangs off — live on the route instead. The header
 * reads the last crumb to draw its back chevron; the page body reads the whole
 * trail for its breadcrumbs. One declaration, two readers.
 *
 * A crumb keeps the route's own pattern ("/app/$clubSlug/players") rather than a
 * path with the ids already substituted. That used to need a `fillPath` helper
 * doing its own :param replacement; now the router substitutes them from
 * `params`, and a crumb pointing at a route that doesn't exist is a build error.
 */
export type CrumbLink = {
  to: LinkProps["to"];
  /** A plain record rather than the router's own parameter type, which also
   *  allows `true` and a reducer function — neither of which a crumb needs, and
   *  both of which would leak into every reader. */
  params?: Record<string, string>;
};

export type Crumb = CrumbLink & { labelKey: Key };

export type RouteMeta = {
  section?: SectionId;
  /** Ancestors, outermost first. */
  crumbs?: Crumb[];
  fullBleed?: boolean;
  /**
   * Drop the app bar too, but only for the club's own device.
   *
   * `fullBleed` is about the page; this is about who is looking at it. A tablet
   * signed in as the club has no notifications to check and no profile to open,
   * so the bar above the scoreboard is a strip of chrome for nobody — and it
   * pushes the numerals off the middle of the display. A member on their own
   * phone keeps it: that is how they get back out.
   */
  bareOnDevice?: boolean;
};

declare module "@tanstack/react-router" {
  interface StaticDataRouteOption {
    section?: SectionId;
    crumbs?: Crumb[];
    fullBleed?: boolean;
    bareOnDevice?: boolean;
  }
}

/**
 * The metadata of the deepest route that declares any — a leaf without static
 * data (a redirect, a pathless guard) shouldn't blank out what its parent said.
 *
 * Every crumb is handed the current URL's full parameter set. Passing more than
 * a given crumb needs is harmless, and it means a route declaring its trail does
 * not also have to restate where the ids come from.
 */
export function useRouteMeta(): {
  section?: SectionId;
  crumbs: Crumb[];
  fullBleed: boolean;
  bareOnDevice: boolean;
} {
  const matches = useMatches();
  const params = useParams({ strict: false });

  const meta = [...matches]
    .reverse()
    .find((m) => m.staticData && Object.keys(m.staticData).length > 0)
    ?.staticData as RouteMeta | undefined;

  return {
    section: meta?.section,
    fullBleed: meta?.fullBleed ?? false,
    bareOnDevice: meta?.bareOnDevice ?? false,
    crumbs: (meta?.crumbs ?? []).map((c) => ({
      ...c,
      params: c.params ?? params,
    })),
  };
}
