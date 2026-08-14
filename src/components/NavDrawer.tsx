import { Link, getRouteApi } from "@tanstack/react-router";
import { AppLink } from "@/components/AppLink";
import { useAuth } from "@/hooks/useAuth";
import { useDialog } from "@/libs/useDialog";
import { toast } from "react-toastify";
import { NAV_SECTIONS, type NavItem } from "@/components/navItems";
import ThemeToggle from "@/components/ThemeToggle";
import { LANGS, useT, type Lang } from "@/i18n";
import {
  LuClipboardList,
  LuChartColumn,
  LuHandshake,
  LuChevronDown,
  LuCheck,
  LuPlus,
  LuSend,
} from "react-icons/lu";

/**
 * Where you are is a raised row with the club's colour down its left edge —
 * a 2px rail rather than a tinted fill, so "here" and "act" still look like
 * different things now that they share one hue.
 */
const item = ({ isActive }: { isActive: boolean }) =>
  [
    "flex h-10 items-center gap-3 rounded-control border-l-2 px-3 text-body",
    "transition-colors duration-150",
    isActive
      ? "bg-felt-raised font-medium text-ink border-l-strike"
      : "border-l-transparent text-ink-soft hover:bg-felt-raised hover:text-ink",
  ].join(" ");

function Heading({ children }: { children: string }) {
  return (
    <div className="px-3 pb-1 pt-5 text-caption font-medium uppercase tracking-[0.08em] text-ink-faint">
      {children}
    </div>
  );
}

export default function NavDrawer({
  open,
  onClose,
  /** Wide screens have room for the whole thing, so it stops being a dialog and
   *  becomes the left column of the app: no backdrop, no Esc, nothing to open. */
  pinned = false,
  /** Set when the pointer is what opened it, so the pointer can put it away. */
  closeOnLeave = false,
}: {
  open: boolean;
  onClose: () => void;
  pinned?: boolean;
  closeOnLeave?: boolean;
}) {
  const ref = useDialog(pinned ? false : open);
  const { user, player, activeClub, isClubAdmin, memberships, setActiveClub } =
    useAuth();
  const { t, lang, setLang } = useT();
  // An absolute link, so it needs a host that exists on the server too.
  const { origin } = getRouteApi("__root__").useRouteContext();

  // Only clubs you are actually in are switchable; a pending request is not a
  // place you can go yet.
  const switchable = memberships.filter((m) => m.status === "active");

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
      <div className="flex items-center gap-3 px-3 pb-3 pt-2">
        <img src="/ball.png" alt="" className="h-9 w-9 rounded-full" />
        <div className="min-w-0 truncate text-h4 font-semibold">
          {t("common.appName")}
        </div>
      </div>

      {/* Which club you're in, and the way out of it. Native <details> is the
            popup: click-to-open, Esc, and no outside-click listener to write.
            Its own click handler, since the nav closes the drawer on any click
            inside it and opening the list shouldn't dismiss it. */}
      {user && (
        <details
          className="group rounded-control border border-hairline bg-felt-raised"
          onClick={(e) => e.stopPropagation()}
        >
          <summary className="flex h-11 cursor-pointer list-none items-center gap-2.5 px-3 [&::-webkit-details-marker]:hidden">
            <LuHandshake className="h-[18px] w-[18px] shrink-0 text-ink-soft" />
            <span className="min-w-0 flex-1 truncate text-body font-medium">
              {activeClub?.name ?? t("club.noClub")}
            </span>
            <LuChevronDown
              className="h-4 w-4 shrink-0 text-ink-faint transition-transform duration-150 group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <div className="border-t border-hairline p-1">
            {switchable.map((m) => (
              <button
                key={m.club_id}
                type="button"
                onClick={() => {
                  setActiveClub(m.club_id);
                  onClose();
                }}
                className="flex h-9 w-full items-center gap-2 rounded-control px-2 text-left text-body text-ink-soft transition-colors duration-150 hover:bg-felt hover:text-ink"
              >
                <LuCheck
                  className={`h-4 w-4 shrink-0 ${
                    m.club_id === activeClub?.id ? "text-strike" : "opacity-0"
                  }`}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate">{m.club?.name}</span>
              </button>
            ))}
            <Link
              to="/app/clubs/new"
              onClick={onClose}
              className="flex h-9 items-center gap-2 rounded-control px-2 text-body text-ink-soft transition-colors duration-150 hover:bg-felt hover:text-ink"
            >
              <LuPlus className="h-4 w-4 shrink-0" aria-hidden />
              {t("club.create")}
            </Link>
          </div>
        </details>
      )}

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
              className={item({ isActive: false })}
              activeProps={{ className: item({ isActive: true }) }}
            >
              {/* The glyphs are ink now. Painting every one of them the club's
                    colour would make the drawer a wall of accent and leave the
                    current row nothing to stand out with. */}
              <Icon className="h-[18px] w-[18px] text-ink-soft" /> {t(labelKey)}
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
        {/* Same stop-propagation as the languages below: changing how the
              app looks shouldn't also close the drawer you're looking at. */}
        <div className="mt-2 px-3" onClick={(e) => e.stopPropagation()}>
          <ThemeToggle className="w-full" />
        </div>

        {/* Three languages fit as one row of buttons, so the choice is
              visible instead of hidden behind a <select>. Its own click
              handler: picking a language shouldn't dismiss the drawer. */}
        <div
          className="mt-2 flex gap-1 px-3"
          role="group"
          aria-label={t("nav.language")}
          onClick={(e) => e.stopPropagation()}
        >
          {LANGS.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => setLang(l.code as Lang)}
              aria-pressed={l.code === lang}
              title={l.name}
              className={[
                "h-8 flex-1 rounded-control border text-caption font-medium uppercase",
                "transition-colors duration-150",
                l.code === lang
                  ? "border-strike bg-strike-tint text-strike"
                  : "border-hairline text-ink-faint hover:border-hairline-strong hover:text-ink",
              ].join(" ")}
            >
              {l.code}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );

  if (pinned) {
    return (
      <aside
        className="fixed left-0 top-0 z-40 h-dvh w-[19rem] overflow-y-auto border-r border-hairline bg-felt text-ink"
        aria-label={t("nav.navigation")}
      >
        {content}
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
