import {
  LuHouse,
  LuTrophy,
  LuSwords,
  LuTarget,
  LuUsers,
  LuCalendarDays,
  LuPlus,
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
  { to: "/games", labelKey: "nav.games", icon: LuSwords, end: true },
  { to: "/drills", labelKey: "nav.drills", icon: LuTarget, end: true },
];

/** Full map, used by the drawer. */
export const NAV_SECTIONS: { headingKey: Key; items: NavItem[] }[] = [
  {
    headingKey: "nav.training",
    items: [
      { to: "/drills", labelKey: "nav.drills", icon: LuTarget, end: true },
    ],
  },
  {
    headingKey: "nav.rankings",
    items: [
      { to: "/ranking", labelKey: "nav.rankingGlobal", icon: LuTrophy, end: true },
      { to: "/ranking/daily", labelKey: "nav.rankingDaily", icon: LuCalendarDays },
    ],
  },
  {
    headingKey: "nav.games",
    items: [
      {
        to: "/games",
        labelKey: "nav.allGames",
        icon: LuSwords,
        end: true,
      },
      { to: "/games/new", labelKey: "nav.addGame", icon: LuPlus },
    ],
  },
  {
    headingKey: "nav.club",
    items: [{ to: "/players", labelKey: "nav.players", icon: LuUsers, end: true }],
  },
];
