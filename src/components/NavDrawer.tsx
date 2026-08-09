import { useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSignOut } from "@/hooks/useSignOut";
import { toast } from "react-toastify";
import { NAV_SECTIONS, type NavItem } from "@/components/navItems";
import { LANGS, useT, type Lang } from "@/i18n";
import { Select } from "@/components/ui/Select";
import {
  LuUser,
  LuClipboardList,
  LuChartColumn,
  LuLogOut,
  LuLanguages,
  LuHandshake,
} from "react-icons/lu";

const item = ({ isActive }: { isActive: boolean }) =>
  [
    "flex h-10 items-center gap-3 rounded-control px-3 text-body",
    "transition-colors duration-150",
    isActive
      ? "bg-strike-tint font-medium text-strike"
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
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const { user, player, activeClub, memberships, setActiveClub } = useAuth();
  const signOut = useSignOut();
  const { t, lang, setLang } = useT();

  // Only clubs you are actually in are switchable; a pending request is not a
  // place you can go yet.
  const switchable = memberships.filter((m) => m.status === "active");

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Without a linked player these point at /me/*, which sits behind
  // ProtectedRoute and so asks for login first.
  const me = player ? `/players/${player.id}` : "/me";
  const sections = NAV_SECTIONS.map((section) =>
    section.headingKey === "nav.training"
      ? {
          ...section,
          items: [
            ...section.items,
            {
              to: `${me}/training/plan`,
              labelKey: "nav.myPlan",
              icon: LuClipboardList,
            },
            {
              to: `${me}/training`,
              labelKey: "nav.myProgress",
              icon: LuChartColumn,
            },
          ] as NavItem[],
        }
      : section
  );

  const handleSignOut = async () => {
    onClose();
    try {
      await signOut.mutateAsync();
      toast.success(t("auth.signedOut"));
    } catch (error) {
      console.error(error);
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
        <div className="flex items-center gap-3 px-3 pb-4 pt-2">
          <img src="/ball.png" alt="" className="h-9 w-9 rounded-full" />
          <div className="min-w-0">
            <div className="truncate text-h4 font-semibold">
              {t("common.appName")}
            </div>
            <div className="truncate text-caption text-ink-faint">
              {activeClub?.name ?? t("club.noClub")}
            </div>
          </div>
        </div>

        {sections.map((section) => (
          <div key={section.headingKey}>
            <Heading>{t(section.headingKey)}</Heading>
            {section.items.map(({ to, labelKey, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={item}>
                <Icon className="h-[18px] w-[18px]" /> {t(labelKey)}
              </NavLink>
            ))}
          </div>
        ))}

        <div className="mt-5 border-t border-hairline pt-3">
          <NavLink to={me} end className={item}>
            <LuUser className="h-[18px] w-[18px]" /> {t("nav.myProfile")}
          </NavLink>
          {user ? (
            <button
              type="button"
              onClick={handleSignOut}
              className="flex h-10 w-full items-center gap-3 rounded-control px-3 text-body text-ink-soft transition-colors duration-150 hover:bg-felt-raised hover:text-ink"
            >
              <LuLogOut className="h-[18px] w-[18px]" /> {t("auth.signOut")}
            </button>
          ) : (
            <NavLink to="/login" className={item}>
              <LuLogOut className="h-[18px] w-[18px]" /> {t("auth.signIn")}
            </NavLink>
          )}

          {/* One club is the normal case and needs no control. */}
          {switchable.length > 1 && (
            <div
              className="mt-1 flex h-10 items-center gap-3 px-3"
              onClick={(e) => e.stopPropagation()}
            >
              <LuHandshake className="h-[18px] w-[18px] shrink-0 text-ink-soft" />
              <Select
                size="sm"
                aria-label={t("club.switch")}
                value={activeClub?.id ?? ""}
                onChange={(e) => setActiveClub(Number(e.target.value))}
              >
                {switchable.map((m) => (
                  <option key={m.club_id} value={m.club_id}>
                    {m.club?.name}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {/* Its own click handler: the drawer closes on any click inside the
              nav, and picking a language shouldn't dismiss it mid-choice. */}
          <div
            className="mt-1 flex h-10 items-center gap-3 px-3"
            onClick={(e) => e.stopPropagation()}
          >
            <LuLanguages className="h-[18px] w-[18px] shrink-0 text-ink-soft" />
            <Select
              size="sm"
              aria-label={t("nav.language")}
              value={lang}
              onChange={(e) => setLang(e.target.value as Lang)}
            >
              {LANGS.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </nav>
    </dialog>
  );
}
