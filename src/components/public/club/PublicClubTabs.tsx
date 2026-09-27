import { Link, useLocation } from "@tanstack/react-router";
import { useT, type Key } from "@/i18n";

/**
 * The four sub-routes, as tabs standing on the hero's own bottom rule.
 *
 * Underlines rather than the segmented pill the app's PublicClubTabs wears: this is
 * the page's own navigation, not a control sitting on the page, and the pill
 * read as a widget dropped into the gap between the hero and the content. The
 * active tab's rule replaces the hero's border for its own width, which is what
 * ties the two together — hence `-mb-px` on the row.
 *
 * Links rather than buttons, for the reason the app's PublicClubTabs gives: each tab
 * is an address, so it can be shared, opened in a new tab and prefetched on
 * hover. `activeProps` rather than comparing pathnames, because the router
 * already knows which one is current.
 */
const TABS = [
  { to: "/clubs/$slug", labelKey: "nav.publicTournaments", exact: true },
  { to: "/clubs/$slug/players", labelKey: "public.publicClub.roster" },
  { to: "/clubs/$slug/games", labelKey: "public.publicClub.statGames" },
  { to: "/clubs/$slug/info", labelKey: "club.tabs.info" },
] as const satisfies { to: string; labelKey: Key; exact?: boolean }[];

const TAB =
  "shrink-0 border-b-2 px-1 py-3 text-body transition-colors duration-150";

const TAB_ON = `${TAB} border-strike font-medium text-ink`;

const TAB_OFF = `${TAB} border-transparent text-ink-soft hover:text-ink`;

export function PublicClubTabs({ slug }: { slug: string }) {
  const { t } = useT();
  // One result lives at /clubs/$slug/game/$gameId — a sibling of the tape
  // rather than a child of it, so the router does not count it as the games
  // tab even though that is the tab it was reached from and belongs under.
  const { pathname } = useLocation();
  const onResult = pathname.startsWith(`/clubs/${slug}/game/`);

  return (
    // The scroller is for a narrow phone: four labels in three languages do not
    // all fit on a 320px line, and a row that wraps stops reading as one.
    <nav
      aria-label={t("nav.navigation")}
      className="no-bar relative -mb-px flex gap-5 overflow-x-auto px-4 sm:gap-6 sm:px-6"
    >
      {TABS.map((tab) => (
        <Link
          key={tab.to}
          to={tab.to}
          params={{ slug }}
          // Without `exact` the tournaments tab, whose path is a prefix of the
          // other three, would light up on all four.
          activeOptions={{ exact: "exact" in tab }}
          activeProps={{ className: TAB_ON, "aria-current": "page" }}
          inactiveProps={{
            className: onResult && tab.to.endsWith("/games") ? TAB_ON : TAB_OFF,
          }}
        >
          {t(tab.labelKey)}
        </Link>
      ))}
    </nav>
  );
}
