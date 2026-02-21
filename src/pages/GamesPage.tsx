import { useState } from "react";
import { useGetGames } from "@/hooks/useGetGames";
import Layout from "./Layout";
import { useGetPlayers } from "@/hooks/useGetPlayers";
import { Link } from "react-router-dom";
import { HiChevronLeft, HiPlus } from "react-icons/hi";
import type { Category } from "@/types";
import GamesList from "@/components/GamesList";

const FILTER_ALL = "";
const PAGE_SIZE = 50;

const CATEGORY_NAMES: Record<Category, string> = {
  1: "Primera",
  2: "Segunda",
  3: "Tercera",
};

export default function GamesPage() {
  const [playerFilter, setPlayerFilter] = useState<string>(FILTER_ALL);
  const [categoryFilter, setCategoryFilter] = useState<string>(FILTER_ALL);
  const [page, setPage] = useState(1);
  const { data: gamesData, isLoading: gamesLoading } = useGetGames({
    page,
    pageSize: PAGE_SIZE,
    playerName: playerFilter,
    category: categoryFilter ? Number(categoryFilter) : undefined,
  });
  const games = gamesData?.games ?? [];
  const totalCount = gamesData?.totalCount ?? 0;
  const { data: players } = useGetPlayers();

  const hasNextPage = page * PAGE_SIZE < totalCount;
  const hasPrevPage = page > 1;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  const handlePrevPage = () => {
    setPage((p) => Math.max(1, p - 1));
  };

  const handleNextPage = () => {
    setPage((p) => p + 1);
  };

  return (
    <Layout>
      <div>
        <div className="bg-dark-card shadow-card overflow-hidden">
          <div className="bg-gradient-to-r from-accent-red to-accent-red-dark p-4 text-white">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="w-full flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Link
                    to="/"
                    className="inline-flex items-center gap-2 text-white py-2 transition-colors hover:opacity-80"
                    aria-label="Inicio"
                  >
                    <HiChevronLeft className="h-6 w-6" aria-hidden />
                  </Link>
                  <h1 className="text-2xl font-bold">Partidos</h1>
                </div>
                <Link
                  to="/añadir-partido"
                  className="bg-white hover:bg-gray-100 text-gray-800 font-medium py-2 px-4 rounded-xl transition-all duration-200 flex items-center"
                >
                  <HiPlus className="h-6 w-6" aria-hidden />
                  Añadir partido
                </Link>
              </div>
            </div>
          </div>
          {/* List of items */}
          <div className="px-6 py-5">
            <div className="flex justify-end gap-2 mb-4">
              <label className="flex items-center gap-2">
                <select
                  value={playerFilter}
                  onChange={(e) => {
                    setPlayerFilter(e.target.value);
                    setPage(1);
                  }}
                  className="border border-dark-border px-3 py-2 rounded-2xl focus:ring-2 focus:ring-accent-red focus:border-accent-red bg-dark-bg text-white min-w-[140px]"
                  aria-label="Filtrar partidos por jugador"
                >
                  <option value={FILTER_ALL}>Jugadores</option>
                  {players?.map((player) => (
                    <option key={player.id} value={player.name}>
                      {player.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-2">
                <select
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setPage(1);
                  }}
                  className="border border-dark-border px-3 py-2 rounded-2xl focus:ring-2 focus:ring-accent-red focus:border-accent-red bg-dark-bg text-white min-w-[140px]"
                  aria-label="Filtrar partidos por categoría"
                >
                  <option value={FILTER_ALL}>Categorías</option>
                  <option value="1">{CATEGORY_NAMES[1]}</option>
                  <option value="2">{CATEGORY_NAMES[2]}</option>
                  <option value="3">{CATEGORY_NAMES[3]}</option>
                </select>
              </label>
            </div>

            {gamesLoading ? (
              <div className="py-8 flex justify-center">
                <div className="animate-spin rounded-xl h-8 w-8 border-t-2 border-b-2 border-accent-red"></div>
              </div>
            ) : (
              <>
                <GamesList games={games} showDates />

                {totalCount > PAGE_SIZE && (
                  <div className="mt-6 flex items-center justify-center gap-4 border-t border-dark-border pt-4">
                    <button
                      type="button"
                      onClick={handlePrevPage}
                      disabled={!hasPrevPage}
                      className="rounded-2xl border border-dark-border bg-dark-bg px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-dark-card-hover disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-dark-bg"
                      aria-label="Página anterior"
                    >
                      Anterior
                    </button>
                    <span className="text-sm text-gray-400">
                      {page} / {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={handleNextPage}
                      disabled={!hasNextPage}
                      className="rounded-2xl border border-dark-border bg-dark-bg px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-dark-card-hover disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-dark-bg"
                      aria-label="Página siguiente"
                    >
                      Siguiente
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
