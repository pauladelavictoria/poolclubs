import {
  LuTrophy,
  LuSwords,
  LuCircleDot,
  LuNetwork,
  LuTarget,
  LuCalendarDays,
  LuPlus,
  LuSettings,
  LuUsers,
} from "react-icons/lu";
import type { LinkProps } from "@tanstack/react-router";
import type { Key } from "@/i18n";
import type { SectionId } from "@/libs/sections";

export type NavItem = {
  /**
   * The route's own pattern, not a path. The club is filled in by AppLink, which
   * is what every one of these is rendered through — so a nav item names a route
   * and the router checks it exists.
   */
  to: LinkProps["to"];
  /** Translated at render time, so the rail relabels itself with the language. */
  labelKey: Key;
  icon: React.ComponentType<{ className?: string }>;
  /** Which of the four places this leads to — carries the mark. See libs/sections. */
  section: SectionId;
  /** Exact matching, so a parent route doesn't stay highlighted on its children. */
  end?: boolean;
};

/**
 * The four thumb-reachable destinations: the four places the app is made of,
 * in the order libs/sections declares them.
 *
 * The lobby is not among them. It is not a fifth place, it is where the four
 * show up, and it is one tap away on the club name in the bar (the same job
 * the ball does on the desktop rail). That is what buys tournaments — a
 * section with its own hue, its own glyph and its own page — a slot here
 * instead of a line in the drawer.
 */
export const PRIMARY_NAV: NavItem[] = [
  {
    to: "/app/$clubSlug/tournaments",
    labelKey: "nav.tournaments",
    icon: LuNetwork,
    section: "tournaments",
    end: true,
  },
  {
    to: "/app/$clubSlug/games",
    labelKey: "nav.games",
    icon: LuCircleDot,
    section: "games",
    end: true,
  },
  {
    to: "/app/$clubSlug/ranking",
    labelKey: "nav.ranking",
    icon: LuTrophy,
    section: "ranking",
    end: true,
  },
  {
    to: "/app/$clubSlug/drills",
    labelKey: "nav.drills",
    icon: LuTarget,
    section: "drills",
    end: true,
  },
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
      {
        to: "/app/$clubSlug/players",
        labelKey: "nav.players",
        icon: LuUsers,
        section: "home",
        end: true,
      },
      {
        to: "/app/$clubSlug/club",
        labelKey: "nav.clubSettings",
        icon: LuSettings,
        section: "home",
        end: true,
      },
    ],
  },
  {
    headingKey: "nav.tournaments",
    items: [
      {
        to: "/app/$clubSlug/tournaments",
        labelKey: "nav.allTournaments",
        icon: LuNetwork,
        section: "tournaments",
        end: true,
      },
    ],
  },
  {
    headingKey: "nav.games",
    items: [
      {
        to: "/app/$clubSlug/games",
        labelKey: "nav.allGames",
        icon: LuCircleDot,
        section: "games",
        end: true,
      },
      {
        to: "/app/$clubSlug/challenges",
        labelKey: "nav.challenges",
        icon: LuSwords,
        section: "games",
        end: true,
      },
      {
        to: "/app/$clubSlug/games/new",
        labelKey: "nav.addGame",
        icon: LuPlus,
        section: "games",
      },
    ],
  },
  {
    headingKey: "nav.training",
    items: [
      {
        to: "/app/$clubSlug/drills",
        labelKey: "nav.drills",
        icon: LuTarget,
        section: "drills",
        end: true,
      },
    ],
  },
  {
    headingKey: "nav.rankings",
    items: [
      {
        to: "/app/$clubSlug/ranking",
        labelKey: "nav.rankingGlobal",
        icon: LuTrophy,
        section: "ranking",
        end: true,
      },
      {
        to: "/app/$clubSlug/ranking/daily",
        labelKey: "nav.rankingDaily",
        icon: LuCalendarDays,
        section: "ranking",
      },
    ],
  },
];
