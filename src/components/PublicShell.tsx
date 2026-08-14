import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useT } from "@/i18n";
import type { Key } from "@/i18n";

/**
 * The public side of the site: a bar with the product name and the three public
 * sections, and a page under it.
 *
 * Nothing in here is club-scoped, which is the whole distinction — /drills is
 * the shared library as anyone can see it, /app/$clubSlug/drills is a club's own
 * view of it, and they are different route trees on purpose.
 */
const PUBLIC_NAV: { to: "/clubs" | "/tournaments" | "/drills"; labelKey: Key }[] =
  [
    { to: "/clubs", labelKey: "nav.publicClubs" },
    { to: "/tournaments", labelKey: "nav.publicTournaments" },
    { to: "/drills", labelKey: "nav.publicDrills" },
  ];

export default function PublicShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh">
      <PublicNav />
      <main className="mx-auto max-w-5xl px-3 py-6">
        <h1 className="text-h2 font-semibold text-ink">{title}</h1>
        <div className="mt-4">{children}</div>
      </main>
    </div>
  );
}

export function PublicNav() {
  const { t } = useT();

  return (
    <header className="border-b border-hairline bg-felt/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <nav className="mx-auto flex h-14 max-w-5xl items-center gap-1 px-3">
        <Link
          to="/"
          className="mr-2 flex shrink-0 items-center gap-2 text-ink transition-colors duration-150 hover:text-strike"
        >
          <img src="/ball.png" alt="" className="h-7 w-7 rounded-full" />
          <span className="text-h4 font-semibold">{t("common.appName")}</span>
        </Link>

        {PUBLIC_NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="rounded-control px-3 py-2 text-body text-ink-soft transition-colors duration-150 hover:bg-felt-raised hover:text-ink"
            activeProps={{ className: "text-ink font-medium" }}
          >
            {t(item.labelKey)}
          </Link>
        ))}

        <Link
          to="/app"
          className="ml-auto shrink-0 rounded-control px-3 py-2 text-body font-medium text-strike transition-colors duration-150 hover:text-strike-light"
        >
          {t("auth.signInShort")}
        </Link>
      </nav>
    </header>
  );
}
