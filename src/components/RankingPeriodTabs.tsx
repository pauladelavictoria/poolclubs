import { AppLink } from "@/components/AppLink";
import {
  segmentedShell,
  segmentedItem,
} from "@/components/ui/segmentedStyles";
import { useT } from "@/i18n";

/**
 * All-time or one day, as one control on one section of the nav.
 *
 * The two ladders are still two routes — they read different data and the daily
 * one keeps its date in the URL — but they are one destination as far as anyone
 * navigating is concerned, so the switch belongs on the page, next to the day
 * picker it hands over to, and not as a second row in the drawer.
 *
 * Links rather than the button-based <Segmented>: each view is an address, so
 * these are things you can middle-click, and the browser gets to prefetch them.
 */
export default function RankingPeriodTabs({ daily }: { daily: boolean }) {
  const { t } = useT();

  return (
    <div className={segmentedShell} role="group" aria-label={t("ranking.view")}>
      <AppLink
        to="/app/$clubSlug/ranking"
        aria-current={daily ? undefined : "page"}
        className={segmentedItem(!daily)}
      >
        {t("nav.rankingGlobal")}
      </AppLink>
      {/* No date: the route redirects a bare daily URL to today's. */}
      <AppLink
        to="/app/$clubSlug/ranking/daily"
        aria-current={daily ? "page" : undefined}
        className={segmentedItem(daily)}
      >
        {t("nav.rankingDaily")}
      </AppLink>
    </div>
  );
}
