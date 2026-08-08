import { useForm } from "react-hook-form";
import { Link, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "@/hooks/useAuth";
import { useAddDrillLog } from "@/hooks/useAddDrillLog";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { loginLink } from "@/libs/nextPath";
import type { Drill } from "@/types";

interface DrillLogFormProps {
  drill: Drill;
  onSuccess?: (drillLogId: number) => void;
}

type FormData = {
  score: string;
  notes: string;
};

export default function DrillLogForm({ drill, onSuccess }: DrillLogFormProps) {
  const { user, player, isPlayerLoading } = useAuth();
  const location = useLocation();
  const { mutate: addDrillLog, isPending } = useAddDrillLog();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: { score: "", notes: "" },
  });

  const onSubmit = (data: FormData) => {
    const score = Number(data.score);

    // The field rules below catch this first; this is the last gate before the
    // row is written, so it does not rely on them.
    if (!player || isNaN(score) || score < 0 || score > drill.max_score) return;

    addDrillLog(
      {
        drill_id: drill.id,
        player_id: player.id,
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

  if (!user) {
    return (
      <div className="space-y-3">
        <p className="text-body text-ink-soft">
          Inicia sesión para registrar tus resultados.
        </p>
        <Link
          to={loginLink(location.pathname + location.search)}
          className={buttonClasses({ variant: "primary" })}
        >
          Iniciar sesión
        </Link>
      </div>
    );
  }

  if (!player) {
    return (
      <p className="text-body text-ink-soft">
        {isPlayerLoading
          ? "Cargando tu jugador..."
          : "Vincula tu cuenta con un jugador para registrar resultados."}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <p className="text-caption text-ink-faint">
        Registrando como{" "}
        <span className="font-medium text-ink">{player.name}</span>
      </p>

      <div className="flex flex-col gap-1.5">
        <Input
          type="number"
          min={0}
          max={drill.max_score}
          aria-invalid={!!errors.score}
          placeholder={`Puntuación (máx. ${drill.max_score})`}
          {...register("score", {
            required: "Introduce la puntuación",
            min: { value: 0, message: "La puntuación no puede ser negativa" },
            max: {
              value: drill.max_score,
              message: `El máximo de este ejercicio es ${drill.max_score}`,
            },
          })}
        />
        {errors.score && (
          <p role="alert" className="text-caption text-strike">
            {errors.score.message}
          </p>
        )}
      </div>

      <Input type="text" placeholder="Notas (opcional)" {...register("notes")} />

      <Button type="submit" disabled={isPending}>
        {isPending ? "Registrando..." : "Registrar resultado"}
      </Button>
    </form>
  );
}
