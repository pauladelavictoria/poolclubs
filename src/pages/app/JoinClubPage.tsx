import { useEffect, useRef, useState } from "react";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { toast } from "react-toastify";
import { useSession } from "@/hooks/useAuth";
import { useClubPreview, useJoinClub } from "@/hooks/useClub";
import { dbErrorMessage } from "@/libs/algorithms/dbError";
import PageTitle from "@/components/layout/PageTitle";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Skeleton } from "@/components/ui/Skeleton";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { loginLink } from "@/libs/algorithms/nextPath";
import { EmptyState } from "@/components/ui/EmptyState";
import { useT } from "@/i18n";

const route = getRouteApi("/app/join/$slug");

/**
 * The invite link, in three states.
 *
 * Signed out it is a preview and a way in: the club's name, and a sign-up that
 * comes back to the club's own URL carrying ?join=1 — which is what the
 * confirmation mail links to, so the address in the mail is the club rather than
 * this page. $clubSlug bounces that back here with ?auto=1 and the request is
 * filed without another tap.
 *
 * Signed in, the claim list is the point: a club that predates accounts is full
 * of player rows with nobody attached, and the person arriving is usually one of
 * them. Picking yourself keeps your history instead of starting a duplicate.
 * Somebody signing up from the link does not get that choice — there is nobody
 * to show the list to before the account exists — so they join as new and an
 * admin can merge them.
 */
export default function JoinClubPage() {
  const { t } = useT();
  const navigate = useNavigate();
  const { slug } = route.useParams();
  const { auto } = route.useSearch();
  // useSession rather than useAuth: this runs before there is a club.
  const { user, memberships } = useSession();
  const {
    data: preview,
    isLoading: previewLoading,
    isError,
  } = useClubPreview(slug);
  const { joinClub } = useJoinClub();

  const [claimId, setClaimId] = useState("");
  // Left empty the RPC uses the OAuth full_name, so no state to sync with auth.
  //
  // No clash check here any more. Names had to be unique inside a club while
  // games resolved players by name; games use ids and names live on people, so
  // a second Juan García is simply a second person.
  const [name, setName] = useState("");

  const already = memberships.find((m) => m.club_id === preview?.clubId);

  const submit = () => {
    joinClub.mutate(
      {
        slug,
        claimPlayerId: claimId ? Number(claimId) : undefined,
        displayName: claimId ? undefined : name,
      },
      {
        // joinClub navigates to the club once the session has been re-read;
        // pending or not, that is where the answer is shown.
        onSuccess: () => toast.success(t("club.requestSent")),
        onError: (err) =>
          toast.error(
            t(
              dbErrorMessage(err, "joinClub", {
                denied: "common.deniedError",
                fallback: "club.joinError",
              }),
            ),
          ),
      },
    );
  };

  // ?auto=1 is the sign-up round trip coming back: the intent was expressed
  // before the account existed, so file it as soon as there is a session and a
  // club to file against. The ref, not `isPending`, is what stops a second run —
  // the mutation is not pending yet on the render that starts it. join_club is
  // idempotent anyway (sql/schema.sql); this keeps it from being asked twice.
  const fired = useRef(false);
  useEffect(() => {
    if (!auto || !user || !preview || already || fired.current) return;
    fired.current = true;
    submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, user, preview, already]);

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
        ) : !user ? (
          <Card className="overflow-hidden">
            <CardHeader title={preview.clubName} />
            <div className="space-y-4 p-5">
              <p className="text-body text-ink-soft">{t("club.joinSignIn")}</p>
              {/* A plain anchor, not a Link: signing in is a full page load
                  either way — the session lands in a cookie the router has
                  already read — and the ?next= has to survive the OAuth round
                  trip in the URL. */}
              <a
                href={loginLink(`/app/${slug}?join=1`)}
                className={buttonClasses({ className: "w-full" })}
              >
                {t("club.joinSignInCta")}
              </a>
            </div>
          </Card>
        ) : auto ? (
          <Skeleton className="h-52 w-full rounded-card" />
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
