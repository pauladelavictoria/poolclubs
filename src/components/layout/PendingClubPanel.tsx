import { LuUsers, LuUserX } from "react-icons/lu";
import { Link } from "@tanstack/react-router";
import { toast } from "react-toastify";
import PageTitle from "@/components/layout/PageTitle";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { useSession } from "@/hooks/useAuth";
import { useJoinClub } from "@/hooks/useClub";
import { dbErrorMessage } from "@/libs/algorithms/dbError";
import { useT } from "@/i18n";
import type { Club, PlayerStatus } from "@/types";

/**
 * The whole club, for somebody who is not a member of it yet.
 *
 * It replaces the chrome rather than sitting inside it: approved membership is
 * what every club-scoped query waits on, so the alternative is a nav full of
 * pages that are all empty states. Rendered in place at the club's own URL so
 * the URL survives — approve the member in another window and the page they
 * wanted is one refresh away.
 *
 * Two states, and the second is why rejecting a request updates the row instead
 * of deleting it: a deleted row reads as never having asked, so the club
 * answered 404 and the person had no way to know what happened or what to do
 * about it. Now they are told, offered the club's own contact details, and can
 * ask once more — join_club turns a rejected row back into a pending one.
 */
export default function PendingClubPanel({
  club,
  status,
}: {
  club: Club | null;
  status: PlayerStatus;
}) {
  const { t } = useT();
  // Somewhere to go back *to*. Without an approved membership there isn't one:
  // /app's signpost would read the same row this panel is about and send them
  // straight back here, so the button would be a loop with a label.
  const { memberships } = useSession();
  const canLeave = memberships.some((m) => m.status === "active");
  const { joinClub } = useJoinClub();

  const clubName = club?.name ?? "";
  const rejected = status === "rejected";

  const askAgain = () =>
    joinClub.mutate(
      { slug: club!.slug },
      {
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

  return (
    <div className="mx-auto max-w-xl px-3 py-10">
      <PageTitle title={clubName} />
      <Card>
        <EmptyState
          icon={
            rejected ? (
              <LuUserX className="h-5 w-5" aria-hidden />
            ) : (
              <LuUsers className="h-5 w-5" aria-hidden />
            )
          }
          title={t(rejected ? "club.rejectedTitle" : "club.awaitingTitle", {
            club: clubName,
          })}
          hint={t(rejected ? "club.rejectedHint" : "club.awaitingHint")}
          action={
            rejected ? (
              <Button onClick={askAgain} disabled={joinClub.isPending}>
                {joinClub.isPending
                  ? t("common.saving")
                  : t("club.rejectedRetry")}
              </Button>
            ) : canLeave ? (
              <Link
                to="/app"
                className={buttonClasses({ variant: "secondary" })}
              >
                {t("common.back")}
              </Link>
            ) : undefined
          }
        />

        {/* Only worth a section when the club actually left a way to be
            reached — the alternative is a heading over nothing, telling
            somebody to get in touch and not saying how. */}
        {rejected && (club?.phone || club?.contact_email) && (
          <div className="border-t border-hairline px-6 py-5 text-center">
            <p className="text-caption text-ink-faint">
              {t("club.rejectedContact")}
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
              {club.phone && (
                <a
                  href={`tel:${club.phone}`}
                  className="text-body text-strike underline underline-offset-2"
                >
                  {club.phone}
                </a>
              )}
              {club.contact_email && (
                <a
                  href={`mailto:${club.contact_email}`}
                  className="text-body text-strike underline underline-offset-2"
                >
                  {club.contact_email}
                </a>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
