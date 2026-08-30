import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { toast } from "react-toastify";
import { useChallenges, useManageChallenges } from "@/hooks/useChallenges";
import { useAddGame, useGame, useManageGames } from "@/hooks/useAddGame";
import { dbErrorMessage } from "@/libs/algorithms/dbError";
import { usePlayers } from "@/hooks/usePlayers";
import PageTitle from "@/components/layout/PageTitle";
import CancelLink from "@/components/layout/CancelLink";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { Segmented } from "@/components/ui/Segmented";
import ConfirmButton from "@/components/ui/ConfirmButton";
import { DisciplineBall } from "@/components/ui/Ball";
import { DISCIPLINES, type Discipline, type Game } from "@/types";
import { useT } from "@/i18n";

const SIDES = [1, 2] as const;

/** Today, in the reader's own timezone — an ISO date would give the server's
 *  or UTC's, which is the wrong day for whoever is west of it come evening. */
const todayLocal = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** The date input hands back "YYYY-MM-DD"; combined with a time of day rather
 *  than midnight, so today's games keep sorting exactly as they did before this
 *  field existed, and a backdated one still lands after whatever else was
 *  recorded that same evening.
 *
 *  `clock` is now for a new result and the result's own time for a correction:
 *  re-saving a game filed at 23:51 must not move it to whenever the fix was
 *  made, which on a club night is a different night. */
const toPlayedAt = (dateStr: string, clock = new Date()) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(
    y,
    m - 1,
    d,
    clock.getHours(),
    clock.getMinutes(),
    clock.getSeconds(),
  ).toISOString();
};

/** A stored timestamp back into what the date input reads, in the reader's own
 *  zone for the same reason `todayLocal` is. */
const toDateInput = (playedAt: string) => {
  const d = new Date(playedAt);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export default function AddGamePage() {
  const { t } = useT();
  const { register, handleSubmit, reset, control, setValue } = useForm<Game>({
    // 9-ball is what the club plays, and what every game recorded
    // before the column existed was backfilled to.
    defaultValues: {
      mode: "single",
      discipline: "9ball",
      played_at: todayLocal(),
    },
  });

  const { data: players, isLoading: playersLoading } = usePlayers();
  const { mutate: handleAddGame, isPending } = useAddGame();

  // One component, two routes: /games/new files a result, /games/$gameId/edit
  // corrects one. `strict: false` is how you read a parameter — and a search
  // key — that only one of the two has. Same shape as DrillEditorPage.
  const { clubSlug, gameId } = useParams({ strict: false });
  const { challenge: challengeId } = useSearch({ strict: false });
  const navigate = useNavigate();

  const { data: editing } = useGame(gameId);
  const { updateGame, deleteGame } = useManageGames();
  const isEdit = !!gameId;

  // Arriving from an accepted challenge: prefill the two names and close the
  // challenge once the result lands, so the loop ends where it started.
  const { data: challenges } = useChallenges();
  const { respondToChallenge } = useManageChallenges();
  const challenge = challenges?.find((c) => c.id === challengeId) ?? null;

  useEffect(() => {
    if (!challenge) return;
    setValue("player_1_id", challenge.from_player_id);
    setValue("player_2_id", challenge.to_player_id);
  }, [challenge, setValue]);

  // The row arrives after the first render — from the route's loader on a cold
  // link, from the cache on a tap from the tape — so the form is filled here
  // rather than in defaultValues.
  useEffect(() => {
    if (!editing) return;
    reset({ ...editing, played_at: toDateInput(editing.played_at) });
  }, [editing, reset]);

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
    played_at,
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
    updateGame.isPending ||
    !playersComplete ||
    !bothScoresIn ||
    !!problem;

  const toGamesList = () =>
    navigate({ to: "/app/$clubSlug/games", params: { clubSlug: clubSlug! } });

  const onError = (err: unknown) =>
    toast.error(
      t(dbErrorMessage(err, "addGame", { denied: "common.deniedError" })),
    );

  const onSubmit = (game: Game) => {
    // The selects hold ids now rather than names, so there is nothing left to
    // resolve here — games stopped carrying player names when those moved to
    // people. See sql/people.sql.
    const values = {
      ...game,
      played_at: toPlayedAt(
        game.played_at,
        editing ? new Date(editing.played_at) : undefined,
      ),
      // An unpicked partner select submits "", which is not a bigint.
      player_1b_id: game.player_1b_id || null,
      player_2b_id: game.player_2b_id || null,
    };

    if (isEdit && editing) {
      updateGame.mutate(
        { ...values, id: editing.id },
        {
          onSuccess: () => {
            toast.success(t("common.saved"));
            toGamesList();
          },
          onError,
        },
      );
      return;
    }

    handleAddGame(values, {
      onSuccess: (saved) => {
        toast.success(t("games.added"));
        if (challenge) {
          respondToChallenge.mutate({
            id: challenge.id,
            status: "played",
            gameId: saved.id,
          });
        }
        // The date carries over rather than snapping back to today: loading
        // a notebook of last season's results means entering many games
        // against the same handful of dates in one sitting.
        reset({ discipline, mode: game.mode, played_at: game.played_at });
      },
      onError,
    });
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
        <PageTitle title={isEdit ? t("games.edit") : t("games.add")} />
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
                reset({ discipline, mode: next, played_at });
              }}
              options={[
                { value: "single", label: t("games.single") },
                { value: "doubles", label: t("games.doubles") },
              ]}
            />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <fieldset className="space-y-1.5">
              <Label>{t("games.playedAt")}</Label>
              <Input
                type="date"
                max={todayLocal()}
                {...register("played_at", { required: true })}
              />
            </fieldset>

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

            {/* Leaving is a real outcome of this screen — a challenge you
                opened by mistake, a score you decided not to record — so it
                sits beside the commit, not only in the crumb above the title. */}
            <div className="flex gap-3">
              <CancelLink />
              <Button type="submit" className="flex-1" disabled={addDisabled}>
                {isPending || updateGame.isPending
                  ? t("common.saving")
                  : isEdit
                    ? t("common.save")
                    : t("games.add")}
              </Button>
            </div>

            {/* Unfiling a result is the other half of correcting one, and it
                belongs on the same screen rather than on the tape's row: by the
                time you are here you can see which game it is. Set apart from
                the commit above so it is not the button next to it. */}
            {isEdit && (
              <div className="border-t border-hairline pt-4">
                <ConfirmButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={deleteGame.isPending}
                  confirmLabel={t("games.deleteConfirm")}
                  onConfirm={() =>
                    deleteGame.mutate(gameId!, {
                      onSuccess: () => {
                        toast.success(t("games.deleted"));
                        toGamesList();
                      },
                      onError,
                    })
                  }
                >
                  {t("games.delete")}
                </ConfirmButton>
              </div>
            )}
          </form>
        </Card>
      </div>
    </>
  );
}
