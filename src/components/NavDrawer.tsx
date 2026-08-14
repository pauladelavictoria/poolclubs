import { getRouteApi } from "@tanstack/react-router";
import { AppLink } from "@/components/AppLink";
import ClubMenu from "@/components/ClubMenu";
import NotificationBell from "@/components/NotificationBell";
import { Avatar } from "@/components/ui/Avatar";
import { pickerClasses } from "@/components/ui/buttonStyles";
import { useAuth } from "@/hooks/useAuth";
import { useSignOut } from "@/hooks/useSignOut";
import { useDialog } from "@/libs/useDialog";
import { toast } from "react-toastify";
import { NAV_SECTIONS, type NavItem } from "@/components/navItems";
import ThemeToggle from "@/components/ThemeToggle";
import { LANGS, useT, type Lang } from "@/i18n";
import {
  LuClipboardList,
  LuChartColumn,
  LuLogOut,
  LuSend,
} from "react-icons/lu";

/**
 * Where you are is a raised row wearing the club's colour, glyph and label both
 * — the same mark the active tab wears in the bottom bar, so "here" says the
 * same thing in whichever of the two navs you happen to be reading.
 *
 * It used to be a 2px rail down the left edge, which on a 10px radius is only
 * straight for half of a 40px row and curves away under the fill for the rest:
 * two pixels of accent along half an edge, which read as no accent at all. The
 * current page was the one thing in the drawer with no colour on it while the
 * language picker had a full tinted outline — a preference shouting over a
 * location.
 *
 * Colouring the glyph is safe here for the reason the old note gave for not
 * colouring them: exactly one row is ever active, so this is the opposite of a
 * wall of accent — it is the one place the wall breaks.
 */
const item = ({ isActive }: { isActive: boolean }) =>
  [
    "flex h-10 items-center gap-3 rounded-control px-3 text-body",
    "transition-colors duration-150",
    isActive
      ? // Hovering where you already are does not un-mark it. The row still lifts,
        // so it stays obviously a link, but the colour is the answer to "where am
        // I" and the pointer passing over is not new information about that.
        "bg-felt-raised font-medium text-strike hover:bg-rail"
      : "text-ink-soft hover:bg-felt-raised hover:text-ink",
  ].join(" ");

function Heading({ children }: { children: string }) {
  return (
    <div className="px-3 pb-1 pt-5 text-caption font-medium uppercase tracking-[0.08em] text-ink-faint">
      {children}
    </div>
  );
}

