import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { LuSwords } from "react-icons/lu";
import ChallengeButton from "@/components/ChallengeButton";
import { Select } from "@/components/ui/Select";
import { Label } from "@/components/ui/Label";
import { useAuth } from "@/hooks/useAuth";
import { useGetChallenges, useManageChallenges } from "@/hooks/useChallenges";
import { useGetPlayers, usePlayerLookup } from "@/hooks/useGetPlayers";
import PageHeader from "@/components/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { buttonClasses } from "@/components/ui/buttonStyles";
import type { Challenge } from "@/types";
import { useT } from "@/i18n";

/**
 * Open challenges only. Declined ones disappear and played ones become a row in
 * the games list — a challenge is a message, not a record.
 */
export default function ChallengesPage() {
  const { t } = useT();
  const { player } = useAuth();
  const { data: challenges, isLoading } = useGetChallenges();
  const { data: players } = useGetPlayers();
  const { respondToChallenge, cancelChallenge } = useManageChallenges();
  const [toPlayerId, setToPlayerId] = useState("");

  const { nameOf } = usePlayerLookup();
  const onError = () => toast.error(t("common.error"));

  const open = (challenges ?? []).filter(
    (c) => c.status === "pending" || c.status === "accepted",
  );
  const incoming = open.filter(
    (c) => c.to_player_id === player?.id && c.status === "pending",
  );
  const accepted = open.filter(
    (c) =>
      c.status === "accepted" &&
      (c.to_player_id === player?.id || c.from_player_id === player?.id),
  );
  const outgoing = open.filter(
    (c) => c.from_player_id === player?.id && c.status === "pending",
  );

  const Row = ({
    c,
    children,
  }: {
    c: Challenge;
    children: React.ReactNode;
  }) => (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-body text-ink">
          {c.from_player_id === player?.id
            ? t("challenge.youVs", { name: nameOf(c.to_player_id) })
            : t("challenge.vsYou", { name: nameOf(c.from_player_id) })}
        </p>
        {c.message && (
          <p className="truncate text-caption text-ink-faint">{c.message}</p>
        )}
      </div>
      {children}
    </li>
  );

  return (
    <>
      <PageHeader section="games" title={t("challenge.title")} />

      <div className="mx-auto max-w-5xl space-y-4 px-3 py-4">
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
                <Link
                  to="/app/club"
                  className={buttonClasses({ variant: "secondary" })}
                >
                  {t("club.membersTitle")}
                </Link>
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
                  {accepted.map((c) => (
                    <Row key={c.id} c={c}>
                      <Link
                        to={`/app/games/new?challenge=${c.id}`}
                        className={buttonClasses({ size: "sm" })}
                      >
                        {t("challenge.recordResult")}
                      </Link>
                    </Row>
                  ))}
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
    </>
  );
}
