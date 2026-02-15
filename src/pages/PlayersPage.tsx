import { useState } from "react";
import Layout from "./Layout";
import { useGetPlayers } from "@/hooks/useGetPlayers";
import { useManagePlayers } from "@/hooks/useManagePlayers"; // You'll need to create this export in index or import directly
import PlayerForm from "@/components/PlayerForm";
import { HiPlus, HiPencil, HiTrash, HiChevronLeft } from "react-icons/hi";
import type { Player, Category } from "@/types";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";

// Helper to display category names
const CATEGORY_NAMES: Record<Category, string> = {
  1: "Primera",
  2: "Segunda",
  3: "Tercera",
};

export default function PlayersPage() {
  const { data: players, isLoading } = useGetPlayers();
  const { createPlayer, updatePlayer, deletePlayer } = useManagePlayers();

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

  const handleDelete = async (player: Player) => {
    if (
      !window.confirm(`¿Estás seguro de que quieres eliminar a ${player.name}?`)
    ) {
      return;
    }
    try {
      await deletePlayer.mutateAsync(player.id);
      toast.success("Jugador eliminado correctamente");
    } catch (error) {
      console.error(error);
      toast.error("Error al eliminar el jugador");
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
        <div className="bg-white overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-gray-700 to-gray-800 p-4 text-white">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3 w-full">
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 text-white py-2 transition-colors"
                  aria-label="Inicio"
                >
                  <HiChevronLeft className="h-6 w-6" aria-hidden />
                </Link>
                <h1 className="text-2xl font-bold">Gestión de Jugadores</h1>
              </div>
              <button
                onClick={openCreateModal}
                className="flex-shrink-0 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap"
              >
                <HiPlus className="h-5 w-5" />
                <span>Añadir Jugador</span>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {isLoading ? (
              <div className="py-8 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-gray-700">
                  <thead>
                    <tr className="border-b border-gray-200 text-sm text-gray-500 uppercase tracking-wide">
                      <th className="py-3 px-3">Jugador</th>
                      <th className="py-3 px-3">Categoría</th>
                      <th className="py-3 px-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(players || []).map((player) => (
                      <tr
                        key={player.id}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-3 px-3 font-medium">{player.name}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              player.category === 1
                                ? "bg-yellow-100 text-yellow-800"
                                : player.category === 2
                                  ? "bg-gray-100 text-gray-800"
                                  : "bg-orange-100 text-orange-800"
                            }`}
                          >
                            {CATEGORY_NAMES[player.category]}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditModal(player)}
                              className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                              title="Editar"
                            >
                              <HiPencil className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(player)}
                              className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                              title="Eliminar"
                            >
                              <HiTrash className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {(!players || players.length === 0) && (
                      <tr>
                        <td
                          colSpan={3}
                          className="py-8 text-center text-gray-500"
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

            <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle z-1 relative">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
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
