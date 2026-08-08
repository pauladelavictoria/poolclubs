import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

/**
 * Identity only. Navigation and sign-out live in the drawer, so this is a
 * 32px avatar that goes to your own profile and nothing else.
 */
export default function ProfileMenu() {
  const { user, player } = useAuth();

  if (!user) {
    return (
      <Link
        to="/login"
        className="inline-flex h-8 shrink-0 items-center rounded-control border border-hairline bg-felt-raised px-3 text-caption font-medium text-ink transition-colors duration-150 hover:border-hairline-strong"
      >
        Entrar
      </Link>
    );
  }

  const avatarUrl = user.user_metadata?.avatar_url;
  const userName = user.user_metadata?.full_name || user.email;

  return (
    <Link
      to={player ? `/players/${player.id}` : "/"}
      className="shrink-0 rounded-full transition-opacity duration-150 hover:opacity-80"
      title={userName}
      aria-label="Tu perfil"
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          className="h-8 w-8 rounded-full object-cover outline outline-1 -outline-offset-1 outline-white/10"
        />
      ) : (
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-felt-raised text-caption font-semibold text-ink-soft outline outline-1 -outline-offset-1 outline-white/10">
          {userName?.charAt(0).toUpperCase()}
        </span>
      )}
    </Link>
  );
}
