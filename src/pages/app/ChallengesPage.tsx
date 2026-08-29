import { useState } from "react";
import { toast } from "react-toastify";
import { LuSwords } from "react-icons/lu";
import ChallengeButton from "@/components/social/ChallengeButton";
import { Select } from "@/components/ui/Select";
import { Label } from "@/components/ui/Label";
import { useAuth } from "@/hooks/useAuth";
import { useChallenges, useManageChallenges } from "@/hooks/useChallenges";
import { usePlayers, usePlayerLookup } from "@/hooks/usePlayers";
import { useWhoIsHere } from "@/hooks/useNight";
import { useClubTables } from "@/hooks/useClubTables";
import { useLiveMatches, useManageLiveMatch } from "@/hooks/useLiveMatch";
import StartMatchForm from "@/components/live/StartMatchForm";
import { useDialog } from "@/hooks/useDialog";
import PageTitle from "@/components/layout/PageTitle";
import { Card, CardHeader } from "@/components/ui/Card";
import { dialogClasses } from "@/components/ui/cardStyles";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { buttonClasses } from "@/components/ui/buttonStyles";
import type { Challenge, Player } from "@/types";
import { useT } from "@/i18n";
import { AppLink, useAppNavigate } from "@/components/layout/AppLink";

/** Turns "You vs {name}" into the same sentence with just the name linked to
 *  that player's page. */
function withPlayerLink(text: string, name: string, playerId: number) {
  const idx = text.indexOf(name);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <AppLink
        to="/app/$clubSlug/players/$playerId"
        params={{ playerId: playerId }}
        className="text-ink hover:text-strike"
      >
        {name}
      </AppLink>
      {text.slice(idx + name.length)}
    </>
  );
}

/**
 * Open challenges only. Declined ones disappear and played ones become a row in
 * the games list — a challenge is a message, not a record.
 */
