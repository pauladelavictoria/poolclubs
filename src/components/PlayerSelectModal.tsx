import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useGetPlayers } from "@/hooks/useGetPlayers";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { toast } from "react-toastify";

export default function PlayerSelectModal() {
  const { user, player, isLoading, isPlayerLoading, linkPlayer } = useAuth();
  const { data: players, isLoading: playersLoading } = useGetPlayers();
  const [selectedId, setSelectedId] = useState<string>("");
  const [isLinking, setIsLinking] = useState(false);

  // Don't show if: not logged in, still loading, or already linked
  if (!user || isLoading || isPlayerLoading || player) {
    return null;
  }

  const handleLink = async () => {
    if (!selectedId) return;
    setIsLinking(true);
    try {
      await linkPlayer(Number(selectedId));
      toast.success("Perfil vinculado correctamente");
    } catch {
      toast.error("Error al vincular el perfil. ¿Ya está vinculado a otra cuenta?");
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="w-full max-w-md mx-4 bg-dark-card rounded-3xl border border-dark-border shadow-card p-6">
        <h2 className="text-xl font-bold text-white mb-2">
          Selecciona tu perfil de jugador
        </h2>
        <p className="text-sm text-gray-400 mb-6">
          Para acceder a tu perfil y plan de entrenamiento, selecciona qué
          jugador eres.
        </p>

        <Select
          className="p-3 rounded-2xl mb-4"
          disabled={playersLoading}
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          <option value="">Seleccionar jugador...</option>
          {players?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} (Cat. {p.category})
            </option>
          ))}
        </Select>

        <Button
          className="w-full rounded-2xl shadow-md"
          onClick={handleLink}
          disabled={!selectedId || isLinking}
        >
          {isLinking ? "Vinculando..." : "Confirmar"}
        </Button>
      </div>
    </div>
  );
}
