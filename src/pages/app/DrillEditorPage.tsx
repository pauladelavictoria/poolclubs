import { useNavigate, useParams } from "@tanstack/react-router";
import { toast } from "react-toastify";
import { useDrill } from "@/hooks/useDrills";
import PageTitle from "@/components/layout/PageTitle";
import DrillForm from "@/components/drills/DrillForm";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useManageDrills, type DrillInput } from "@/hooks/useManageDrills";
import { dbErrorMessage } from "@/libs/algorithms/dbError";
import { useT } from "@/i18n";

export default function DrillEditorPage() {
  const { t } = useT();
  // One component, two routes: /drills/new has no drillId, /drills/$drillId/edit
  // does. `strict: false` is how you read a parameter that may not be there.
  const { clubSlug, drillId: drillIdParam } = useParams({ strict: false });
  const drillId = drillIdParam ? Number(drillIdParam) : undefined;
  const navigate = useNavigate();

  const { data: drill, isLoading } = useDrill(drillId);

  const { createDrill, updateDrill, deleteDrill } = useManageDrills();
  const isSubmitting = createDrill.isPending || updateDrill.isPending;

  const handleSubmit = (values: DrillInput) => {
    const onError = (err: unknown) =>
      toast.error(
        t(
          dbErrorMessage(err, "saveDrill", {
            denied: "common.deniedError",
            fallback: "drills.saveError",
          }),
        ),
      );

    if (drillId) {
      updateDrill.mutate(
        { id: drillId, ...values },
        {
          onSuccess: () =>
            navigate({
              to: "/app/$clubSlug/drills/$drillId",
              params: { clubSlug: clubSlug!, drillId: String(drillId) },
            }),
          onError,
        },
      );
      return;
    }
    createDrill.mutate(values, {
      onSuccess: (created) =>
        navigate({
          to: "/app/$clubSlug/drills/$drillId",
          params: { clubSlug: clubSlug!, drillId: String(created.id) },
        }),
      onError,
    });
  };

  const handleDelete = () => {
    if (!drillId) return;
    if (!confirm(t("drills.deleteConfirm"))) return;
    deleteDrill.mutate(drillId, {
      onSuccess: () =>
        navigate({
          to: "/app/$clubSlug/drills",
          params: { clubSlug: clubSlug! },
        }),
      onError: (err) =>
        toast.error(
          t(
            dbErrorMessage(err, "deleteDrill", {
              denied: "common.deniedError",
              fallback: "drills.deleteError",
            }),
          ),
        ),
    });
  };

  // The drill is primed by the edit route's loader, so this only shows on a
  // client-side navigation that arrived ahead of the fetch. There is no longer an
  // "is the linked player loaded yet" half of the condition — the router resolved
  // that before this component existed.
  if (drillId && isLoading) {
    return (
      <>
        <div className="mx-auto max-w-5xl space-y-4 px-3 py-4">
          <PageTitle title={t("drills.editTitle")} />
          <Skeleton className="aspect-[2/1] w-full rounded-card" />
          <Skeleton className="h-64 w-full rounded-card" />
        </div>
      </>
    );
  }

  if (drillId && !drill) {
    return (
      <>
        <div className="mx-auto max-w-5xl space-y-4 px-3 py-4">
          <PageTitle title={t("drills.editTitle")} />
          <Card>
            <EmptyState
              title={t("drills.notFound")}
              hint={t("drills.notFoundHint")}
            />
          </Card>
        </div>
      </>
    );
  }

  // Who may edit a drill is checked in the edit route's loader, before the form
  // is ever built — see routes/app/_authed/$clubSlug/drills/$drillId/edit.tsx.
  // RLS would refuse the save regardless; the point is not to draw a dead end.

  return (
    <>
      <div className="mx-auto max-w-5xl space-y-4 px-3 py-4">
        <PageTitle
          title={drill ? t("drills.editTitle") : t("drills.newTitle")}
        />
        <DrillForm
          // Remount once the drill arrives, so the form seeds from real data
          key={drill?.id ?? "new"}
          initial={drill}
          onSubmit={handleSubmit}
          onDelete={drillId ? handleDelete : undefined}
          isSubmitting={isSubmitting}
        />
      </div>
    </>
  );
}
