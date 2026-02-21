import { useState } from "react";
import Layout from "./Layout";
import { useGetPlayers } from "@/hooks/useGetPlayers";
import { useManagePlayers } from "@/hooks/useManagePlayers"; // You'll need to create this export in index or import directly
import { useAuth } from "@/hooks/useAuth";
import PlayerForm from "@/components/PlayerForm";
import { HiPlus, HiPencil, HiChevronLeft } from "react-icons/hi";
import type { Player, Category } from "@/types";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";

const CATEGORY_NAMES: Record<Category, string> = {
  1: "Primera",
  2: "Segunda",
  3: "Tercera",
};

export default function PlayersPage() {
  const { user } = useAuth();
  const { data: players, isLoading } = useGetPlayers();
  const { createPlayer, updatePlayer } = useManagePlayers();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  const handleCreate = async (values: { name: string; category: Category }) => {
    try {
      await createPlayer.mutateAsync(values);
      toast.success("Jugador creado correctamente");
      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Error al crear el jugador");
    }
  };

  const handleUpdate = async (values: { name: string; category: Category }) => {
    console.log(values);
    if (!editingPlayer) return;
    try {
      await updatePlayer.mutateAsync({ id: editingPlayer.id, ...values });
      toast.success("Jugador actualizado correctamente");
      setEditingPlayer(null);
      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Error al actualizar el jugador");
    }
  };

  const openCreateModal = () => {
    setEditingPlayer(null);
    setIsModalOpen(true);
  };

  const openEditModal = (player: Player) => {
    setEditingPlayer(player);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setEditingPlayer(null);
    setIsModalOpen(false);
  };

  return (
    <Layout>
      <div>
        <div className="bg-dark-card shadow-card overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-accent-red to-accent-red-dark p-4 text-white">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3 w-full">
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 text-white py-2 transition-colors"
                  aria-label="Inicio"
                >
                  <HiChevronLeft className="h-6 w-6" aria-hidden />
                </Link>
                <h1 className="text-2xl font-bold">Jugadores</h1>
              </div>
              {user && (
                <button
                  onClick={openCreateModal}
                  className="flex-shrink-0 bg-white hover:bg-gray-200 text-black font-medium py-2 px-4 rounded-xl transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap"
                >
                  <HiPlus className="h-5 w-5" />
                  <span>Añadir Jugador</span>
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {isLoading ? (
              <div className="py-8 flex justify-center">
                <div className="animate-spin rounded-xl h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-gray-300">
                  <thead>
                    <tr className="border-b border-dark-border text-sm text-gray-500 uppercase tracking-wide">
                      <th className="py-3 px-3">Jugador</th>
                      <th className="py-3 px-3">Categoría</th>
                      {user && (
                        <th className="py-3 px-3 text-right">Acciones</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {(players || []).map((player) => (
                      <tr
                        key={player.id}
                        className="border-b border-dark-border hover:bg-dark-card-hover transition-colors"
                      >
                        <td className="py-3 px-3 font-medium">
                          <Link
                            to={`/players/${player.id}`}
                            className="text-white hover:text-blue-400 hover:underline transition-colors"
                          >
                            {player.name}
                          </Link>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-medium border ${
                              player.category === 1
                                ? "bg-yellow-900/50 text-yellow-300 border-yellow-700/50"
                                : player.category === 2
                                  ? "bg-gray-700/50 text-gray-300 border-gray-600/50"
                                  : "bg-orange-900/50 text-orange-300 border-orange-700/50"
                            }`}
                          >
                            {CATEGORY_NAMES[player.category]}
                          </span>
                        </td>
                        {user && (
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openEditModal(player)}
                                className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-900/20 rounded-md transition-colors"
                                title="Editar"
                              >
                                <HiPencil className="h-5 w-5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                    {(!players || players.length === 0) && (
                      <tr>
                        <td
                          colSpan={user ? 3 : 2}
                          className="py-8 text-center text-gray-400"
                        >
                          No hay jugadores registrados yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity z-0"
              aria-hidden="true"
              onClick={closeModal}
            >
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span
              className="hidden sm:inline-block sm:h-screen sm:align-middle"
              aria-hidden="true"
            >
              &#8203;
            </span>

            <div className="inline-block transform overflow-hidden rounded-lg bg-dark-card border border-dark-border text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle z-[51] relative">
              <div className="bg-dark-card px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-medium leading-6 text-white mb-4">
                  {editingPlayer ? "Editar Jugador" : "Añadir Jugador"}
                </h3>
                <PlayerForm
                  initialValues={
                    editingPlayer
                      ? {
                          name: editingPlayer.name,
                          category: editingPlayer.category,
                        }
                      : undefined
                  }
                  onSubmit={editingPlayer ? handleUpdate : handleCreate}
                  onCancel={closeModal}
                  isSubmitting={
                    createPlayer.isPending || updatePlayer.isPending
                  }
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
