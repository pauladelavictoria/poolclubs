import {
  LuHouse,
  LuTrophy,
  LuSwords,
  LuCircleDot,
  LuTarget,
  LuCalendarDays,
  LuPlus,
  LuSettings,
  LuUsers,
} from "react-icons/lu";
import type { Key } from "@/i18n";

export type NavItem = {
  to: string;
  /** Translated at render time, so the rail relabels itself with the language. */
  labelKey: Key;
  icon: React.ComponentType<{ className?: string }>;
  /** `end` so a parent route doesn't stay highlighted on its children. */
  end?: boolean;
};

/** The five thumb-reachable destinations. Everything else lives in the drawer. */
export const PRIMARY_NAV: NavItem[] = [
  { to: "/app", labelKey: "nav.home", icon: LuHouse, end: true },
  { to: "/app/ranking", labelKey: "nav.ranking", icon: LuTrophy, end: true },
  { to: "/app/games", labelKey: "nav.games", icon: LuCircleDot, end: true },
  { to: "/app/drills", labelKey: "nav.drills", icon: LuTarget, end: true },
];

/**
 * Full map, used by the drawer, in the order the club is thought about: where
 * you are, what you played, what you practise, where that puts you.
 * The club identity and switcher sit above these — they're not a destination.
 * Administering the roster is part of club settings; reading it is its own page.
 */
export const NAV_SECTIONS: { headingKey: Key; items: NavItem[] }[] = [
  {
    headingKey: "nav.club",
    items: [
      { to: "/app/players", labelKey: "nav.players", icon: LuUsers, end: true },
      {
        to: "/app/club",
        labelKey: "nav.clubSettings",
        icon: LuSettings,
        end: true,
      },
    ],
  },
  {
    headingKey: "nav.games",
    items: [
      {
        to: "/app/games",
        labelKey: "nav.allGames",
        icon: LuCircleDot,
        end: true,
      },
      {
        to: "/app/challenges",
        labelKey: "nav.challenges",
        icon: LuSwords,
        end: true,
      },
      { to: "/app/games/new", labelKey: "nav.addGame", icon: LuPlus },
    ],
  },
  {
    headingKey: "nav.training",
    items: [
      { to: "/app/drills", labelKey: "nav.drills", icon: LuTarget, end: true },
    ],
  },
  {
    headingKey: "nav.rankings",
    items: [
      {
        to: "/app/ranking",
        labelKey: "nav.rankingGlobal",
        icon: LuTrophy,
        end: true,
      },
      {
        to: "/app/ranking/daily",
        labelKey: "nav.rankingDaily",
        icon: LuCalendarDays,
      },
    ],
  },
];
