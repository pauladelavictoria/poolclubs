import {
  LuTrophy,
  LuSwords,
  LuCircleDot,
  LuNetwork,
  LuTarget,
  LuSettings,
  LuUsers,
  LuHouse,
  LuClipboardList,
  LuChartColumn,
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
  /**
   * Exact matching. Only for rows that would otherwise swallow a sibling: the
   * lobby (every club path starts with it) and the rows under a player, whose
   * paths nest inside each other. A section's own row leaves this off, so
   * "Players" stays marked while you are reading one player, and the same for
   * tournaments, matches, drills and the two ranking views.
   */
  end?: boolean;
};

/**
 * The four thumb-reachable destinations, with "More" making the fifth tab.
 *
 * The lobby leads them now. It is where everything else shows up — the feed, the
 * standings, what is waiting on you — and on a phone there is no pinned column
 * and no bar row to reach it from, so a tab is the only place left for it.
 *
 * Games gave up the slot rather than the lobby squeezing in as a sixth: five
 * tabs is what fits a 360px phone (see NavRail), and the two things a tab for
 * games led to — the list and adding one — are the club's home page and the
 * button on it.
 */
export const PRIMARY_NAV: NavItem[] = [
  {
    to: "/app/$clubSlug",
    labelKey: "nav.home",
    icon: LuHouse,
    section: "home",
    end: true,
  },
  {
    to: "/app/$clubSlug/tournaments",
    labelKey: "nav.tournaments",
    icon: LuNetwork,
    section: "tournaments",
  },
  {
    to: "/app/$clubSlug/ranking",
    labelKey: "nav.ranking",
    icon: LuTrophy,
    section: "ranking",
  },
  {
    to: "/app/$clubSlug/drills",
    labelKey: "nav.drills",
    icon: LuTarget,
    section: "drills",
  },
];

/**
 * The drawer is two lists: the club, then you.
 *
 * One row per destination and no sub-lists. What used to be four headings with
 * one or two rows under each ("Rankings → Overall, Daily") is a heading for
 * every place you can be in the club, in the order the club is thought about.
 * Ranking is a single row on purpose: the ladder defaults to all-time and the
 * page itself switches to a day, which is a filter, not a second destination.
 *
 * Club settings sit last, after the places, because administering the club is
 * not one of them. They only render for admins (see NavDrawer).
 */
export const NAV_SECTIONS: { headingKey: Key; items: NavItem[] }[] = [
  {
    headingKey: "nav.club",
    items: [
      {
        to: "/app/$clubSlug",
        labelKey: "nav.home",
        icon: LuHouse,
        section: "home",
        end: true,
      },
      {
        to: "/app/$clubSlug/players",
        labelKey: "nav.players",
        icon: LuUsers,
        section: "home",
      },
      {
        to: "/app/$clubSlug/tournaments",
        labelKey: "nav.tournaments",
        icon: LuNetwork,
        section: "tournaments",
      },
      {
        to: "/app/$clubSlug/ranking",
        labelKey: "nav.ranking",
        icon: LuTrophy,
        section: "ranking",
      },
      {
        to: "/app/$clubSlug/games",
        labelKey: "nav.games",
        icon: LuCircleDot,
        section: "games",
      },
      {
        to: "/app/$clubSlug/drills",
        labelKey: "nav.drills",
        icon: LuTarget,
        section: "drills",
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
];

/**
 * Your half of the drawer. The rows addressed by player id get it from the
 * drawer, which fills in one `params` for the whole list.
 */
export const ME_NAV: NavItem[] = [
  {
    to: "/app/$clubSlug/me",
    labelKey: "nav.games",
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
    to: "/app/$clubSlug/players/$playerId/training/plan",
    labelKey: "nav.trainingPlan",
    icon: LuClipboardList,
    section: "drills",
  },
  {
    to: "/app/$clubSlug/players/$playerId/training",
    labelKey: "nav.trainingProgress",
    icon: LuChartColumn,
    section: "drills",
    end: true,
  },
  {
    to: "/app/$clubSlug/players/$playerId/settings",
    labelKey: "nav.settings",
    icon: LuSettings,
    section: "home",
    end: true,
  },
];
