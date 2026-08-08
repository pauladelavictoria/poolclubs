import { useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "@/hooks/useAuth";
import { useGetPlayers } from "@/hooks/useGetPlayers";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";

export default function PlayerSelectModal() {
  const { user, player, isLoading, isPlayerLoading, linkPlayer } = useAuth();
  const { data: players, isLoading: playersLoading } = useGetPlayers();
  const [selectedId, setSelectedId] = useState<string>("");
  const [isLinking, setIsLinking] = useState(false);

  if (!user || isLoading || isPlayerLoading || player) return null;

  const handleLink = async () => {
    if (!selectedId) return;
    setIsLinking(true);
    try {
      await linkPlayer(Number(selectedId));
      toast.success("Perfil vinculado correctamente");
    } catch {
      toast.error(
        "Error al vincular el perfil. ¿Ya está vinculado a otra cuenta?"
      );
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="link-player-title"
        className="w-full max-w-md rounded-t-sheet border border-hairline bg-felt p-5 sm:rounded-sheet"
      >
        <h2
          id="link-player-title"
          className="text-h3 font-semibold text-ink"
        >
          ¿Quién eres?
        </h2>
        <p className="mt-1 max-w-[42ch] text-body text-ink-soft">
          Vincula tu cuenta a un jugador del club para ver tu perfil y tu plan
          de entrenamiento.
        </p>

        <div className="mt-5 space-y-1.5">
          <Label htmlFor="link-player">Jugador</Label>
          <Select
            id="link-player"
            disabled={playersLoading}
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            <option value="">Seleccionar jugador...</option>
            {players?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.category}ª)
              </option>
            ))}
          </Select>
        </div>

        <Button
          className="mt-5 w-full"
          onClick={handleLink}
          disabled={!selectedId || isLinking}
        >
          {isLinking ? "Vinculando..." : "Confirmar"}
        </Button>
      </div>
    </div>
  );
}
