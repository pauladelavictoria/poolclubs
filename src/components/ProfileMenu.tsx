import { Link } from "react-router-dom";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/hooks/useAuth";
import { useT } from "@/i18n";

/**
 * Identity only. Navigation and sign-out live in the drawer, so this is a
 * 32px avatar that goes to your own profile and nothing else.
 */
export default function ProfileMenu() {
  const { user, player } = useAuth();
  const { t } = useT();

  if (!user) {
    return (
      <Link
        to="/app/login"
        className="inline-flex h-8 shrink-0 items-center rounded-control border border-hairline bg-felt-raised px-3 text-caption font-medium text-ink transition-colors duration-150 hover:border-hairline-strong"
      >
        {t("auth.signInShort")}
      </Link>
    );
  }

  // The player row wins: it carries an uploaded picture, the auth metadata only
  // ever has the provider's.
  const avatarUrl = player?.avatar_url ?? user.user_metadata?.avatar_url;
  const userName = user.user_metadata?.full_name || user.email;

  return (
    <Link
      to={player ? `/app/players/${player.id}` : "/app/me"}
      className="shrink-0 rounded-full transition-opacity duration-150 hover:opacity-80"
      title={userName}
      aria-label={t("auth.yourProfile")}
    >
      <Avatar name={userName ?? "?"} url={avatarUrl} className="h-8 w-8" />
    </Link>
  );
}
