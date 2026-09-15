import { Link, useRouterState } from "@tanstack/react-router";
import { LuCompass } from "react-icons/lu";
import { EmptyState } from "@/components/ui/EmptyState";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { useT, type Key } from "@/i18n";

/**
 * Where a dead link under a given section should send you back to — the
 * section's own index rather than the homepage, since that is where the
 * thing you were looking for (if it exists) actually lives.
 */
type Target = { to: string; labelKey: Key; titleKey: Key };

const SECTION_INDEX: Record<string, Omit<Target, "to">> = {
  clubs: { labelKey: "nav.publicClubs", titleKey: "notFound.club" },
  players: { labelKey: "nav.publicPlayers", titleKey: "notFound.player" },
  tournaments: {
    labelKey: "nav.publicTournaments",
    titleKey: "tournaments.missing",
  },
  drills: { labelKey: "nav.publicDrills", titleKey: "notFound.drill" },
};

const APP_SECTION_INDEX: Record<string, Omit<Target, "to">> = {
  players: { labelKey: "nav.players", titleKey: "players.notFound" },
  tournaments: { labelKey: "nav.tournaments", titleKey: "tournaments.missing" },
  games: { labelKey: "nav.games", titleKey: "games.notFound" },
  drills: { labelKey: "nav.drills", titleKey: "drills.notFound" },
};

/** The nearest index page for a dead URL, titled for what was being looked
 *  for — or the app/site home as a fallback when the URL names no entity. */
function target(pathname: string): Target {
  const appMatch = /^\/app\/([^/]+)\/([^/]+)/.exec(pathname);
  const section = appMatch && APP_SECTION_INDEX[appMatch[2]];
  if (appMatch && section)
    return { to: `/app/${appMatch[1]}/${appMatch[2]}`, ...section };
  if (appMatch)
    return {
      to: `/app/${appMatch[1]}`,
      labelKey: "notFound.home",
      titleKey: "notFound.title",
    };

  const publicSection = /^\/([^/]+)/.exec(pathname);
  const index = publicSection && SECTION_INDEX[publicSection[1]];
  if (index) return { to: `/${publicSection![1]}`, ...index };

  return {
    to: "/",
    labelKey: "notFound.home",
    titleKey: "notFound.title",
  };
}

/**
 * The router's defaultNotFoundComponent. It replaces two catch-all routes that
 * used to silently <Navigate> a bad URL to "/" or "/app" — which hid typos and
 * made a dead link look like a working one.
 *
 * The link out goes to the section's own index (clubs/players/tournaments/…)
 * rather than always home, since a mistyped or stale id is most likely still
 * findable one level up.
 */
export function NotFound() {
  const { t } = useT();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { to, labelKey, titleKey } = target(pathname);

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <EmptyState
        icon={<LuCompass className="h-5 w-5" aria-hidden />}
        title={t(titleKey)}
        hint={t("notFound.body")}
        action={
          <Link to={to as never} className={buttonClasses()}>
            {t(labelKey)}
          </Link>
        }
      />
    </div>
  );
}
