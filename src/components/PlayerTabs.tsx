import { NavLink } from "react-router-dom";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { useT, type Key } from "@/i18n";

const TABS: { suffix: string; labelKey: Key }[] = [
  { suffix: "", labelKey: "players.tabGames" },
  { suffix: "/training/plan", labelKey: "players.tabPlan" },
  { suffix: "/training", labelKey: "players.tabProgress" },
];

export default function PlayerTabs({
  playerId,
  as = "tabs",
}: {
  playerId: number;
  as?: "tabs" | "buttons";
}) {
  const isTabs = as === "tabs";
  const { t } = useT();

  return (
    <nav
      aria-label={t("players.tabsLabel")}
      className={
        isTabs
          ? "flex gap-0.5 rounded-control border border-hairline bg-pocket p-0.5"
          : // One per row on phones: three long labels side by side wrap into
            // ragged two-line buttons at that width
            "grid gap-2 sm:grid-cols-3"
      }
    >
      {TABS.map(({ suffix, labelKey }) => (
        <NavLink
          key={suffix}
          to={`/app/players/${playerId}${suffix}`}
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
          {t(labelKey)}
        </NavLink>
      ))}
    </nav>
  );
}
