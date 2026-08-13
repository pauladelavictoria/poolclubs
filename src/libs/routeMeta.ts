import { useMatches, useParams } from "react-router-dom";
import type { Key } from "@/i18n";
import type { SectionId } from "@/libs/sections";

/**
 * What a route is, said once, on the route.
 *
 * The app bar is mounted by the layout and no longer knows which page is under
 * it, so the two things that used to be passed per page — which section this
 * belongs to and what it hangs off — live on the route instead. The header
 * reads the last crumb to draw its back chevron; the page body reads the whole
 * trail for its breadcrumbs. One declaration, two readers.
 */
export type Crumb = { labelKey: Key; to: string };

export type RouteMeta = {
  section?: SectionId;
  /** Ancestors, outermost first. Paths may carry :params from the URL. */
  crumbs?: Crumb[];
};

/** ":playerId" → the id in the current URL. */
export function fillPath(
  path: string,
  params: Readonly<Record<string, string | undefined>>,
) {
  return path.replace(/:(\w+)/g, (whole, name: string) => params[name] ?? whole);
}

/**
 * The metadata of the deepest route that declares any — a leaf without a handle
 * (a redirect, a guard) shouldn't blank out what its parent said.
 */
export function useRouteMeta(): { section?: SectionId; crumbs: Crumb[] } {
  const matches = useMatches();
  const params = useParams();

  const meta = [...matches].reverse().find((m) => m.handle)?.handle as
    | RouteMeta
    | undefined;

  return {
    section: meta?.section,
    crumbs: (meta?.crumbs ?? []).map((c) => ({
      ...c,
      to: fillPath(c.to, params),
    })),
  };
}
