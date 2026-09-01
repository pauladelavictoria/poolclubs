import { Link } from "@tanstack/react-router";
import { LuPlus } from "react-icons/lu";
import { useAuth } from "@/hooks/useAuth";
import { isRealClub } from "@/libs/algorithms/features";
import { Card } from "@/components/ui/Card";
import { useT } from "@/i18n";

/**
 * What the global lobby is, and the way out of it.
 *
 * A player with no club used to be sent to "create a club" and could go nowhere
 * else, so the club funnel needed no signposting — it *was* the app. Now they
 * land in a working lobby instead, and this is what keeps the funnel: it says
 * where they are, and points at the club they will eventually want.
 *
 * No dismiss. It is only shown in the lobby, and joining a real club is what
 * makes it go away.
 */
export default function LobbyBanner() {
  const { t } = useT();
  const { activeClub } = useAuth();

  if (isRealClub(activeClub)) return null;

  return (
    <Card className="mx-4 mt-4 p-4 md:mx-6">
      <h2 className="text-h4 font-semibold text-ink">{t("club.lobbyTitle")}</h2>
      <p className="mt-1 max-w-prose text-body text-ink-soft">
        {t("club.lobbyBody")}
      </p>
      <Link
        to="/app/clubs/new"
        className="mt-3 inline-flex items-center gap-1.5 text-body font-medium text-strike transition-colors duration-150 hover:text-ink"
      >
        <LuPlus className="h-4 w-4" aria-hidden />
        {t("club.create")}
      </Link>
    </Card>
  );
}