export default function NavDrawer({
  open = false,
  onClose = () => {},
  /** Renders the left-column form instead of the dialog: no backdrop, no Esc,
   *  nothing to open, and the club and the user across its two ends.
   *
   *  Both forms are mounted at once and each hides itself outside its own width
   *  — see --breakpoint-pinned. One `<nav>` swapping between an <aside> and a
   *  <dialog> would have to be a JS decision, and a JS decision about the
   *  viewport is one the server gets wrong and hydration corrects in front of
   *  the user. Two elements and a media query cost some duplicated markup in
   *  the DOM (the hidden one is out of the a11y tree) and nothing else. */
  pinned = false,
  /** Set when the pointer is what opened it, so the pointer can put it away. */
  closeOnLeave = false,
}: {
  open?: boolean;
  onClose?: () => void;
  pinned?: boolean;
  closeOnLeave?: boolean;
}) {
  const ref = useDialog(pinned ? false : open);
  const { user, player, activeClub, isClubAdmin } = useAuth();
  const { t, lang, setLang } = useT();
  const signOut = useSignOut();
  // An absolute link, so it needs a host that exists on the server too.
  const { origin } = getRouteApi("__root__").useRouteContext();

  // Your own training pages. They used to need a "/app/me/*" fallback for the
  // case where the player id wasn't known yet; inside a club it always is, and
  // the /me routes are real redirects now anyway.
  const myTraining: NavItem[] = [
    {
      to: "/app/$clubSlug/players/$playerId/training/plan",
      labelKey: "nav.myPlan",
      icon: LuClipboardList,
      section: "drills",
    },
    {
      to: "/app/$clubSlug/players/$playerId/training",
      labelKey: "nav.myProgress",
      icon: LuChartColumn,
      section: "drills",
    },
  ];

  const sections = NAV_SECTIONS.map((section) => {
    if (section.headingKey === "nav.training") {
      return { ...section, items: [...section.items, ...myTraining] };
    }
    // Club settings are the owner's to manage; everyone else gets the invite
    // button below instead of a page they can't do anything on.
    if (section.headingKey === "nav.club" && !isClubAdmin) {
      return {
        ...section,
        items: section.items.filter((i) => i.to !== "/app/$clubSlug/club"),
      };
    }
    return section;
  });

  // "Send" over "copy": the share sheet is the natural way to hand a link to
  // a specific person on a phone. Falls back to the clipboard on desktop.
  const sendInvite = async () => {
    if (!activeClub) return;
    const link = `${origin}/app/join/${activeClub.join_code}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: activeClub.name, url: link });
      } catch {
        // Share sheet dismissed — nothing to recover.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(link);
      toast.success(t("club.copied"));
    } catch {
      toast.error(t("club.copyError"));
    }
  };

  const content = (
    <nav className="p-3" onClick={pinned ? undefined : onClose}>
      {/* No wordmark here. The drawer you open from a phone opens under a bar
          that already has the club's crest in it, and nobody needs telling which
          app they are in — it was a row of chrome above the first thing anyone
          came here to tap. */}
      {sections.map((section) => (
        <div key={section.headingKey}>
          <Heading>{t(section.headingKey)}</Heading>
          {section.items.map(({ to, labelKey, icon: Icon, end }) => (
            <AppLink
              key={String(to)}
              to={to}
              // The training links carry a playerId; the rest ignore it.
              params={{ playerId: player.id }}
              activeOptions={{ exact: end }}
              // Both branches go through activeProps/inactiveProps rather than
              // one of them through `className`: activeProps is concatenated onto
              // className, not swapped for it, so the active row was also
              // carrying the inactive row's `hover:text-ink` — and a hover
              // variant beats a base colour, which is why hovering the page you
              // were on turned its label back to ink.
              inactiveProps={{ className: item({ isActive: false }) }}
              activeProps={{ className: item({ isActive: true }) }}
            >
              {({ isActive }: { isActive: boolean }) => (
                <>
                  <Icon
                    className={`h-[18px] w-[18px] ${
                      isActive ? "text-strike" : "text-ink-soft"
                    }`}
                  />
                  {t(labelKey)}
                </>
              )}
            </AppLink>
          ))}
          {section.headingKey === "nav.club" && !isClubAdmin && activeClub && (
            <button
              type="button"
              onClick={sendInvite}
              className={`${item({ isActive: false })} w-full`}
            >
              <LuSend className="h-[18px] w-[18px] text-ink-soft" />{" "}
              {t("nav.sendInvite")}
            </button>
          )}
        </div>
      ))}

      <div className="mt-5 border-t border-hairline pt-3">
        {/* Both preferences on one row: two themes, three languages, five pills
              of the same make. Neither is a destination and neither is worth a
              line of the nav, and they are the only two settings that belong to
              the person rather than to the club.
              Its own click handler: changing how the app looks or reads should
              not also dismiss the drawer you are looking at. */}
        <div
          className="mt-2 flex gap-2 px-3 justify-between"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="flex gap-1"
            role="group"
            aria-label={t("nav.language")}
          >
            {LANGS.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => setLang(l.code as Lang)}
                aria-pressed={l.code === lang}
                title={l.name}
                className={`${pickerClasses(l.code === lang)} flex-1 px-3`}
              >
                {l.code}
              </button>
            ))}
          </div>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );

  if (pinned) {
    return (
      <aside
        className="fixed left-0 top-0 z-40 hidden h-dvh w-[19rem] flex-col border-r border-hairline bg-felt text-ink pinned:flex"
        aria-label={t("nav.navigation")}
      >
        {/* What the app bar carries on narrower screens, across the top of the
            column instead. It sits outside the scroller on purpose: the bell's
            panel is wider than this column, and a menu that has to be scrolled
            back into view is not a menu.
            The bell is the only thing beside the club here — the avatar moved to
            the footer, which is 88px the club's name doesn't have to give up to
            it. A 19rem column is not a bar and doesn't have to crowd like one. */}
        <div className="flex shrink-0 items-center gap-1 border-b border-hairline px-4 py-3">
          <ClubMenu className="flex-1" />
          <NotificationBell />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">{content}</div>

        {/* You, at the bottom: the picture and the name are the link to your own
            profile, and the way out is the icon beside them. The bar's avatar
            needs a menu because it has one slot; a footer can just show both. */}
        <div className="flex shrink-0 items-center gap-2 border-t border-hairline px-3 py-2">
          <AppLink
            to="/app/$clubSlug/players/$playerId"
            params={{ playerId: player.id }}
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-control px-1 py-1.5 text-ink-soft transition-colors duration-150 hover:bg-felt-raised hover:text-ink"
          >
            <Avatar
              name={player.name ?? user.email ?? "?"}
              url={player.avatar_url}
              className="h-8 w-8"
            />
            <span className="min-w-0 flex-1 truncate text-body font-medium">
              {player.name ?? user.fullName ?? user.email}
            </span>
          </AppLink>
          <button
            type="button"
            onClick={() => signOut.mutate()}
            aria-label={t("auth.signOut")}
            title={t("auth.signOut")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control text-ink-faint transition-colors duration-150 hover:bg-felt-raised hover:text-ink"
          >
            <LuLogOut className="h-[18px] w-[18px]" aria-hidden />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <dialog
      ref={ref}
      // Native <dialog> gives backdrop, Esc-to-close and focus trap free
      className="drawer fixed left-0 top-0 m-0 h-dvh max-h-dvh w-[19rem] max-w-[86vw] overflow-y-auto border-r border-hairline bg-felt text-ink"
      aria-label={t("nav.navigation")}
      onClose={onClose}
      onMouseLeave={closeOnLeave ? onClose : undefined}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      {content}
    </dialog>
  );
}
