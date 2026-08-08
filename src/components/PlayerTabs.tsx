import { NavLink } from "react-router-dom";
import { buttonClasses } from "@/components/ui/buttonStyles";

const TABS = [
  { suffix: "", label: "Partidos" },
  { suffix: "/training/plan", label: "Plan de entrenamiento" },
  { suffix: "/training", label: "Progreso de entrenamiento" },
];

export default function PlayerTabs({
  playerId,
  as = "tabs",
}: {
  playerId: number;
  as?: "tabs" | "buttons";
}) {
  const isTabs = as === "tabs";

  return (
    <nav
      aria-label="Vistas del jugador"
      className={
        isTabs
          ? "flex gap-0.5 rounded-control border border-hairline bg-pocket p-0.5"
          : // One per row on phones: three long labels side by side wrap into
            // ragged two-line buttons at that width
            "grid gap-2 sm:grid-cols-3"
      }
    >
      {TABS.map(({ suffix, label }) => (
        <NavLink
          key={suffix}
          to={`/players/${playerId}${suffix}`}
          // /training is a prefix of /training/plan, so every tab matches exactly
          end
          className={({ isActive }) =>
            isTabs
              ? [
                  "flex-1 rounded-[7px] px-3 py-2 text-center text-caption font-medium",
                  "transition-[background-color,color] duration-150 ease-[var(--ease-out)]",
                  isActive
                    ? "bg-rail text-ink"
                    : "text-ink-faint hover:text-ink-soft",
                ].join(" ")
              : buttonClasses({ variant: "secondary" })
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