export default function ChallengesPage() {
  const { t } = useT();
  const { player } = useAuth();
  const { data: challenges, isLoading } = useChallenges();
  const { data: players } = usePlayers();
  const { respondToChallenge, cancelChallenge } = useManageChallenges();
  const [toPlayerId, setToPlayerId] = useState("");
  // Starting the match here rather than filing a result later is the whole
  // point of knowing who is in the room.
  const [startingWith, setStartingWith] = useState<Player | null>(null);
  const dialogRef = useDialog(startingWith !== null);
  const here = useWhoIsHere();
  const { data: tables } = useClubTables();
  const { data: live } = useLiveMatches();
  const { startMatch } = useManageLiveMatch();
  const appNavigate = useAppNavigate();

  const { nameOf } = usePlayerLookup();
  const onError = () => toast.error(t("common.error"));

  const open = (challenges ?? []).filter(
    (c) => c.status === "pending" || c.status === "accepted",
  );
  const incoming = open.filter(
    (c) => c.to_player_id === player?.id && c.status === "pending",
  );
  const hereIds = new Set(here.map((p) => p.id));
  const bothHere = (c: Challenge) =>
    hereIds.has(c.from_player_id) && hereIds.has(c.to_player_id);

  const accepted = open
    .filter(
      (c) =>
        c.status === "accepted" &&
        (c.to_player_id === player?.id || c.from_player_id === player?.id),
    )
    // The one you can act on right now goes first. Everything else in this list
    // is something to do later.
    .sort((a, b) => Number(bothHere(b)) - Number(bothHere(a)));

  // A table with a match on it is not free, and a busy club may have none.
  const busy = new Set((live ?? []).map((m) => m.table_id));
  const freeTables = (tables ?? []).filter((tbl) => !busy.has(tbl.id));

  const closeStart = () => setStartingWith(null);
  const outgoing = open.filter(
    (c) => c.from_player_id === player?.id && c.status === "pending",
  );

  const Row = ({
    c,
    children,
  }: {
    c: Challenge;
    children: React.ReactNode;
  }) => {
    const opponentId =
      c.from_player_id === player?.id ? c.to_player_id : c.from_player_id;
    const opponentName = nameOf(opponentId);
    const text =
      c.from_player_id === player?.id
        ? t("challenge.youVs", { name: opponentName })
        : t("challenge.vsYou", { name: opponentName });
    return (
      <li className="flex flex-wrap items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-body text-ink">
            {withPlayerLink(text, opponentName, opponentId)}
          </p>
          {c.message && (
            <p className="truncate text-caption text-ink-faint">{c.message}</p>
          )}
        </div>
        {children}
      </li>
    );
  };

  return (
    <>
      <div className="mx-auto max-w-5xl space-y-4 px-3 py-4">
        <PageTitle title={t("challenge.title")} />
        {/* Pick an opponent, then the same button used on their profile — it
            already refuses a duplicate open challenge. */}
        <Card className="p-4">
          <Label htmlFor="challenge-opponent">{t("challenge.new")}</Label>
          <p className="mt-0.5 text-caption text-ink-faint">
            {t("challenge.newHint")}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Select
              id="challenge-opponent"
              value={toPlayerId}
              onChange={(e) => setToPlayerId(e.target.value)}
              className="min-w-0 flex-1"
            >
              <option value="">{t("challenge.pick")}</option>
              {(players ?? [])
                .filter((p) => p.id !== player?.id)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </Select>
            {toPlayerId && (
              <ChallengeButton toPlayerId={Number(toPlayerId)} size="md" />
            )}
          </div>
        </Card>

        {isLoading ? (
          <Card className="p-3">
            <SkeletonRows rows={4} />
          </Card>
        ) : open.length === 0 ? (
          <Card>
            <EmptyState
              icon={<LuSwords className="h-5 w-5" />}
              title={t("challenge.emptyTitle")}
              hint={t("challenge.emptyHint")}
              action={
                <AppLink
                  to="/app/$clubSlug/club"
                  className={buttonClasses({ variant: "secondary" })}
                >
                  {t("club.membersTitle")}
                </AppLink>
              }
            />
          </Card>
        ) : (
          <>
            {incoming.length > 0 && (
              <Card className="overflow-hidden">
                <CardHeader title={t("challenge.incoming")} />
                <ul className="divide-y divide-hairline">
                  {incoming.map((c) => (
                    <Row key={c.id} c={c}>
                      <Button
                        size="sm"
                        onClick={() =>
                          respondToChallenge.mutate(
                            { id: c.id, status: "accepted" },
                            { onError },
                          )
                        }
                      >
                        {t("challenge.accept")}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          respondToChallenge.mutate(
                            { id: c.id, status: "declined" },
                            { onError },
                          )
                        }
                      >
                        {t("challenge.decline")}
                      </Button>
                    </Row>
                  ))}
                </ul>
              </Card>
            )}

            {accepted.length > 0 && (
              <Card className="overflow-hidden">
                <CardHeader title={t("challenge.accepted")} />
                <ul className="divide-y divide-hairline">
                  {accepted.map((c) => {
                    const opponentId =
                      c.from_player_id === player?.id
                        ? c.to_player_id
                        : c.from_player_id;
                    const opponent = (players ?? []).find(
                      (p) => p.id === opponentId,
                    );

                    return (
                      <Row key={c.id} c={c}>
                        {bothHere(c) && opponent && (
                          <>
                            <span className="flex items-center gap-1.5 text-caption text-strike">
                              <span className="live-dot h-1.5 w-1.5 rounded-full bg-strike" />
                              {t("challenge.bothHere")}
                            </span>
                            <Button
                              size="sm"
                              onClick={() => setStartingWith(opponent)}
                            >
                              {t("challenge.startMatch")}
                            </Button>
                          </>
                        )}
                        {/* Still the way in for "we already played it, filing it
                            now", which is most of them. */}
                        <AppLink
                          to="/app/$clubSlug/games/new"
                          search={{ challenge: c.id }}
                          className={buttonClasses({
                            size: "sm",
                            variant: bothHere(c) ? "ghost" : "primary",
                          })}
                        >
                          {t("challenge.recordResult")}
                        </AppLink>
                      </Row>
                    );
                  })}
                </ul>
              </Card>
            )}

            {outgoing.length > 0 && (
              <Card className="overflow-hidden">
                <CardHeader title={t("challenge.outgoing")} />
                <ul className="divide-y divide-hairline">
                  {outgoing.map((c) => (
                    <Row key={c.id} c={c}>
                      <span className="text-caption text-ink-faint">
                        {t("challenge.waiting")}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          cancelChallenge.mutate(c.id, { onError })
                        }
                      >
                        {t("challenge.cancel")}
                      </Button>
                    </Row>
                  ))}
                </ul>
              </Card>
            )}
          </>
        )}
      </div>

      <dialog
        ref={dialogRef}
        className={dialogClasses({ wide: true })}
        aria-label={t("live.start")}
        onClose={closeStart}
        onClick={(e) => {
          if (e.target === dialogRef.current) closeStart();
        }}
      >
        {startingWith && player && (
          <StartMatchForm
            me={player}
            opponents={[]}
            roster={players ?? []}
            lockedOpponent={startingWith}
            tables={freeTables}
            onSubmit={(values) => {
              const challenge = accepted.find(
                (c) =>
                  c.from_player_id === startingWith.id ||
                  c.to_player_id === startingWith.id,
              );
              startMatch.mutate(
                {
                  player1: values.player1,
                  player2: values.player2,
                  partner1: values.partner1,
                  partner2: values.partner2,
                  tableId: values.tableId,
                  discipline: values.discipline,
                  raceTo: values.raceTo,
                  // Finishing then closes the challenge in the same
                  // transaction — see finish_live_match.
                  challengeId: challenge?.id,
                },
                {
                  onSuccess: (row) => {
                    closeStart();
                    appNavigate("/app/$clubSlug/live/$liveId", {
                      liveId: row.id,
                    });
                  },
                  onError,
                },
              );
            }}
            onCancel={closeStart}
            isSubmitting={startMatch.isPending}
          />
        )}
      </dialog>
    </>
  );
}
