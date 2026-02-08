import { useForm } from "react-hook-form";
import { useGetGames } from "@/hooks/useGetGames";
import { useAddGame } from "@/hooks/useAddGame";
import { toast } from "react-toastify";
import Layout from "./Layout";
import type { Game } from "@/types";
import { useGetPlayers } from "@/hooks/useGetPlayers";
import { HiHome } from "react-icons/hi";
import { Link } from "react-router-dom";

export default function GamesPage() {
  const { register, handleSubmit, reset, watch } = useForm<Game>();
  const {
    data: gamesData,
    isLoading: gamesLoading,
    refetch: refetchGames,
  } = useGetGames({pageSize: 10});
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
      <div className="mx-auto px-1 py-1">
        <div className="bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4 text-white">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
              <Link
                    to="/"
                    className="inline-flex items-center gap-2 text-white py-2 transition-colors"
                    aria-label="Inicio"
                  >
                    <HiHome className="h-6 w-6" aria-hidden />
                  </Link>
                <h1 className="text-2xl font-bold">Añadir nuevo partido</h1>
              </div>
            </div>
          </div>

          {/* Add form */}
          <div className="px-6 py-10 border-b border-gray-200">
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="flex flex-col xl:flex-row gap-2">
                <select
                  className="flex-1 border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors bg-white"
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
                  className="flex-1 border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                  placeholder="Resultado jugador 1"
                  {...register("player_1_score", { required: true })}
                />
                <input
                  type="number"
                  min={0}
                  className="flex-1 border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                  placeholder="Resultado jugador 2"
                  {...register("player_2_score", { required: true })}
                />
                <select
                  className="flex-1 border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors bg-white"
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
                      ? "bg-gray-500 cursor-not-allowed"
                      : "bg-red-600 hover:bg-red-700 cursor-pointer"
                  } text-white px-5 py-3 rounded-lg transition-colors shadow-md flex items-center`}
                  disabled={addDisabled}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                  Añadir
                </button>
              </div>
            </form>
          </div>

          {/* List of items */}
          {gamesData?.games && gamesData.games.length > 0 && (
            <div className="px-6 py-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <h2 className="text-lg text-center sm:text-left font-medium text-gray-700">
                  Últimos partidos
                </h2>
              </div>

              {gamesLoading ? (
                <div className="py-8 flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
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
                        className="flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-100 transition-colors group"
                      >
                        <div className="w-full flex items-center gap-1 text-gray-700">
                          <span
                            className={`flex-1 text-right ${
                              player_1_score > player_2_score ? "font-bold" : ""
                            }`}
                          >
                            {player_1_name}
                          </span>
                          <span>{player_1_score}</span>-
                          <span>{player_2_score}</span>
                          <span
                            className={`flex-1 ${
                              player_2_score > player_1_score ? "font-bold" : ""
                            }`}
                          >
                            {player_2_name}
                          </span>
                        </div>
                      </div>
                    )
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
