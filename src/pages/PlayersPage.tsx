import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { LuPlus, LuPencil, LuUsers } from "react-icons/lu";
import PageHeader from "@/components/PageHeader";
import PlayerForm from "@/components/PlayerForm";
import { useGetPlayers } from "@/hooks/useGetPlayers";
import { useManagePlayers } from "@/hooks/useManagePlayers";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button, IconButton } from "@/components/ui/Button";
import { CATEGORY_LABEL } from "@/components/ui/Ball";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Player, Category } from "@/types";

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
      closeModal();
    } catch (error) {
      console.error(error);
      toast.error("Error al crear el jugador");
    }
  };

  const handleUpdate = async (values: { name: string; category: Category }) => {
    if (!editingPlayer) return;
    try {
      await updatePlayer.mutateAsync({ id: editingPlayer.id, ...values });
      toast.success("Jugador actualizado correctamente");
      closeModal();
    } catch (error) {
      console.error(error);
      toast.error("Error al actualizar el jugador");
    }
  };

  const closeModal = () => {
    setEditingPlayer(null);
    setIsModalOpen(false);
  };

  // A club thinks in divisions, so the roster is filed the same way. Grouping
  // also earns the badge back as a heading instead of repeating it per row.
  const byCategory = useMemo(() => {
    const groups: Record<Category, Player[]> = { 1: [], 2: [], 3: [] };
    for (const player of players ?? []) groups[player.category].push(player);
    return groups;
  }, [players]);

  const populated = ([1, 2, 3] as const).filter(
    (cat) => byCategory[cat].length > 0,
  );

  return (
    <>
      <PageHeader title="Jugadores">
        {user && (
          <Button
            size="sm"
            className="shrink-0"
            onClick={() => {
              setEditingPlayer(null);
              setIsModalOpen(true);
            }}
          >
            <LuPlus className="h-4 w-4" aria-hidden />
            Añadir jugador
          </Button>
        )}
      </PageHeader>

      <div className="mx-auto max-w-5xl space-y-4 px-3 py-4">
        {isLoading ? (
          <Card>
            <SkeletonRows rows={8} className="p-3" />
          </Card>
        ) : populated.length === 0 ? (
          <Card>
            <EmptyState
              icon={<LuUsers className="h-5 w-5" />}
              title="Aún no hay jugadores"
              hint="Añade el primero para empezar a registrar partidos."
            />
          </Card>
        ) : (
          populated.map((cat) => (
            <Card key={cat} className="overflow-hidden">
              <CardHeader
                title={CATEGORY_LABEL[cat]}
                action={
                  <span className="font-mono text-caption tabular-nums text-ink-faint">
                    {byCategory[cat].length}
                  </span>
                }
              />
              {/* Names are short; one column of them wastes most of a desktop
                  card, so they pair up once there's room. */}
              <ul className="p-2 sm:grid sm:grid-cols-2 sm:gap-x-2">
                {byCategory[cat].map((player) => (
                  <li
                    key={player.id}
                    className="flex items-center gap-3 rounded-control px-2 transition-colors duration-150 hover:bg-felt-raised"
                  >
                    <Link
                      to={`/players/${player.id}`}
                      className="min-w-0 flex-1 truncate py-2.5 font-medium text-ink"
                    >
                      {player.name}
                    </Link>
                    {user && (
                      <IconButton
                        label={`Editar ${player.name}`}
                        onClick={() => {
                          setEditingPlayer(player);
                          setIsModalOpen(true);
                        }}
                      >
                        <LuPencil className="h-[18px] w-[18px]" />
                      </IconButton>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
          <div className="absolute inset-0" aria-hidden onClick={closeModal} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={editingPlayer ? "Editar jugador" : "Añadir jugador"}
            className="relative w-full max-w-md rounded-t-sheet border border-hairline bg-felt p-5 sm:rounded-sheet"
          >
            <h2 className="mb-4 text-h3 font-semibold text-ink">
              {editingPlayer ? "Editar jugador" : "Añadir jugador"}
            </h2>
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
              isSubmitting={createPlayer.isPending || updatePlayer.isPending}
            />
          </div>
        </div>
      )}
    </>
  );
}
