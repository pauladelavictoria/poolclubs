import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { useAuth } from "@/hooks/useAuth";
import { useAddDrillLog } from "@/hooks/useAddDrillLog";
import { dbErrorMessage } from "@/libs/algorithms/dbError";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { Drill } from "@/types";
import { useT } from "@/i18n";

interface DrillLogFormProps {
  drill: Drill;
  onSuccess?: (drillLogId: number) => void;
}

type FormData = {
  score: string;
  notes: string;
};

export default function DrillLogForm({ drill, onSuccess }: DrillLogFormProps) {
  const { t } = useT();
  const { player } = useAuth();
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
    if (isNaN(score) || score < 0 || score > drill.max_score) return;

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
          toast.success(t("drillLog.saved"));
          reset();
          onSuccess?.(result.id);
        },
        onError: (err) => {
          toast.error(
            t(
              dbErrorMessage(err, "addDrillLog", {
                denied: "common.deniedError",
              }),
            ),
          );
        },
      },
    );
  };

  // The "sign in first" and "no player row yet" branches this used to carry are
  // unreachable now: the form only renders on a drill page, which lives inside a
  // club, and being in one means having an approved player row.

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <p className="text-caption text-ink-faint">
        {t("drillLog.loggingAs")}{" "}
        <span className="font-medium text-ink">{player.name}</span>
      </p>

      <div className="flex flex-col gap-1.5">
        <Input
          type="number"
          min={0}
          max={drill.max_score}
          aria-invalid={!!errors.score}
          placeholder={t("drillLog.scorePlaceholder", {
            max: drill.max_score,
          })}
          {...register("score", {
            required: t("drillLog.required"),
            min: { value: 0, message: t("drillLog.negative") },
            max: {
              value: drill.max_score,
              message: t("drillLog.max", { max: drill.max_score }),
            },
          })}
        />
        {errors.score && (
          <p role="alert" className="text-caption text-strike">
            {errors.score.message}
          </p>
        )}
      </div>

      <Input
        type="text"
        placeholder={t("drillLog.notesPlaceholder")}
        {...register("notes")}
      />

      <Button type="submit" disabled={isPending}>
        {isPending ? t("drillLog.saving") : t("drillLog.submit")}
      </Button>
    </form>
  );
}
