import { useForm } from "react-hook-form";
import { useGetGames } from "@/hooks/useGetGames";
import { useAddGame } from "@/hooks/useAddGame";
import { toast } from "react-toastify";
import Layout from "./Layout";
import type { Game } from "@/types";
import { useGetPlayers } from "@/hooks/useGetPlayers";
import { HiChevronLeft, HiPlus } from "react-icons/hi";
import { Link } from "react-router-dom";

export default function GamesPage() {
  const { register, handleSubmit, reset, watch } = useForm<Game>();
  const {
    data: gamesData,
    isLoading: gamesLoading,
    refetch: refetchGames,
  } = useGetGames({ pageSize: 10 });
  const { data: players, isLoading: playersLoading } = useGetPlayers();
  const { mutate: handleAddGame } = useAddGame();

  const [player_1_name, player_2_name, player_1_score, player_2_score] = watch([
    "player_1_name",
    "player_2_name",
    "player_1_score",
    "player_2_score",
  ]);

  const addDisabled =
    playersLoading ||
    !player_1_name ||
    !player_2_name ||
    player_1_score === "" ||
    player_2_score === "" ||
    player_1_name === player_2_name ||
    player_1_score === player_2_score;

  const onSubmit = (game: Game) => {
    const player_1_id = players?.find((p) => p.name === game.player_1_name)?.id;
    const player_2_id = players?.find((p) => p.name === game.player_2_name)?.id;
    if (typeof player_1_id === "number" && typeof player_2_id === "number") {
      const fullGame: Game = { ...game, player_1_id, player_2_id };
      handleAddGame(fullGame, {
        onSuccess: () => {
          toast.success("Partido añadido");
          reset();
          refetchGames();
        },
        onError: () => {
          toast.error("Ha ocurrido un error");
        },
      });
    }
  };

  return (
    <Layout>
      <div>
        <div className="bg-dark-card shadow-card overflow-hidden">
          <div className="bg-gradient-to-r from-accent-red to-accent-red-dark p-4 text-white">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 text-white py-2 transition-colors hover:opacity-80"
                  aria-label="Inicio"
                >
                  <HiChevronLeft className="h-6 w-6" aria-hidden />
                </Link>
                <h1 className="text-2xl font-bold">Añadir nuevo partido</h1>
              </div>
            </div>
          </div>

          {/* Add form */}
          <div className="px-6 py-16 border-b border-dark-border bg-white">
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="flex flex-col xl:flex-row gap-2">
                <select
                  className="flex-1 border border-dark-border p-3 rounded-2xl focus:ring-2 focus:ring-accent-red focus:border-accent-red transition-colors"
                  disabled={playersLoading}
                  {...register("player_1_name", { required: true })}
                >
                  <option value="">Jugador 1</option>
                  {players?.map((player) => (
                    <option key={player.id} value={player.name}>
                      {player.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  className="flex-1 border border-dark-border p-3 rounded-2xl focus:ring-2 focus:ring-accent-red focus:border-accent-red transition-colors"
                  placeholder="Resultado jugador 1"
                  {...register("player_1_score", { required: true })}
                />
                <input
                  type="number"
                  min={0}
                  className="flex-1 border border-dark-border p-3 rounded-2xl focus:ring-2 focus:ring-accent-red focus:border-accent-red transition-colors"
                  placeholder="Resultado jugador 2"
                  {...register("player_2_score", { required: true })}
                />
                <select
                  className="flex-1 border border-dark-border p-3 rounded-2xl focus:ring-2 focus:ring-accent-red focus:border-accent-red transition-colors"
                  disabled={playersLoading}
                  {...register("player_2_name", { required: true })}
                >
                  <option value="">Jugador 2</option>
                  {players?.map((player) => (
                    <option key={player.id} value={player.name}>
                      {player.name}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className={`${
                    addDisabled
                      ? "bg-gray-600 cursor-not-allowed"
                      : "bg-accent-red hover:bg-accent-red-dark cursor-pointer"
                  } text-white px-5 py-3 rounded-2xl transition-colors shadow-md flex items-center gap-2`}
                  disabled={addDisabled}
                >
                  <HiPlus className="h-6 w-6" aria-hidden />
                  Añadir
                </button>
              </div>
            </form>
          </div>

          {/* List of items */}
          {gamesData?.games && gamesData.games.length > 0 && (
            <div className="px-6 py-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <h2 className="text-lg text-center sm:text-left font-medium text-white">
                  Últimos partidos
                </h2>
              </div>

              {gamesLoading ? (
                <div className="py-8 flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent-red"></div>
                </div>
              ) : (
                <div className="space-y-3">
                  {gamesData.games.map(
                    ({
                      id,
                      player_1_name,
                      player_1_score,
                      player_2_score,
                      player_2_name,
                    }) => (
                      <div
                        key={id}
                        className="flex justify-between items-center p-4 bg-dark-bg hover:bg-dark-card-hover rounded-2xl border border-dark-border transition-colors group"
                      >
                        <div className="w-full flex items-center gap-1 text-gray-300">
                          <span
                            className={`flex-1 text-right ${
                              player_1_score > player_2_score
                                ? "font-bold text-white"
                                : ""
                            }`}
                          >
                            {player_1_name}
                          </span>
                          <span>{player_1_score}</span>-
                          <span>{player_2_score}</span>
                          <span
                            className={`flex-1 ${
                              player_2_score > player_1_score
                                ? "font-bold text-white"
                                : ""
                            }`}
                          >
                            {player_2_name}
                          </span>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
