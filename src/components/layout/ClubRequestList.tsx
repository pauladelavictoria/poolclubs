import { useQuery } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { useClubRequests } from "@/hooks/useClub";
import { clubRequestsQuery } from "@/queries/operator";
import { dbErrorMessage } from "@/libs/algorithms/dbError";
import { useT } from "@/i18n";

/**
 * The clubs somebody has asked for, and the two buttons that decide.
 *
 * Approving is what creates a club — nothing else in the app does — so this is
 * the operator page's one write. The RPCs behind both buttons check
 * is_drill_admin themselves (sql/schema.sql); the route guard on /app/ops only
 * keeps the page out of everybody else's router.
 */
export default function ClubRequestList() {
  const { t, locale } = useT();
  const { data: requests, isLoading } = useQuery(clubRequestsQuery());
  const { approveRequest, rejectRequest } = useClubRequests();

  const fail = (op: "approveClubRequest" | "rejectClubRequest") => (err: unknown) =>
    toast.error(t(dbErrorMessage(err, op, { denied: "common.deniedError" })));

  return (
    <Card className="overflow-hidden">
      <CardHeader title={t("ops.requestsTitle")} />
      {isLoading ? (
        <SkeletonRows rows={2} />
      ) : (requests ?? []).length === 0 ? (
        <EmptyState title={t("ops.requestsEmpty")} />
      ) : (
        <ul className="divide-y divide-hairline">
          {(requests ?? []).map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-body font-medium text-ink">
                  {r.name}
                </p>
                <p className="text-caption text-ink-faint">
                  {[r.city, r.country].filter(Boolean).join(", ") ||
                    t("ops.requestNoPlace")}
                  {" · "}
                  <span suppressHydrationWarning>
                    {new Date(r.created_at).toLocaleDateString(locale, {
                      day: "numeric",
                      month: "short",
                      year: "2-digit",
                    })}
                  </span>
                </p>
                {r.note && (
                  <p className="mt-1 text-caption text-ink-soft">{r.note}</p>
                )}
              </div>
              <Button
                size="sm"
                disabled={approveRequest.isPending}
                onClick={() =>
                  approveRequest.mutate(r.id, {
                    onSuccess: () => toast.success(t("ops.requestApproved")),
                    onError: fail("approveClubRequest"),
                  })
                }
              >
                {t("club.approve")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={rejectRequest.isPending}
                onClick={() =>
                  rejectRequest.mutate(r.id, {
                    onError: fail("rejectClubRequest"),
                  })
                }
              >
                {t("club.reject")}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
