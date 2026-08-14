import type { LinkProps } from "@tanstack/react-router";
import { AppLink } from "@/components/AppLink";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { useT, type Key } from "@/i18n";

/**
 * Whole routes rather than the "" / "/training/plan" suffixes this used to
 * append to a base path: the club is implicit in AppLink, and a named route is
 * checked at build time where a concatenated string never was. `own` marks the
 * three that only make sense on your own profile.
 */
const TABS: { to: LinkProps["to"]; labelKey: Key; own: boolean }[] = [
  {
    to: "/app/$clubSlug/players/$playerId",
    labelKey: "players.tabGames",
    own: false,
  },
  {
    to: "/app/$clubSlug/players/$playerId/training/plan",
    labelKey: "players.tabPlan",
    own: true,
  },
  {
    to: "/app/$clubSlug/players/$playerId/training",
    labelKey: "players.tabProgress",
    own: true,
  },
  {
    to: "/app/$clubSlug/players/$playerId/settings",
    labelKey: "players.tabSettings",
    own: true,
  },
];

// Tailwind needs the literal class name in source to generate it, so this
// can't be built from a template string.
const BUTTON_GRID_COLS: Record<number, string> = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-4",
};

const pill = ({ isActive }: { isActive: boolean }) =>
  [
    "shrink-0 whitespace-nowrap rounded-[7px] px-3 py-2 text-center text-caption font-medium",
    "transition-[background-color,color] duration-150 ease-[var(--ease-out)]",
    isActive ? "bg-rail text-ink" : "text-ink-faint hover:text-ink-soft",
  ].join(" ");

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
  const tabs = isOwnProfile ? TABS : TABS.filter(({ own }) => !own);

  return (
    <nav
      aria-label={t("players.tabsLabel")}
      className={
        isTabs
          ? // Labels like "Progreso de entrenamiento" don't fit four across on a
            // phone; scroll the strip horizontally instead of squeezing each
            // pill into a wrapped, ragged two-line label.
            "flex gap-0.5 overflow-x-auto rounded-control border border-hairline bg-pocket p-0.5"
          : // One per row on phones: long labels side by side wrap into
            // ragged two-line buttons at that width
            `grid gap-2 ${BUTTON_GRID_COLS[tabs.length] ?? "sm:grid-cols-3"}`
      }
    >
      {tabs.map(({ to, labelKey }) => (
        <AppLink
          key={String(to)}
          to={to}
          params={{ playerId }}
          // /training is a prefix of /training/plan, so every tab matches exactly
          activeOptions={{ exact: true }}
          className={
            isTabs
              ? pill({ isActive: false })
              : buttonClasses({ variant: "secondary" })
          }
          activeProps={
            isTabs ? { className: pill({ isActive: true }) } : undefined
          }
        >
          {t(labelKey)}
        </AppLink>
      ))}
    </nav>
  );
}
