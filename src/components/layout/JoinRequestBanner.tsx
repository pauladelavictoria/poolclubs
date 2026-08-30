import { LuUserPlus } from "react-icons/lu";
import { toast } from "react-toastify";
import { useAuth } from "@/hooks/useAuth";
import { useClubMembers, useManageClub } from "@/hooks/useClub";
import { dbErrorMessage } from "@/libs/algorithms/dbError";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useT } from "@/i18n";

/**
 * A join request used to be visible only to an admin who happened to open
 * Club settings — easy to miss for days. This sits above every page under the
 * club instead, so it's the first thing an admin sees, and it carries no
 * dismiss: it only goes away once each request is approved or rejected.
 */
export default function JoinRequestBanner() {
  const { t } = useT();
  const { isClubAdmin } = useAuth();
  const { data: members } = useClubMembers();
  const { approveMember, removeMember } = useManageClub();

  if (!isClubAdmin) return null;
  const pending = (members ?? []).filter((m) => m.status === "pending");
  if (pending.length === 0) return null;

  return (
    <Card className="mx-4 mt-4 overflow-hidden border-strike/40 bg-strike-tint md:mx-6">
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <LuUserPlus className="h-4 w-4 text-strike" aria-hidden />
            {t("club.pendingTitle")}
          </span>
        }
      />
      <ul className="divide-y divide-hairline">
        {pending.map((m) => (
          <li key={m.id} className="flex items-center gap-3 px-4 py-3">
            <span className="min-w-0 flex-1 truncate text-body text-ink">
              {m.name}
            </span>
            <Button
              size="sm"
              onClick={() =>
                approveMember.mutate(m.id, {
                  onError: (err) =>
                    toast.error(
                      t(
                        dbErrorMessage(err, "approveMember", {
                          denied: "common.deniedError",
                        }),
                      ),
                    ),
                })
              }
            >
              {t("club.approve")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                removeMember.mutate(m.id, {
                  onError: (err) =>
                    toast.error(
                      t(
                        dbErrorMessage(err, "removeMember", {
                          denied: "common.deniedError",
                        }),
                      ),
                    ),
                })
              }
            >
              {t("club.reject")}
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
