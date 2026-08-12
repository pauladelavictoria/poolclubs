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
          toast.success(t("drillLog.saved"));
          reset();
          onSuccess?.(result.id);
        },
        onError: () => {
          toast.error(t("common.error"));
        },
      },
    );
  };

  if (!user) {
    return (
      <div className="space-y-3">
        <p className="text-body text-ink-soft">{t("drillLog.signInPrompt")}</p>
        <Link
          to={loginLink(location.pathname + location.search)}
          className={buttonClasses({ variant: "primary" })}
        >
          {t("auth.signIn")}
        </Link>
      </div>
    );
  }

  if (!player) {
    return (
      <p className="text-body text-ink-soft">
        {isPlayerLoading
          ? t("drillLog.loadingPlayer")
          : t("drillLog.linkPrompt")}
      </p>
    );
  }

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
