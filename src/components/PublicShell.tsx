import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { LuSearch } from "react-icons/lu";
import ThemeToggle from "@/components/ThemeToggle";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { Shot } from "@/components/ui/Shot";
import { LANGS, useT } from "@/i18n";
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
 * component is purely the measure a page's body sits in — every page now draws
 * its own hero above it, so there is nothing left here to configure.
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

export default function PublicShell({ children }: { children: ReactNode }) {
  return <main className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">{children}</main>;
}

export function PublicNav() {
  const { t } = useT();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 border-b border-hairline bg-pocket/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:px-6">
        <Link
          to="/"
          className="mr-1 flex shrink-0 items-center gap-2 text-ink transition-colors duration-150 hover:text-strike"
        >
          <img src="/ball.png" alt="" className="h-7 w-7 rounded-full" />
          <span className="hidden text-h4 font-semibold sm:inline">
            {t("common.appName")}
          </span>
        </Link>

        {/* Scrolls rather than wraps: four sections plus a wordmark plus a
            search field plus a sign-in pill does not fit a phone, and a nav bar
            that becomes two rows moves the page under it. */}
        <div className="-mx-1 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto px-1">
          {PUBLIC_NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="shrink-0 rounded-control px-3 py-2 text-body text-ink-soft transition-colors duration-150 hover:bg-felt-raised hover:text-ink"
              activeProps={{ className: "bg-strike-tint text-strike font-medium" }}
            >
              {t(item.labelKey)}
            </Link>
          ))}
        </div>

        {/* A field, not an icon, at md and up — the strongest "social network,
            not brochure" signal a nav bar can carry. Collapses to the icon link
            below, where there is no room for it. */}
        <form
          role="search"
          className="hidden shrink-0 md:block"
          onSubmit={(event) => {
            event.preventDefault();
            const q = new FormData(event.currentTarget).get("q");
            navigate({
              to: "/search",
              search: { q: typeof q === "string" && q ? q : undefined },
            });
          }}
        >
          <div className="relative">
            <LuSearch
              className="pointer-events-none absolute inset-y-0 left-3 my-auto h-4 w-4 text-ink-faint"
              aria-hidden
            />
            <input
              name="q"
              type="search"
              placeholder={t("public.search.placeholder")}
              className="h-9 w-48 rounded-control border border-hairline bg-felt pl-9 pr-3 text-caption text-ink placeholder:text-ink-faint focus:border-hairline-strong lg:w-64"
            />
          </div>
        </form>

        <Link
          to="/search"
          aria-label={t("public.search.title")}
          className="shrink-0 rounded-control p-2 text-ink-soft transition-colors duration-150 hover:bg-felt-raised hover:text-ink md:hidden"
          activeProps={{ className: "text-ink" }}
        >
          <LuSearch className="h-4 w-4" aria-hidden />
        </Link>

        <Link to="/app" className={buttonClasses({ size: "sm", className: "shrink-0" })}>
          {t("auth.signInShort")}
        </Link>
      </nav>
    </header>
  );
}

/**
 * The same closing beat on all five directory pages, so a page ends instead of
 * trailing off into the footer. Washed in the app's default accent rather than
 * any one club's — nothing on a directory page is a single club's territory.
 */
export function CtaBand() {
  const { t } = useT();

  return (
    <section className="wash relative mt-16 overflow-hidden rounded-sheet border border-hairline">
      <Shot
        name="cta-band"
        seed="cta-band"
        size={[1800, 770]}
        alt=""
        className="absolute inset-0 opacity-25"
      />
      <div className="relative flex flex-col items-center gap-4 px-6 py-16 text-center sm:py-20">
        <h2 className="max-w-[24ch] text-h1 font-semibold tracking-tight text-ink md:text-display">
          {t("public.ctaBand.title")}
        </h2>
        <p className="max-w-[46ch] text-body text-ink-soft">
          {t("public.ctaBand.body")}
        </p>
        <Link
          to="/app/clubs/new"
          className={buttonClasses({ className: "mt-2 px-6" })}
        >
          {t("public.footer.startClub")}
        </Link>
      </div>
    </section>
  );
}

export function PublicFooter() {
  const { t, lang, setLang } = useT();

  return (
    <footer className="mt-20 border-t border-hairline">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-10 sm:flex-row sm:justify-between">
          <div className="max-w-[32ch]">
            <Link to="/" className="flex items-center gap-2 text-ink">
              <img src="/ball.png" alt="" className="h-7 w-7 rounded-full" />
              <span className="text-h4 font-semibold">{t("common.appName")}</span>
            </Link>
            <p className="mt-3 text-body text-ink-soft">
              {t("public.footer.tagline")}
            </p>
            <Link
              to="/app/clubs/new"
              className={buttonClasses({
                variant: "secondary",
                size: "sm",
                className: "mt-5",
              })}
            >
              {t("public.footer.startClub")}
            </Link>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-caption font-medium text-ink-faint">
              {t("public.footer.exploreHeading")}
            </span>
            {PUBLIC_NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="text-body text-ink-soft transition-colors duration-150 hover:text-ink"
              >
                {t(item.labelKey)}
              </Link>
            ))}
            <Link
              to="/search"
              className="text-body text-ink-soft transition-colors duration-150 hover:text-ink"
            >
              {t("public.search.title")}
            </Link>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-hairline pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-caption text-ink-faint">{t("public.footer.bottom")}</p>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="flex gap-1">
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => setLang(l.code)}
                  aria-current={l.code === lang}
                  className={
                    l.code === lang
                      ? "rounded-control px-2 py-1 text-caption text-ink"
                      : "rounded-control px-2 py-1 text-caption text-ink-faint transition-colors duration-150 hover:text-ink-soft"
                  }
                >
                  {l.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* The wordmark as texture, not as a message: clipped by the container so
          it is felt at the edge of the eye rather than read. */}
      <div className="overflow-hidden" aria-hidden>
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <span className="block translate-y-[0.12em] text-nowrap text-[clamp(3rem,15vw,11rem)] leading-none font-semibold tracking-tighter text-ink/[0.07] select-none">
            {t("common.appName")}
          </span>
        </div>
      </div>
    </footer>
  );
}
