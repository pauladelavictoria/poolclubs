import { Link, type LinkProps } from "@tanstack/react-router";
import ThemeToggle from "@/components/layout/ThemeToggle";
import { LANGS, useT } from "@/i18n";
import type { Key } from "@/i18n";
import { DRILLS_ENABLED } from "@/libs/algorithms/features";

/**
 * The footer's three columns of links, declared rather than spelled out: the
 * legal column is the one that has to be reachable from every page, and a list
 * is harder to forget a page in than three blocks of markup.
 */
const FOOTER_COLUMNS: {
  headingKey: Key;
  links: { to: LinkProps["to"]; labelKey: Key }[];
}[] = [
  {
    headingKey: "public.footer.exploreHeading",
    links: [
      { to: "/clubs", labelKey: "nav.publicClubs" },
      { to: "/players", labelKey: "nav.publicPlayers" },
      { to: "/tournaments", labelKey: "nav.publicTournaments" },
      ...(DRILLS_ENABLED
        ? [{ to: "/drills" as const, labelKey: "nav.publicDrills" as Key }]
        : []),
    ],
  },
  {
    headingKey: "public.footer.productHeading",
    links: [
      { to: "/pricing", labelKey: "public.footer.pricing" },
      { to: "/about", labelKey: "public.footer.about" },
      { to: "/contact", labelKey: "public.footer.contact" },
    ],
  },
  {
    headingKey: "public.footer.legalHeading",
    links: [
      { to: "/legal/privacy", labelKey: "public.footer.privacy" },
      { to: "/legal/terms", labelKey: "public.footer.terms" },
      { to: "/legal/aviso-legal", labelKey: "public.footer.avisoLegal" },
    ],
  },
];

export function PublicFooter() {
  const { t, lang, setLang } = useT();

  return (
    <footer className="mt-20 border-t border-hairline">
      <div className="grid gap-8 px-4 py-10 sm:grid-cols-[1.5fr_repeat(3,1fr)] sm:px-6 lg:px-10">
        <p className="max-w-[28ch] text-body text-ink-soft">
          {t("public.footer.tagline")}
        </p>
        {FOOTER_COLUMNS.map((column) => (
          <nav key={column.headingKey} aria-label={t(column.headingKey)}>
            <h2 className="text-caption font-medium text-ink">
              {t(column.headingKey)}
            </h2>
            <ul className="mt-2 space-y-1.5">
              {column.links.map((link) => (
                <li key={String(link.to)}>
                  <Link
                    to={link.to}
                    className="text-caption text-ink-faint transition-colors duration-150 hover:text-ink"
                    activeProps={{ className: "text-ink" }}
                  >
                    {t(link.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-hairline px-4 py-6 sm:px-6 lg:px-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-caption text-ink-faint">
            {t("public.footer.bottom")}
          </p>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="flex gap-0.5 rounded-control border border-hairline p-0.5">
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => setLang(l.code)}
                  aria-current={l.code === lang}
                  className={
                    l.code === lang
                      ? "rounded-control bg-felt-raised px-2.5 py-1 text-caption font-medium text-ink"
                      : "rounded-control px-2.5 py-1 text-caption text-ink-faint transition-colors duration-150 hover:text-ink-soft"
                  }
                >
                  {l.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* The wordmark as texture, not as a message: full bleed from the left
          edge, sized off the window, and cut through the middle of the letters
          by the container. -0.58em leaves roughly the top half of the cap
          height standing — the baseline sits ~0.78em down a leading-none box. */}
      <div className="overflow-hidden" aria-hidden>
        <span className="-mb-[0.42em] block text-nowrap text-[15.4vw] leading-none font-semibold text-ink/[0.06] select-none">
          {t("common.appName")}
        </span>
      </div>
    </footer>
  );
}
