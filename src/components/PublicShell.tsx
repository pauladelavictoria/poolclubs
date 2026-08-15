import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { LuSearch } from "react-icons/lu";
import { useT } from "@/i18n";
import type { Key } from "@/i18n";

/**
 * The public side of the site: a bar with the product name and the public
 * sections, and a page under it.
 *
 * Nothing in here is club-scoped, which is the whole distinction — /drills is
 * the shared library as anyone can see it, /app/$clubSlug/drills is a club's own
 * view of it, and they are different route trees on purpose.
 *
 * The chrome (nav, footer) is mounted once by the _public layout route. This
 * component is the page inside it, so a route that wants a hero of its own —
 * every profile page does — renders one as `children` and leaves `title` off.
 */
const PUBLIC_NAV: {
  to: "/clubs" | "/players" | "/tournaments" | "/drills";
  labelKey: Key;
}[] = [
  { to: "/clubs", labelKey: "nav.publicClubs" },
  { to: "/players", labelKey: "nav.publicPlayers" },
  { to: "/tournaments", labelKey: "nav.publicTournaments" },
  { to: "/drills", labelKey: "nav.publicDrills" },
];

export default function PublicShell({
  title,
  subtitle,
  actions,
  children,
}: {
  /** Left off by pages that draw their own header. */
  title?: string;
  subtitle?: string;
  /** Search, filters, a share button — whatever belongs beside the title. */
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto max-w-5xl px-3 py-6">
      {title && (
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-h1 font-semibold tracking-tight text-ink">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1 max-w-[60ch] text-body text-ink-soft">
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </header>
      )}
      <div className={title ? "mt-6" : ""}>{children}</div>
    </main>
  );
}

export function PublicNav() {
  const { t } = useT();

  return (
    <header className="sticky top-0 z-20 border-b border-hairline bg-felt/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <nav className="mx-auto flex h-14 max-w-5xl items-center gap-1 px-3">
        <Link
          to="/"
          className="mr-2 flex shrink-0 items-center gap-2 text-ink transition-colors duration-150 hover:text-strike"
        >
          <img src="/ball.png" alt="" className="h-7 w-7 rounded-full" />
          <span className="text-h4 font-semibold">{t("common.appName")}</span>
        </Link>

        {/* Scrolls rather than wraps: four sections plus a wordmark plus two
            trailing links does not fit a phone, and a nav bar that becomes two
            rows moves the page under it. */}
        <div className="-mx-1 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto px-1">
          {PUBLIC_NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="shrink-0 rounded-control px-3 py-2 text-body text-ink-soft transition-colors duration-150 hover:bg-felt-raised hover:text-ink"
              activeProps={{ className: "text-ink font-medium" }}
            >
              {t(item.labelKey)}
            </Link>
          ))}
        </div>

        <Link
          to="/search"
          aria-label={t("public.search.title")}
          className="shrink-0 rounded-control p-2 text-ink-soft transition-colors duration-150 hover:bg-felt-raised hover:text-ink"
          activeProps={{ className: "text-ink" }}
        >
          <LuSearch className="h-4 w-4" aria-hidden />
        </Link>

        <Link
          to="/app"
          className="shrink-0 rounded-control px-3 py-2 text-body font-medium text-strike transition-colors duration-150 hover:text-strike-light"
        >
          {t("auth.signInShort")}
        </Link>
      </nav>
    </header>
  );
}

export function PublicFooter() {
  const { t } = useT();

  return (
    <footer className="mt-12 border-t border-hairline">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-3 py-8 text-caption text-ink-faint sm:flex-row sm:items-center sm:justify-between">
        <p>{t("public.footer.tagline")}</p>
        <nav className="flex flex-wrap items-center gap-4">
          {PUBLIC_NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="transition-colors duration-150 hover:text-ink"
            >
              {t(item.labelKey)}
            </Link>
          ))}
          <Link
            to="/app"
            className="font-medium text-strike transition-colors duration-150 hover:text-strike-light"
          >
            {t("auth.signInShort")}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
