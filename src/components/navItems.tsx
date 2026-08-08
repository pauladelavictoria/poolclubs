import {
  LuHouse,
  LuTrophy,
  LuSwords,
  LuTarget,
  LuUsers,
  LuCalendarDays,
  LuPlus,
} from "react-icons/lu";

export type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** `end` so a parent route doesn't stay highlighted on its children. */
  end?: boolean;
};

/** The five thumb-reachable destinations. Everything else lives in the drawer. */
export const PRIMARY_NAV: NavItem[] = [
  { to: "/", label: "Inicio", icon: LuHouse, end: true },
  { to: "/ranking", label: "Ranking", icon: LuTrophy, end: true },
  { to: "/games", label: "Partidos", icon: LuSwords, end: true },
  { to: "/drills", label: "Entreno", icon: LuTarget, end: true },
];

/** Full map, used by the drawer. */
export const NAV_SECTIONS: { heading: string; items: NavItem[] }[] = [
  {
    heading: "Ranking",
    items: [
      { to: "/ranking", label: "Global", icon: LuTrophy, end: true },
      { to: "/ranking/daily", label: "Diario", icon: LuCalendarDays },
    ],
  },
  {
    heading: "Partidos",
    items: [
      {
        to: "/games",
        label: "Todos los partidos",
        icon: LuSwords,
        end: true,
      },
      { to: "/games/new", label: "Añadir partido", icon: LuPlus },
    ],
  },
  {
    heading: "Club",
    items: [
      { to: "/players", label: "Jugadores", icon: LuUsers, end: true },
      { to: "/drills", label: "Ejercicios", icon: LuTarget, end: true },
    ],
  },
];
