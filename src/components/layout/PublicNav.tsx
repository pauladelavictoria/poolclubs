import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { LuMenu, LuSearch, LuX } from "react-icons/lu";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { useDialog } from "@/hooks/useDialog";
import { useSession } from "@/hooks/useAuth";
import { useT } from "@/i18n";
import type { Key } from "@/i18n";
import { DRILLS_ENABLED } from "@/libs/algorithms/features";
import { PublicUserMenu } from "./PublicUserMenu";

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
  // The shared library is hidden for now (see libs/features), and so is the row
  // that leads to it — the route itself 404s.
  ...(DRILLS_ENABLED
    ? ([{ to: "/drills", labelKey: "nav.publicDrills" }] as const)
    : []),
];

export function PublicNav() {
  const { t } = useT();
  const { user } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useDialog(menuOpen);

  // Signed out it is one button to the login; signed in the corner is your own
  // avatar, the same as inside the app, with the way in and the way out under
  // it. The session comes off the root context, resolved on the server, so the
  // right one is there in the first paint rather than flipping after hydration.
  // The drawer keeps a plain button either way, so its label still has to match
  // what pressing it does.
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

          {user ? (
            <>
              {/* Signed in, the way back into the app was one click deep in the
                  avatar popover. Spelled out here from md up, where there is
                  room; on a phone the drawer's footer button is the same link,
                  and the popover row stays either way.
                  A plain wrapper carries the hidden/md:block switch: the
                  button's own classes always include an unconditioned
                  inline-flex, which would otherwise tie against "hidden" on
                  the same element and win regardless of viewport. */}
              <div className="hidden shrink-0 md:block">
                <Link
                  to="/app"
                  className={buttonClasses({
                    variant: "secondary",
                    size: "sm",
                  })}
                >
                  {t(enterKey)}
                </Link>
              </div>
              <PublicUserMenu />
            </>
          ) : (
            <Link
              to="/app"
              className={buttonClasses({ size: "sm", className: "shrink-0" })}
            >
              {t(enterKey)}
            </Link>
          )}
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
