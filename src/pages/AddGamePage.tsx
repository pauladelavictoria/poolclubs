import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useGetChallenges, useManageChallenges } from "@/hooks/useChallenges";
import { useGetGames } from "@/hooks/useGetGames";
import { useAddGame } from "@/hooks/useAddGame";
import { useGetPlayers } from "@/hooks/useGetPlayers";
import PageHeader from "@/components/PageHeader";
import GamesList from "@/components/GamesList";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { Segmented } from "@/components/ui/Segmented";
import { SkeletonRows } from "@/components/ui/Skeleton";
import type { Game } from "@/types";
import { useT } from "@/i18n";

const SIDES = [1, 2] as const;

export default function AddGamePage() {
  const { t } = useT();
  const { register, handleSubmit, reset, control, setValue } = useForm<Game>({
    defaultValues: { mode: "single" },
  });

  const {
    data: gamesData,
    isLoading: gamesLoading,
    refetch: refetchGames,
  } = useGetGames({ pageSize: 10 });
  const { data: players, isLoading: playersLoading } = useGetPlayers();
  const { mutate: handleAddGame, isPending } = useAddGame();

  // Arriving from an accepted challenge: prefill the two names and close the
  // challenge once the result lands, so the loop ends where it started.
  const [searchParams] = useSearchParams();
  const challengeId = Number(searchParams.get("challenge")) || null;
  const { data: challenges } = useGetChallenges();
  const { respondToChallenge } = useManageChallenges();
  const challenge = challenges?.find((c) => c.id === challengeId) ?? null;

  useEffect(() => {
    if (!challenge || !players) return;
    const name = (id: number) => players.find((p) => p.id === id)?.name;
    const from = name(challenge.from_player_id);
    const to = name(challenge.to_player_id);
    if (from) setValue("player_1_name", from);
    if (to) setValue("player_2_name", to);
  }, [challenge, players, setValue]);

  // `useWatch`, not `watch()`: the hook form is memoizable, so React Compiler
  // doesn't bail out of optimising this whole component.
  const {
    player_1_name,
    player_2_name,
    player_1b_name,
    player_2b_name,
    player_1_score,
    player_2_score,
    mode,
  } = useWatch({ control });

  const isDoubles = mode === "doubles";
  const selectedPlayers = [
    player_1_name,
    player_2_name,
    ...(isDoubles ? [player_1b_name, player_2b_name] : []),
  ].filter(Boolean);

  const hasDuplicatePlayers =
    new Set(selectedPlayers).size !== selectedPlayers.length;
  // Not a truthiness check: a legitimate 0-rack score is falsy, and testing it
  // that way would leave the button disabled on a whitewash. An empty numeric
  // field reads back as NaN, which is what this actually has to exclude.
  const bothScoresIn =
    Number.isFinite(player_1_score) && Number.isFinite(player_2_score);
  const isTie = bothScoresIn && player_1_score === player_2_score;

  const problem = hasDuplicatePlayers
    ? t("games.duplicatePlayer")
    : isTie
      ? t("games.tie")
      : null;

  const namesComplete =
    !!player_1_name &&
    !!player_2_name &&
    (!isDoubles || (!!player_1b_name && !!player_2b_name));

  const addDisabled =
    playersLoading || isPending || !namesComplete || !bothScoresIn || !!problem;

  const onSubmit = (game: Game) => {
    const byName = (name?: string | null) =>
      (name ? players?.find((p) => p.name === name)?.id : null) ?? null;

    const player_1_id = byName(game.player_1_name);
    const player_2_id = byName(game.player_2_name);

    if (typeof player_1_id !== "number" || typeof player_2_id !== "number") {
      toast.error(t("games.playersNotIdentified"));
      return;
    }

    handleAddGame(
      {
        ...game,
        player_1_id,
        player_2_id,
        player_1b_id: byName(game.player_1b_name),
        player_2b_id: byName(game.player_2b_name),
      },
      {
        onSuccess: (saved) => {
          toast.success(t("games.added"));
          if (challenge) {
            respondToChallenge.mutate({
              id: challenge.id,
              status: "played",
              gameId: saved.id,
            });
          }
          reset();
          refetchGames();
        },
        onError: () => toast.error(t("common.error")),
      },
    );
  };

  const playerOptions = players?.map((player) => (
    <option key={player.id} value={player.name}>
      {player.name}
    </option>
  ));

  const scoreInput = "h-14 text-center font-mono text-h1 font-semibold";

  return (
    <>
      <PageHeader title={t("games.add")} back="/app/games" />

      <div className="mx-auto max-w-xl space-y-4 px-3 py-4">
        <Card className="p-5">
          <div className="mb-5 flex justify-center">
            <Segmented
              label={t("games.mode")}
              value={isDoubles ? "doubles" : "single"}
              onChange={(next) => {
                reset();
                setValue("mode", next);
              }}
              options={[
                { value: "single", label: t("games.single") },
                { value: "doubles", label: t("games.doubles") },
              ]}
            />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              {SIDES.map((n) => {
                const side = isDoubles
                  ? t("games.pair", { n })
                  : t("games.player", { n });
                return (
                  <fieldset key={n} className="space-y-1.5">
                    <Label>{side}</Label>
                    <Select
                      disabled={playersLoading}
                      {...register(`player_${n}_name`, { required: true })}
                    >
                      <option value="">{t("common.select")}</option>
                      {playerOptions}
                    </Select>
                    {isDoubles && (
                      <Select
                        disabled={playersLoading}
                        {...register(`player_${n}b_name`, { required: true })}
                      >
                        <option value="">{t("games.partner")}</option>
                        {playerOptions}
                      </Select>
                    )}
                    <Input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      aria-label={t("games.racksFor", { side })}
                      placeholder="0"
                      className={scoreInput}
                      // The column is bigint, and an <input> hands back a
                      // string — without this the form would submit "5" for a
                      // field the types call a number.
                      {...register(`player_${n}_score`, {
                        required: true,
                        valueAsNumber: true,
                      })}
                    />
                  </fieldset>
                );
              })}
            </div>

            {problem && (
              <p role="alert" className="text-body text-strike">
                {problem}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={addDisabled}>
              {isPending ? t("common.saving") : t("games.add")}
            </Button>
          </form>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader title={t("games.recent")} />
          <div className="p-3">
            {gamesLoading ? (
              <SkeletonRows rows={4} />
            ) : (
              <GamesList games={gamesData?.games ?? []} />
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
