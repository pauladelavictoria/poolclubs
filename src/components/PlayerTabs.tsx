import { NavLink } from "react-router-dom";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { useT, type Key } from "@/i18n";

const TABS: { suffix: string; labelKey: Key }[] = [
  { suffix: "", labelKey: "players.tabGames" },
  { suffix: "/training/plan", labelKey: "players.tabPlan" },
  { suffix: "/training", labelKey: "players.tabProgress" },
  { suffix: "/settings", labelKey: "players.tabSettings" },
];

// Tailwind needs the literal class name in source to generate it, so this
// can't be built from a template string.
const BUTTON_GRID_COLS: Record<number, string> = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-4",
};

export default function PlayerTabs({
  playerId,
  as = "tabs",
  isOwnProfile = true,
}: {
  playerId: number;
  as?: "tabs" | "buttons";
  /** Training plan and progress are private — only the games tab shows on a
   *  profile that isn't yours. */
  isOwnProfile?: boolean;
}) {
  const isTabs = as === "tabs";
  const { t } = useT();
  const tabs = isOwnProfile ? TABS : TABS.filter(({ suffix }) => suffix === "");

  return (
    <nav
      aria-label={t("players.tabsLabel")}
      className={
        isTabs
          ? "flex gap-0.5 rounded-control border border-hairline bg-pocket p-0.5"
          : // One per row on phones: long labels side by side wrap into
            // ragged two-line buttons at that width
            `grid gap-2 ${BUTTON_GRID_COLS[tabs.length] ?? "sm:grid-cols-3"}`
      }
    >
      {tabs.map(({ suffix, labelKey }) => (
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
