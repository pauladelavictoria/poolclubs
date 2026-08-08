import { NavLink } from "react-router-dom";

const TABS = [
  { suffix: "", label: "Partidos" },
  { suffix: "/training/plan", label: "Plan de entrenamiento" },
  { suffix: "/training", label: "Progreso de entrenamiento" },
];

/**
 * The three views of one player. Shown on all of them, so the set never moves
 * and "where am I" is answered by the same row every time.
 */
export default function PlayerTabs({ playerId }: { playerId: number }) {
  return (
    // ponytail: links, not ARIA tabs — NavLink already marks the current one
    // with aria-current, and each view is its own URL.
    <nav
      aria-label="Vistas del jugador"
      className="flex gap-0.5 rounded-control border border-hairline bg-pocket p-0.5"
    >
      {TABS.map(({ suffix, label }) => (
        <NavLink
          key={suffix}
          to={`/players/${playerId}${suffix}`}
          // /training is a prefix of /training/plan, so every tab matches exactly
          end
          className={({ isActive }) =>
            [
              "flex-1 rounded-[7px] px-3 py-2 text-center text-caption font-medium",
              "transition-[background-color,color] duration-150 ease-[var(--ease-out)]",
              isActive ? "bg-rail text-ink" : "text-ink-faint hover:text-ink-soft",
            ].join(" ")
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
