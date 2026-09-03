import { LuChevronLeft, LuMenu } from "react-icons/lu";
import { useRouter } from "@tanstack/react-router";
import ClubMenu from "@/components/layout/ClubMenu";
import NotificationBell from "@/components/layout/NotificationBell";
import ProfileMenu from "@/components/layout/ProfileMenu";
import { useRouteMeta } from "@/libs/routeMeta";
import { useT } from "@/i18n";

/**
 * One 56px bar: where you are signed in (the club), what is waiting on you, and
 * who you are. Nothing about the page under it.
 *
 * It is not on every screen any more. A wide desktop keeps the nav column pinned
 * open, and that column has room for the same three things across its top — so
 * the bar would be a second row of chrome saying what the column already says.
 * The club layout renders this only when the nav isn't pinned.
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
  const router = useRouter();
  const { crumbs } = useRouteMeta();

  // The trail's last entry is where the chevron goes when there is nowhere to
  // go back *to*. It carries the route's own pattern plus the parameters to
  // fill it, so the target is checked rather than string-built.
  const back = crumbs[crumbs.length - 1];

  /**
   * Back means back, and the trail is only the fallback.
   *
   * The chevron used to be a link to the trail's last crumb, which is where
   * the route sits in the app rather than where the reader came from: a result
   * opened from the lobby sent them to /games on the way out, and the same for
   * a drill, a player, every leaf with a parent. So: the history entry if there
   * is one, and the crumb when this is the first page of the session — a shared
   * link, a reload, a notification.
   *
   * Decided on the press rather than on render, because whether history has an
   * entry is not something the server can know, and branching on it while
   * drawing would be two different chevrons across hydration.
   */
  const goBack = () => {
    if (router.history.canGoBack()) {
      router.history.back();
      return;
    }
    if (back) void router.navigate({ to: back.to, params: back.params });
  };

  return (
    // pt clears the status bar: viewport-fit=cover puts the page under it, and
    // the bar's own background is what fills the gap.
    <header className="relative z-30 shrink-0 border-b border-hairline bg-felt/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
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
          <button
            type="button"
            onClick={goBack}
            aria-label={t("common.back")}
            className="-ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-control text-ink-soft transition-colors duration-150 hover:bg-felt-raised hover:text-ink md:hidden"
          >
            <LuChevronLeft className="h-5 w-5" aria-hidden />
          </button>
        )}

        <ClubMenu className="flex-1" />

        <NotificationBell />
        <ProfileMenu />
      </div>
    </header>
  );
}
