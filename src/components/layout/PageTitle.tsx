import { Fragment, type ReactNode } from "react";
import { AppLink } from "@/components/layout/AppLink";
import { LuChevronRight } from "react-icons/lu";
import { useRouteMeta, type CrumbLink } from "@/libs/routeMeta";
import { useT } from "@/i18n";

type Props = {
  title: ReactNode;
  /**
   * Replaces the route's own trail when a crumb is named by data rather than
   * by the route — a player's name, say. Ancestors only: this page is the h1
   * below, not a link back to itself.
   */
  crumbs?: (CrumbLink & { label: string })[];
  /** Wrapper classes for pages that have no content container to sit inside. */
  className?: string;
  /** Page actions, on the title's row. */
  children?: ReactNode;
};

/**
 * The page's name, in the page. The app bar carries identity; this carries
 * place — so the title gets h2-sized type instead of being squeezed into a
 * 56px bar between a bell and an avatar, and the action that belongs to the
 * page sits beside the title rather than in the app's chrome.
 */
export default function PageTitle({
  title,
  crumbs,
  className,
  children,
}: Props) {
  const { t } = useT();
  const meta = useRouteMeta();

  const trail: (CrumbLink & { label: string })[] =
    crumbs ??
    meta.crumbs.map((c) => ({
      label: t(c.labelKey),
      to: c.to,
      params: c.params,
    }));

  return (
    <div className={className}>
      {/* A single crumb over a page whose title says the same thing is noise;
          the trail earns its line once there is a path to show. */}
      {trail.length > 0 && (
        <nav
          aria-label={t("nav.breadcrumb")}
          className="mb-1.5 flex items-center gap-1 text-caption text-ink-faint"
        >
          {trail.map((crumb, i) => (
            <Fragment key={String(crumb.to)}>
              {i > 0 && (
                <LuChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
              )}
              <AppLink
                to={crumb.to}
                params={crumb.params}
                viewTransition
                className="truncate transition-colors duration-150 hover:text-strike"
              >
                {crumb.label}
              </AppLink>
            </Fragment>
          ))}
        </nav>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-h2 font-semibold text-ink">{title}</h1>
        </div>
        {children && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
