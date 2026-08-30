import { AppLink } from "@/components/layout/AppLink";
import { segmentedShell, segmentedItem } from "@/components/ui/segmentedStyles";
import { useT } from "@/i18n";

/**
 * The three halves of running a club — what it is, the room it plays in, and
 * who is in it — as one control over three sub-routes.
 *
 * Links rather than the button-based <Segmented>, for the same reason
 * RankingPeriodTabs is: each tab is an address, so it can be linked to, opened
 * in a new tab, and prefetched on hover. `activeProps` rather than a pathname
 * comparison, because the router already knows which one is current.
 */
export default function ClubTabs() {
  const { t } = useT();

  return (
    <div
      className={segmentedShell}
      role="group"
      aria-label={t("club.settings")}
    >
      <AppLink
        to="/app/$clubSlug/club"
        activeOptions={{ exact: true }}
        activeProps={{ className: segmentedItem(true), "aria-current": "page" }}
        inactiveProps={{ className: segmentedItem(false) }}
      >
        {t("club.tabs.info")}
      </AppLink>
      <AppLink
        to="/app/$clubSlug/club/tables"
        activeProps={{ className: segmentedItem(true), "aria-current": "page" }}
        inactiveProps={{ className: segmentedItem(false) }}
      >
        {t("club.tabs.tables")}
      </AppLink>
      <AppLink
        to="/app/$clubSlug/club/members"
        activeProps={{ className: segmentedItem(true), "aria-current": "page" }}
        inactiveProps={{ className: segmentedItem(false) }}
      >
        {t("club.tabs.members")}
      </AppLink>
    </div>
  );
}
