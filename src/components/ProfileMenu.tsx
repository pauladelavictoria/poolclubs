import { useRef, useState } from "react";
import { AppLink } from "@/components/AppLink";
import { LuUser, LuLogOut } from "react-icons/lu";
import { toast } from "react-toastify";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/hooks/useAuth";
import { useSignOut } from "@/hooks/useSignOut";
import { useOutsideClose } from "@/libs/useOutsideClose";
import { useT } from "@/i18n";

const itemClasses =
  "flex h-10 w-full items-center gap-2.5 px-4 text-body text-ink-soft transition-colors duration-150 hover:bg-felt hover:text-ink";

/**
 * You, in the bar. The drawer is five taps of navigation away from the top
 * right corner, so the two things you look for up here — your own profile and
 * the way out — are on the avatar itself.
 */
export default function ProfileMenu() {
  const { user, player } = useAuth();
  const { t } = useT();
  const signOut = useSignOut();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClose(open, ref, () => setOpen(false));

  // The signed-out branch this used to carry is gone: the header only renders
  // inside a club, and getting into one requires a session.
  //
  // The player row wins for the picture: it carries an uploaded one, the auth
  // metadata only ever has the provider's.
  const avatarUrl = player.avatar_url;
  const userName = user.fullName || user.email || undefined;

  const handleSignOut = async () => {
    setOpen(false);
    try {
      await signOut.mutateAsync();
      toast.success(t("auth.signedOut"));
    } catch {
      // Logged by the mutation cache; this is the part the user sees.
      toast.error(t("auth.signOutError"));
    }
  };

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("auth.yourProfile")}
        title={userName}
        className="flex h-10 w-10 items-center justify-center rounded-full transition-opacity duration-150 hover:opacity-80"
      >
        <Avatar name={userName ?? "?"} url={avatarUrl} className="h-8 w-8" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-2 w-56 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-card border border-hairline bg-felt-raised"
        >
          <div className="border-b border-hairline px-4 py-3">
            <p className="truncate text-body font-medium text-ink">
              {player?.name ?? userName}
            </p>
            {user.email && (
              <p className="truncate text-caption text-ink-faint">
                {user.email}
              </p>
            )}
          </div>

          <AppLink
            to="/app/$clubSlug/players/$playerId"
            params={{ playerId: player.id }}
            role="menuitem"
            onClick={() => setOpen(false)}
            className={itemClasses}
          >
            <LuUser className="h-[18px] w-[18px] shrink-0" aria-hidden />
            {t("nav.myProfile")}
          </AppLink>
          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            className={itemClasses}
          >
            <LuLogOut className="h-[18px] w-[18px] shrink-0" aria-hidden />
            {t("auth.signOut")}
          </button>
        </div>
      )}
    </div>
  );
}
