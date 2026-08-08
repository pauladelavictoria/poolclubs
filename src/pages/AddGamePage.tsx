import { useForm, useWatch } from "react-hook-form";
import { toast } from "react-toastify";
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

const SIDES = [
  { n: 1, single: "Jugador 1", doubles: "Pareja 1" },
  { n: 2, single: "Jugador 2", doubles: "Pareja 2" },
] as const;

export default function AddGamePage() {
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
  const bothScoresIn = !!player_1_score && !!player_2_score;
  const isTie = bothScoresIn && player_1_score === player_2_score;

  const problem = hasDuplicatePlayers
    ? "Un jugador no puede estar en los dos lados."
    : isTie
      ? "Un partido no puede acabar en empate."
      : null;

  const namesComplete =
    !!player_1_name &&
    !!player_2_name &&
    (!isDoubles || (!!player_1b_name && !!player_2b_name));

  const addDisabled =
    playersLoading || isPending || !namesComplete || !bothScoresIn || !!problem;

  const onSubmit = (game: Game) => {
    const byName = (name?: string) =>
      name ? players?.find((p) => p.name === name)?.id : undefined;

    const player_1_id = byName(game.player_1_name);
    const player_2_id = byName(game.player_2_name);

    if (typeof player_1_id !== "number" || typeof player_2_id !== "number") {
      toast.error("No se han podido identificar los jugadores");
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
        onSuccess: () => {
          toast.success("Partido añadido");
          reset();
          refetchGames();
        },
        onError: () => toast.error("Ha ocurrido un error"),
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
      <PageHeader title="Añadir partido" back="/games" />

      <div className="mx-auto max-w-xl space-y-4 px-3 py-4">
        <Card className="p-5">
          <div className="mb-5 flex justify-center">
            <Segmented
              label="Modalidad"
              value={isDoubles ? "doubles" : "single"}
              onChange={(next) => {
                reset();
                setValue("mode", next);
              }}
              options={[
                { value: "single", label: "Individual" },
                { value: "doubles", label: "Parejas" },
              ]}
            />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              {SIDES.map(({ n, single, doubles }) => (
                <fieldset key={n} className="space-y-1.5">
                  <Label>{isDoubles ? doubles : single}</Label>
                  <Select
                    disabled={playersLoading}
                    {...register(`player_${n}_name`, { required: true })}
                  >
                    <option value="">Seleccionar</option>
                    {playerOptions}
                  </Select>
                  {isDoubles && (
                    <Select
                      disabled={playersLoading}
                      {...register(`player_${n}b_name`, { required: true })}
                    >
                      <option value="">Compañero</option>
                      {playerOptions}
                    </Select>
                  )}
                  <Input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    aria-label={`Mesas ${isDoubles ? doubles : single}`}
                    placeholder="0"
                    className={scoreInput}
                    {...register(`player_${n}_score`, { required: true })}
                  />
                </fieldset>
              ))}
            </div>

            {problem && (
              <p role="alert" className="text-body text-strike">
                {problem}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={addDisabled}>
              {isPending ? "Guardando..." : "Añadir partido"}
            </Button>
          </form>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader title="Últimos partidos" />
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
