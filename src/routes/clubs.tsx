import { createFileRoute } from "@tanstack/react-router";
import { LuUsers } from "react-icons/lu";
import PublicShell from "@/components/PublicShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { useT } from "@/i18n";

/**
 * Public and deliberately empty for now: the route and its place in the root nav
 * exist so the shape of the public side is settled, and so the URL can be linked
 * to before there is anything behind it.
 */
export const Route = createFileRoute("/clubs")({
  head: () => ({ meta: [{ title: "PoolClubs" }] }),
  component: PublicClubsRoute,
});

function PublicClubsRoute() {
  const { t } = useT();

  return (
    <PublicShell title={t("public.publicClubs.title")}>
      <EmptyState
        icon={<LuUsers className="h-5 w-5" aria-hidden />}
        title={t("public.publicClubs.soonTitle")}
        hint={t("public.publicClubs.soonHint")}
      />
    </PublicShell>
  );
}
