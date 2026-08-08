import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { useGetPlayers } from "@/hooks/useGetPlayers";
import { useAddDrillLog } from "@/hooks/useAddDrillLog";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { Drill } from "@/types";

interface DrillLogFormProps {
  drill: Drill;
  defaultPlayerId?: number;
  onSuccess?: (drillLogId: number) => void;
}

type FormData = {
  player_id: string;
  score: string;
  notes: string;
};

export default function DrillLogForm({
  drill,
  defaultPlayerId,
  onSuccess,
}: DrillLogFormProps) {
  const { data: players, isLoading: playersLoading } = useGetPlayers();
  const { mutate: addDrillLog, isPending } = useAddDrillLog();
  const { register, handleSubmit, reset } = useForm<FormData>({
    defaultValues: {
      player_id: defaultPlayerId ? String(defaultPlayerId) : "",
      score: "",
      notes: "",
    },
  });

  const onSubmit = (data: FormData) => {
    const playerId = Number(data.player_id);
    const score = Number(data.score);

    if (!playerId || isNaN(score)) return;

    addDrillLog(
      {
        drill_id: drill.id,
        player_id: playerId,
        score,
        max_score: drill.max_score,
        notes: data.notes || undefined,
      },
      {
        onSuccess: (result) => {
          toast.success("Resultado registrado");
          reset();
          onSuccess?.(result.id);
        },
        onError: () => {
          toast.error("Ha ocurrido un error");
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <Select
       
        disabled={playersLoading}
        {...register("player_id", { required: true })}
      >
        <option value="">Seleccionar jugador</option>
        {players?.map((player) => (
          <option key={player.id} value={player.id}>
            {player.name}
          </option>
        ))}
      </Select>

      <div className="flex gap-3">
        <Input
          type="number"
          min={0}
          max={drill.max_score}
          className="flex-1"
          placeholder={`Puntuación (máx. ${drill.max_score})`}
          {...register("score", { required: true })}
        />
      </div>

      <Input
        type="text"
       
        placeholder="Notas (opcional)"
        {...register("notes")}
      />

      <Button
        type="submit"
       
        disabled={isPending}
      >
        {isPending ? "Registrando..." : "Registrar resultado"}
      </Button>
    </form>
  );
}
