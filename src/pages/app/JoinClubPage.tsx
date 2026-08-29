import { useState } from "react";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { toast } from "react-toastify";
import { useSession } from "@/hooks/useAuth";
import { useClubPreview, useJoinOrCreateClub } from "@/hooks/useClub";
import PageTitle from "@/components/layout/PageTitle";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useT } from "@/i18n";

const route = getRouteApi("/app/join/$slug");

/**
 * The invite link. Signed out, the route bounces through login and comes back
 * here via the ?next= round-trip.
 *
 * The claim list is the whole point: a club that predates accounts is full of
 * player rows with nobody attached, and the person arriving is usually one of
 * them. Picking yourself keeps your history instead of starting a duplicate.
 */
export default function JoinClubPage() {
  const { t } = useT();
  const navigate = useNavigate();
  const { slug } = route.useParams();
  // useSession rather than useAuth: this runs before there is a club.
  const { user, memberships } = useSession();
  const {
    data: preview,
    isLoading: previewLoading,
    isError,
  } = useClubPreview(slug);
  const { joinClub } = useJoinOrCreateClub();

  const [claimId, setClaimId] = useState("");
  // Left empty the RPC uses the OAuth full_name, so no state to sync with auth.
  //
  // No clash check here any more. Names had to be unique inside a club while
  // games resolved players by name; games use ids and names live on people, so
  // a second Juan García is simply a second person.
  const [name, setName] = useState("");

  // Signed in by the time this renders — the route's beforeLoad saw to it.
  const already = memberships.find((m) => m.club_id === preview?.clubId);

  const submit = () => {
    joinClub.mutate(
      {
        slug,
        claimPlayerId: claimId ? Number(claimId) : undefined,
        displayName: claimId ? undefined : name,
      },
      {
        // joinClub navigates once the session has been re-read; a pending
        // membership has no club to address yet, so that lands on /app.
        onSuccess: () => toast.success(t("club.requestSent")),
        onError: () => toast.error(t("club.joinError")),
      },
    );
  };

  return (
    <>
      <div className="mx-auto max-w-xl space-y-4 px-3 py-6">
        <PageTitle title={t("club.joinTitle")} />
        {previewLoading ? (
          <Skeleton className="h-52 w-full rounded-card" />
        ) : isError || !preview ? (
          <Card>
            <EmptyState
              title={t("club.badCode")}
              hint={t("club.badCodeHint")}
              action={
                <Button
                  variant="secondary"
                  onClick={() => navigate({ to: "/app" })}
                >
                  {t("common.back")}
                </Button>
              }
            />
          </Card>
        ) : already ? (
          <Card>
            <EmptyState
              title={preview.clubName}
              hint={
                already.status === "active"
                  ? t("club.alreadyMember")
                  : t("club.awaitingHint")
              }
              action={
                <Button
                  variant="secondary"
                  onClick={() => navigate({ to: "/app" })}
                >
                  {t("common.back")}
                </Button>
              }
            />
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <CardHeader title={preview.clubName} />
            <div className="space-y-4 p-5">
              <p className="text-body text-ink-soft">{t("club.joinIntro")}</p>

              {preview.unclaimed.length > 0 && (
                <div className="space-y-1.5">
                  <Label htmlFor="claim">{t("club.claimLabel")}</Label>
                  <Select
                    id="claim"
                    value={claimId}
                    onChange={(e) => setClaimId(e.target.value)}
                  >
                    <option value="">{t("club.claimNew")}</option>
                    {preview.unclaimed.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                  <p className="text-caption text-ink-faint">
                    {t("club.claimHint")}
                  </p>
                </div>
              )}

              {!claimId && (
                <div className="space-y-1.5">
                  <Label htmlFor="name">{t("club.nameLabel")}</Label>
                  <Input
                    id="name"
                    value={name}
                    maxLength={60}
                    placeholder={user?.fullName ?? ""}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <p className="text-caption text-ink-faint">
                    {t("club.nameHint")}
                  </p>
                </div>
              )}

              <Button
                className="w-full"
                onClick={submit}
                disabled={joinClub.isPending}
              >
                {joinClub.isPending
                  ? t("common.saving")
                  : t("club.requestJoin")}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
