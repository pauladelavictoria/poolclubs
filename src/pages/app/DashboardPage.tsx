import ActivityFeed from "@/components/social/ActivityFeed";
import TonightPanel from "@/components/live/TonightPanel";
import { useTournaments } from "@/hooks/useTournaments";
import { TournamentOpenCard } from "@/components/tournaments/TournamentFeedCard";
import { Card } from "@/components/ui/Card";
import { useT } from "@/i18n";

export default function DashboardPage() {
  const { t } = useT();
  // Same key the feed below reads, so listing the open ones costs no request.
  const { data: tournaments } = useTournaments();
  const open = (tournaments ?? []).filter((x) => x.status === "open");

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-3 py-4">
      {/* What you can enter, then what everyone else has been doing. Your own
          standing and your challenges used to sit above this; they live on your
          profile and the challenges page, which the drawer's "Me" leads to. */}

      {/* What is on the tables right now. Renders nothing when nothing is, so
              the page is unchanged on a quiet afternoon. */}
      <TonightPanel />

      {/* An invitation, not a record: the accent is here because this is the
          one block on the page asking for something back. */}
      {open.length > 0 && (
        <section className="space-y-3">
          <h2 className="px-1 text-h4 font-semibold text-ink">
            {t("tournaments.openHeading")}
          </h2>
          {open.map((tournament) => (
            <Card
              key={tournament.id}
              className="border-l-2 border-l-strike bg-felt-raised px-4 py-3"
            >
              <TournamentOpenCard tournament={tournament} />
            </Card>
          ))}
        </section>
      )}

      {/* Matches, drills and finished tournaments in one stream — what the club
          did, in the order it happened, each row open to reactions and
          comments. Carries its own heading, because the filter sits on that
          line. */}
      <ActivityFeed />
    </div>
  );
}
