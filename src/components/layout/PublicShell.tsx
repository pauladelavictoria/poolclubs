import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { LuMenu, LuSearch, LuX } from "react-icons/lu";
import ThemeToggle from "@/components/layout/ThemeToggle";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { useDialog } from "@/libs/useDialog";
import { useSession } from "@/hooks/useAuth";
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
  return (
    // `overflow-x-clip`, not `hidden`: hidden makes this a scroll container and
    // every `position: sticky` inside it stops working. Clip only stops a child
    // widening the page — which the map's hover card can do on a phone, since it
    // is allowed to spill out past the map's edge.
    <main className="overflow-x-clip px-4 pb-20 sm:px-6">{children}</main>
  );
}

export function PublicNav() {
  const { t } = useT();
  const { user } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useDialog(menuOpen);

  // Same destination either way — /app sends you on to your club or to the
  // login — but the label has to match what actually happens: telling someone
  // who is already signed in to "sign in" reads as if the session was lost.
  // The session comes off the root context, resolved on the server, so this is
  // right in the first paint rather than flipping after hydration.
  const enterKey: Key = user ? "auth.openApp" : "auth.signInShort";

  return (
    <header className="nav-settle sticky top-0 z-30 pt-[env(safe-area-inset-top)]">
      {/* Two layouts, one row of markup. Below md it is a three-column grid —
          menu, wordmark, actions — so the wordmark sits on the centre line
          whatever the two ends weigh; from md up it is the ordinary flex bar
          with the sections spelled out. The sections used to scroll sideways
          on a phone, which is a nav you have to discover by dragging. */}
      <nav className="grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 sm:px-6 md:flex">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label={t("nav.navigation")}
          aria-expanded={menuOpen}
          className="-ml-2 justify-self-start rounded-control p-2 text-ink-soft transition-colors duration-150 hover:bg-felt-raised hover:text-ink md:hidden"
        >
          <LuMenu className="h-5 w-5" aria-hidden />
        </button>

        <Link
          to="/"
          className="flex shrink-0 items-center gap-2 text-ink transition-colors duration-150 hover:text-strike md:mr-1"
        >
          <img src="/ball.png" alt="" className="h-7 w-7 rounded-full" />
          <span className="text-h4 font-semibold">{t("common.appName")}</span>
        </Link>

        <div className="hidden min-w-0 flex-1 items-center gap-1 md:flex">
          {PUBLIC_NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="shrink-0 rounded-control px-3 py-2 text-body text-ink-soft transition-colors duration-150 hover:bg-felt-raised hover:text-ink"
              activeProps={{
                className: "bg-strike-tint text-strike font-medium",
              }}
            >
              {t(item.labelKey)}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2 justify-self-end md:ml-auto">
          {/* An icon at every width, not a field at md and up. /search is the
              one box on the public side — the directories no longer carry their
              own — so this is a way in rather than a second place to type. */}
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
            className={buttonClasses({ size: "sm", className: "shrink-0" })}
          >
            {t(enterKey)}
          </Link>
        </div>
      </nav>

      {/* The sections at full size, on a phone. Native <dialog> for the same
          reasons the app drawer uses one: backdrop, Esc, focus trap, and the
          page behind it inert. Closes on any link inside it — every child of
          the list is a navigation. */}
      <dialog
        ref={menuRef}
        // No md:hidden here: display:none on an open modal keeps the page
        // behind it inert with nothing left to dismiss. It only opens from a
        // button that is itself md:hidden, and it stays dismissible if the
        // window grows while it is up.
        className="drawer fixed inset-0 m-0 h-dvh max-h-dvh w-full max-w-none bg-felt text-ink"
        aria-label={t("nav.navigation")}
        onClose={() => setMenuOpen(false)}
      >
        <div className="flex h-full flex-col pt-[env(safe-area-inset-top)]">
          <div className="flex h-16 shrink-0 items-center justify-end px-4 sm:px-6">
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label={t("common.close")}
              className="-mr-2 rounded-control p-2 text-ink-soft transition-colors duration-150 hover:bg-felt-raised hover:text-ink"
            >
              <LuX className="h-5 w-5" aria-hidden />
            </button>
          </div>

          <nav
            className="flex flex-col gap-1 px-4 sm:px-6"
            onClick={() => setMenuOpen(false)}
          >
            {PUBLIC_NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-control py-3 text-h3 font-semibold tracking-tight text-ink-soft transition-colors duration-150 hover:text-ink"
                activeProps={{ className: "text-strike" }}
              >
                {t(item.labelKey)}
              </Link>
            ))}
            <Link
              to="/search"
              className="rounded-control py-3 text-h3 font-semibold tracking-tight text-ink-soft transition-colors duration-150 hover:text-ink"
              activeProps={{ className: "text-strike" }}
            >
              {t("public.search.title")}
            </Link>
          </nav>

          <div className="mt-auto px-4 pb-8 sm:px-6">
            <Link
              to="/app"
              onClick={() => setMenuOpen(false)}
              className={buttonClasses({ className: "w-full" })}
            >
              {t(enterKey)}
            </Link>
          </div>
        </div>
      </dialog>
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

  // No .dotfield alongside .wash: both set background-image, and .dotfield is
  // defined later in the stylesheet, so pairing them silently drops the wash.
  return (
    <section className="wash wash-soft relative mt-16 overflow-hidden rounded-sheet border border-hairline">
      <div className="relative flex flex-col items-center gap-4 px-6 py-16 text-center sm:py-20">
        <h2 className="max-w-[24ch] text-display leading-[1.05] font-semibold tracking-tighter text-ink">
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
      <div className="px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-10 sm:flex-row sm:justify-between">
          <div className="max-w-[32ch]">
            <Link to="/" className="flex items-center gap-2 text-ink">
              <img src="/ball.png" alt="" className="h-7 w-7 rounded-full" />
              <span className="text-h4 font-semibold">
                {t("common.appName")}
              </span>
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
          <p className="text-caption text-ink-faint">
            {t("public.footer.bottom")}
          </p>
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
        <div className="px-4 sm:px-6">
          <span className="block translate-y-[0.12em] text-nowrap text-[clamp(3rem,15vw,11rem)] leading-none font-semibold tracking-tighter text-ink/[0.07] select-none">
            {t("common.appName")}
          </span>
        </div>
      </div>
    </footer>
  );
}
