import { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "@/hooks/useAuth";
import { useClubPreview, useJoinOrCreateClub } from "@/hooks/useClub";
import PageHeader from "@/components/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { loginLink } from "@/libs/nextPath";
import { useT } from "@/i18n";

/**
 * The invite link. Signed out, it bounces through login and comes back here via
 * the existing ?next= round-trip.
 *
 * The claim list is the whole point: a club that predates accounts is full of
 * player rows with nobody attached, and the person arriving is usually one of
 * them. Picking yourself keeps your history instead of starting a duplicate.
 */
export default function JoinClubPage() {
  const { t } = useT();
  const navigate = useNavigate();
  const { code } = useParams<{ code: string }>();
  const { user, isLoading, memberships } = useAuth();
  const {
    data: preview,
    isLoading: previewLoading,
    isError,
  } = useClubPreview(code);
  const { joinClub } = useJoinOrCreateClub();

  const [claimId, setClaimId] = useState("");
  // Names are unique inside a club because games resolve players by name, so a
  // second Juan Garcia has to arrive as something else.
  // Left empty the RPC uses the OAuth full_name, so no state to sync with auth.
  const [name, setName] = useState("");

  if (isLoading) {
    return (
      <div className="mx-auto max-w-xl space-y-3 px-3 py-6">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-40 w-full rounded-card" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={loginLink(`/join/${code}`)} replace />;
  }

  const already = memberships.find((m) => m.club_id === preview?.clubId);

  // Empty input means join_club() falls back to the OAuth name, so that is what
  // gets checked. Claiming an existing row skips the check entirely.
  const wanted = (
    name.trim() ||
    user?.user_metadata?.full_name ||
    "Player"
  ).toLowerCase();
  const nameTaken = !claimId && !!preview?.takenNames.has(wanted);

  const submit = () => {
    joinClub.mutate(
      {
        code: code!,
        claimPlayerId: claimId ? Number(claimId) : undefined,
        displayName: claimId ? undefined : name,
      },
      {
        onSuccess: () => {
          toast.success(t("club.requestSent"));
          navigate("/");
        },
        onError: (e) =>
          toast.error(
            t(
              (e as { code?: string })?.code === "23505"
                ? "club.nameTaken"
                : "club.joinError",
            ),
          ),
      },
    );
  };

  return (
    <>
      <PageHeader title={t("club.joinTitle")} />

      <div className="mx-auto max-w-xl px-3 py-6">
        {previewLoading ? (
          <Skeleton className="h-52 w-full rounded-card" />
        ) : isError || !preview ? (
          <Card>
            <EmptyState
              title={t("club.badCode")}
              hint={t("club.badCodeHint")}
              action={
                <Button variant="secondary" onClick={() => navigate("/")}>
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
                <Button variant="secondary" onClick={() => navigate("/")}>
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
                    placeholder={user.user_metadata?.full_name ?? ""}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <p
                    className={
                      nameTaken
                        ? "text-caption text-accent-red"
                        : "text-caption text-ink-faint"
                    }
                  >
                    {t(nameTaken ? "club.nameTaken" : "club.nameHint")}
                  </p>
                </div>
              )}

              <Button
                className="w-full"
                onClick={submit}
                disabled={joinClub.isPending || nameTaken}
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
