import { LuChevronLeft, LuMenu } from "react-icons/lu";
import { AppLink } from "@/components/AppLink";
import NotificationBell from "@/components/NotificationBell";
import ProfileMenu from "@/components/ProfileMenu";
import { useAuth } from "@/hooks/useAuth";
import { useRouteMeta } from "@/libs/routeMeta";
import { useT } from "@/i18n";

/**
 * One 56px bar, the same on every screen: where you are signed in (the club),
 * what is waiting on you, and who you are. Nothing about the page under it.
 *
 * The page's own name, its trail and its actions moved into the content, where
 * a title can be a real h1 with room to breathe and an action can sit next to
 * the thing it acts on. A bar that changed shape on every route was four
 * different bars wearing the same background.
 *
 * The back chevron is the one page-dependent thing left, and only on phones:
 * a desktop has the rail, the drawer and the browser's own back button in
 * view, a phone in one hand at the table has none of them.
 */
export default function AppHeader({
  /** Given only when the drawer is neither pinned open nor a thumb away in the
   *  tab bar — i.e. a desktop too narrow to keep the nav on screen. */
  onMenu,
}: {
  onMenu?: () => void;
}) {
  const { t } = useT();
  const { activeClub } = useAuth();
  const { crumbs } = useRouteMeta();

  const clubName = activeClub?.name ?? t("common.appName");
  // The trail's last entry is what the chevron goes back to. It carries the
  // route's own pattern plus the parameters to fill it, so the link is checked
  // rather than string-built.
  const back = crumbs.at(-1);

  return (
    // pt clears the status bar: viewport-fit=cover puts the page under it, and
    // the bar's own background is what fills the gap.
    <header className="z-30 shrink-0 border-b border-hairline bg-felt/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-3">
        {onMenu && (
          <button
            type="button"
            onClick={onMenu}
            aria-label={t("nav.moreOptions")}
            className="-ml-1 hidden h-10 w-10 shrink-0 items-center justify-center rounded-control text-ink-soft transition-colors duration-150 hover:bg-felt-raised hover:text-ink md:flex"
          >
            <LuMenu className="h-5 w-5" aria-hidden />
          </button>
        )}

        {back && (
          <AppLink
            to={back.to}
            params={back.params}
            viewTransition
            aria-label={t("common.back")}
            className="-ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-control text-ink-soft transition-colors duration-150 hover:bg-felt-raised hover:text-ink md:hidden"
          >
            <LuChevronLeft className="h-5 w-5" aria-hidden />
          </AppLink>
        )}

        {/* The lobby is not a tab, so the club is the way back to it — the same
            job the ball does on the desktop rail. */}
        <AppLink
          to="/app/$clubSlug"
          viewTransition
          aria-label={t("nav.home")}
          className="flex min-w-0 flex-1 items-center gap-2 text-ink transition-colors duration-150 hover:text-strike"
        >
          <img
            src={activeClub?.logo_url || "/ball.png"}
            alt=""
            // A crest uploaded with a transparent background is drawn for
            // paper, not for a dark bar — so it gets its paper.
            className={`h-8 w-8 shrink-0 object-cover ${
              activeClub?.logo_url
                ? "rounded-full border border-hairline bg-white"
                : "rounded-full"
            }`}
          />
          <span className="min-w-0 truncate text-h4 font-semibold">
            {clubName}
          </span>
        </AppLink>

        <NotificationBell />
        <ProfileMenu />
      </div>
    </header>
  );
}
