import { createFileRoute } from "@tanstack/react-router";
import { LuNetwork } from "react-icons/lu";
import PublicShell from "@/components/PublicShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { useT } from "@/i18n";

/**
 * Public and deliberately empty for now: the route and its place in the root nav
 * exist so the shape of the public side is settled, and so the URL can be linked
 * to before there is anything behind it.
 */
export const Route = createFileRoute("/tournaments")({
  head: () => ({ meta: [{ title: "PoolClubs" }] }),
  component: PublicTournamentsRoute,
});

function PublicTournamentsRoute() {
  const { t } = useT();

  return (
    <PublicShell title={t("public.publicTournaments.title")}>
      <EmptyState
        icon={<LuNetwork className="h-5 w-5" aria-hidden />}
        title={t("public.publicTournaments.soonTitle")}
        hint={t("public.publicTournaments.soonHint")}
      />
    </PublicShell>
  );
}
