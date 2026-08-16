import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { getRouteApi } from "@tanstack/react-router";
import { toast } from "react-toastify";
import { useGetChallenges, useManageChallenges } from "@/hooks/useChallenges";
import { useAddGame } from "@/hooks/useAddGame";
import { useGetPlayers } from "@/hooks/useGetPlayers";
import PageTitle from "@/components/PageTitle";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { Segmented } from "@/components/ui/Segmented";
import { DisciplineBall } from "@/components/ui/Ball";
import { DISCIPLINES, type Discipline, type Game } from "@/types";
import { useT } from "@/i18n";

const route = getRouteApi("/app/_authed/$clubSlug/games/new");

const SIDES = [1, 2] as const;

export default function AddGamePage() {
  const { t } = useT();
  const { register, handleSubmit, reset, control, setValue } = useForm<Game>({
    // 9-ball is what the club plays, and what every game recorded
    // before the column existed was backfilled to.
    defaultValues: { mode: "single", discipline: "9ball" },
  });

  const { data: players, isLoading: playersLoading } = useGetPlayers();
  const { mutate: handleAddGame, isPending } = useAddGame();

  // Arriving from an accepted challenge: prefill the two names and close the
  // challenge once the result lands, so the loop ends where it started.
  const { challenge: challengeId } = route.useSearch();
  const { data: challenges } = useGetChallenges();
  const { respondToChallenge } = useManageChallenges();
  const challenge = challenges?.find((c) => c.id === challengeId) ?? null;

  useEffect(() => {
    if (!challenge) return;
    setValue("player_1_id", challenge.from_player_id);
    setValue("player_2_id", challenge.to_player_id);
  }, [challenge, setValue]);

  // `useWatch`, not `watch()`: the hook form is memoizable, so React Compiler
  // doesn't bail out of optimising this whole component.
  const {
    player_1_id,
    player_2_id,
    player_1b_id,
    player_2b_id,
    player_1_score,
    player_2_score,
    mode,
    discipline,
  } = useWatch({ control });

  const isDoubles = mode === "doubles";
  const selectedPlayers = [
    player_1_id,
    player_2_id,
    ...(isDoubles ? [player_1b_id, player_2b_id] : []),
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

  const playersComplete =
    !!player_1_id &&
    !!player_2_id &&
    (!isDoubles || (!!player_1b_id && !!player_2b_id));

  const addDisabled =
    playersLoading ||
    isPending ||
    !playersComplete ||
    !bothScoresIn ||
    !!problem;

  const onSubmit = (game: Game) => {
    // The selects hold ids now rather than names, so there is nothing left to
    // resolve here — games stopped carrying player names when those moved to
    // people. See sql/people.sql.
    handleAddGame(
      {
        ...game,
        // An unpicked partner select submits "", which is not a bigint.
        player_1b_id: game.player_1b_id || null,
        player_2b_id: game.player_2b_id || null,
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
          reset({ discipline, mode: game.mode });
        },
        onError: () => toast.error(t("common.error")),
      },
    );
  };

  const playerOptions = players?.map((player) => (
    <option key={player.id} value={player.id}>
      {player.name}
    </option>
  ));

  const scoreInput = "h-14 text-center font-mono text-h1 font-semibold";

  return (
    <>
      <div className="mx-auto max-w-2xl space-y-4 px-3 py-4">
        <PageTitle title={t("games.add")} />
        <Card className="p-5">
          {/* One wrapping row: pushed to the card edges when both fit, centred
              once they wrap onto their own lines on narrow phones. */}
          <div className="mb-5 flex flex-wrap justify-center gap-3 sm:justify-between">
            <Segmented<Discipline>
              label={t("games.discipline")}
              value={discipline ?? "9ball"}
              onChange={(next) => setValue("discipline", next)}
              options={DISCIPLINES.map((d) => ({
                value: d,
                label: t(`discipline.${d}`),
                icon: <DisciplineBall discipline={d} />,
              }))}
            />

            <Segmented
              label={t("games.mode")}
              value={isDoubles ? "doubles" : "single"}
              onChange={(next) => {
                reset({ discipline, mode: next });
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
                    {/* valueAsNumber for the same reason the score input has
                        it: a <select> hands back a string, and these are
                        bigint columns the app compares with ===. */}
                    <Select
                      disabled={playersLoading}
                      {...register(`player_${n}_id`, {
                        required: true,
                        valueAsNumber: true,
                      })}
                    >
                      <option value="">{t("common.select")}</option>
                      {playerOptions}
                    </Select>
                    {isDoubles && (
                      <Select
                        disabled={playersLoading}
                        {...register(`player_${n}b_id`, {
                          required: true,
                          valueAsNumber: true,
                        })}
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
      </div>
    </>
  );
}
