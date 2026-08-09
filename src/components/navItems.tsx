import {
  LuHouse,
  LuTrophy,
  LuSwords,
  LuCircleDot,
  LuTarget,
  LuCalendarDays,
  LuPlus,
  LuSettings,
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
  { to: "/", labelKey: "nav.home", icon: LuHouse, end: true },
  { to: "/ranking", labelKey: "nav.ranking", icon: LuTrophy, end: true },
  { to: "/games", labelKey: "nav.games", icon: LuCircleDot, end: true },
  { to: "/drills", labelKey: "nav.drills", icon: LuTarget, end: true },
];

/**
 * Full map, used by the drawer, in the order the club is thought about: where
 * you are, what you played, what you practise, where that puts you.
 * The club identity and switcher sit above these — they're not a destination.
 * The roster is part of club settings, so it isn't a nav entry.
 */
export const NAV_SECTIONS: { headingKey: Key; items: NavItem[] }[] = [
  {
    headingKey: "nav.club",
    items: [
      {
        to: "/club",
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
        to: "/games",
        labelKey: "nav.allGames",
        icon: LuCircleDot,
        end: true,
      },
      {
        to: "/challenges",
        labelKey: "nav.challenges",
        icon: LuSwords,
        end: true,
      },
      { to: "/games/new", labelKey: "nav.addGame", icon: LuPlus },
    ],
  },
  {
    headingKey: "nav.training",
    items: [
      { to: "/drills", labelKey: "nav.drills", icon: LuTarget, end: true },
    ],
  },
  {
    headingKey: "nav.rankings",
    items: [
      {
        to: "/ranking",
        labelKey: "nav.rankingGlobal",
        icon: LuTrophy,
        end: true,
      },
      {
        to: "/ranking/daily",
        labelKey: "nav.rankingDaily",
        icon: LuCalendarDays,
      },
    ],
  },
];
