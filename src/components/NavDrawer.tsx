import { NavLink } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useDialog } from "@/libs/useDialog";
import { useSignOut } from "@/hooks/useSignOut";
import { toast } from "react-toastify";
import { NAV_SECTIONS, type NavItem } from "@/components/navItems";
import { SECTIONS, type SectionId } from "@/libs/sections";
import ThemeToggle from "@/components/ThemeToggle";
import { LANGS, useT, type Lang } from "@/i18n";
import {
  LuUser,
  LuClipboardList,
  LuChartColumn,
  LuLogOut,
  LuHandshake,
  LuChevronDown,
  LuCheck,
  LuPlus,
  LuSend,
} from "react-icons/lu";

/**
 * Where you are wears its section's mark, not the accent. A tinted yellow row
 * on every visit spends "act" on navigation, and then the one button on the
 * page that wants it has nothing left to be.
 */
const item = ({
  isActive,
  section,
}: {
  isActive: boolean;
  section?: SectionId;
}) =>
  [
    "flex h-10 items-center gap-3 rounded-control border-l-2 px-3 text-body",
    "transition-colors duration-150",
    isActive && section
      ? `bg-felt-raised font-medium text-ink ${SECTIONS[section].markBorder}`
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
}: {
  open: boolean;
  onClose: () => void;
}) {
  const ref = useDialog(open);
  const { user, player, activeClub, isClubAdmin, memberships, setActiveClub } =
    useAuth();
  const signOut = useSignOut();
  const { t, lang, setLang } = useT();

  // Only clubs you are actually in are switchable; a pending request is not a
  // place you can go yet.
  const switchable = memberships.filter((m) => m.status === "active");

  // Without a linked player these point at /me/*, which sits behind
  // ProtectedRoute and so asks for login first.
  const me = player ? `/app/players/${player.id}` : "/app/me";
  const sections = NAV_SECTIONS.map((section) => {
    if (section.headingKey === "nav.training") {
      return {
        ...section,
        items: [
          ...section.items,
          {
            to: `${me}/training/plan`,
            labelKey: "nav.myPlan",
            icon: LuClipboardList,
            section: "drills",
          },
          {
            to: `${me}/training`,
            labelKey: "nav.myProgress",
            icon: LuChartColumn,
            section: "drills",
          },
        ] as NavItem[],
      };
    }
    // Club settings are the owner's to manage; everyone else gets the invite
    // button below instead of a page they can't do anything on.
    if (section.headingKey === "nav.club" && !isClubAdmin) {
      return {
        ...section,
        items: section.items.filter((i) => i.to !== "/app/club"),
      };
    }
    return section;
  });

  // "Send" over "copy": the share sheet is the natural way to hand a link to
  // a specific person on a phone. Falls back to the clipboard on desktop.
  const sendInvite = async () => {
    if (!activeClub) return;
    const link = `${window.location.origin}/app/join/${activeClub.join_code}`;
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

  const handleSignOut = async () => {
    onClose();
    try {
      await signOut.mutateAsync();
      toast.success(t("auth.signedOut"));
    } catch {
      // Logged by the mutation cache; this is the part the user sees.
      toast.error(t("auth.signOutError"));
    }
  };

  return (
    <dialog
      ref={ref}
      // Native <dialog> gives backdrop, Esc-to-close and focus trap free
      className="drawer fixed left-0 top-0 m-0 h-dvh max-h-dvh w-[19rem] max-w-[86vw] overflow-y-auto border-r border-hairline bg-felt text-ink"
      aria-label={t("nav.navigation")}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <nav className="p-3" onClick={onClose}>
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
                  <span className="min-w-0 flex-1 truncate">
                    {m.club?.name}
                  </span>
                </button>
              ))}
              <NavLink
                to="/app/clubs/new"
                onClick={onClose}
                className="flex h-9 items-center gap-2 rounded-control px-2 text-body text-ink-soft transition-colors duration-150 hover:bg-felt hover:text-ink"
              >
                <LuPlus className="h-4 w-4 shrink-0" aria-hidden />
                {t("club.create")}
              </NavLink>
            </div>
          </details>
        )}

        {sections.map((section) => (
          <div key={section.headingKey}>
            <Heading>{t(section.headingKey)}</Heading>
            {section.items.map(
              ({ to, labelKey, icon: Icon, end, section: id }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) => item({ isActive, section: id })}
                >
                  {/* The icon carries the hue whether or not the row is current,
                    so the drawer reads as a map of the four places. */}
                  <Icon className={`h-[18px] w-[18px] ${SECTIONS[id].mark}`} />{" "}
                  {t(labelKey)}
                </NavLink>
              ),
            )}
            {section.headingKey === "nav.club" &&
              !isClubAdmin &&
              activeClub && (
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
          <NavLink
            to={me}
            end
            className={({ isActive }) => item({ isActive, section: "home" })}
          >
            <LuUser className="h-[18px] w-[18px] text-ink-soft" />{" "}
            {t("nav.myProfile")}
          </NavLink>
          {user ? (
            <button
              type="button"
              onClick={handleSignOut}
              className={`${item({ isActive: false })} w-full`}
            >
              <LuLogOut className="h-[18px] w-[18px]" /> {t("auth.signOut")}
            </button>
          ) : (
            <NavLink
              to="/app/login"
              className={({ isActive }) => item({ isActive, section: "home" })}
            >
              <LuLogOut className="h-[18px] w-[18px]" /> {t("auth.signIn")}
            </NavLink>
          )}

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
    </dialog>
  );
}
