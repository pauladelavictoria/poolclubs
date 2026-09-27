import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { LuLogIn, LuLogOut } from "react-icons/lu";
import { Avatar } from "@/components/ui/Avatar";
import { useOutsideClose } from "@/hooks/useOutsideClose";
import { useSession } from "@/hooks/useAuth";
import { useSignOut } from "@/hooks/useSignOut";
import { useT } from "@/i18n";

const menuItemClasses =
  "flex h-10 w-full items-center gap-2.5 px-4 text-body text-ink-soft transition-colors duration-150 hover:bg-felt hover:text-ink";

/**
 * You, in the public bar: the same corner and the same popover as inside the
 * app, minus the club-scoped rows — out here there is no club in context, so
 * what is left is who you are and the way out. The way *in* is its own button
 * in the bar.
 *
 * Not ProfileMenu itself: that one reads `useAuth`, which requires a club
 * route, and its links are club-scoped.
 */
export function PublicUserMenu() {
  const { t } = useT();
  const { user, memberships } = useSession();
  const signOut = useSignOut();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClose(open, ref, () => setOpen(false));

  if (!user) return null;

  // Every membership carries the same person's picture (see getSession), so any
  // of them answers "what do you look like"; with no club yet, initials do.
  const avatarUrl = memberships[0]?.avatar_url ?? null;
  const name = user.fullName || user.email || "?";

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("auth.yourProfile")}
        title={name}
        className="flex h-10 w-10 items-center justify-center rounded-full transition-opacity duration-150 hover:opacity-80"
      >
        <Avatar name={name} url={avatarUrl} className="h-8 w-8" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-2 w-56 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-card border border-hairline bg-felt-raised"
        >
          <div className="border-b border-hairline px-4 py-3">
            <p className="truncate text-body font-medium text-ink">{name}</p>
            {user.email && user.fullName && (
              <p className="truncate text-caption text-ink-faint">
                {user.email}
              </p>
            )}
          </div>

          {/* On a phone there is no room left in the bar for this row, so the
              popover carries it; from md up the bar already spells it out next
              to the avatar, so this row would say the same thing twice. */}
          <Link
            to="/app"
            role="menuitem"
            onClick={() => setOpen(false)}
            className={`${menuItemClasses} md:hidden`}
          >
            <LuLogIn className="h-[18px] w-[18px] shrink-0" aria-hidden />
            {t("auth.openApp")}
          </Link>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              signOut.mutate();
            }}
            className={menuItemClasses}
          >
            <LuLogOut className="h-[18px] w-[18px] shrink-0" aria-hidden />
            {t("auth.signOut")}
          </button>
        </div>
      )}
    </div>
  );
}
