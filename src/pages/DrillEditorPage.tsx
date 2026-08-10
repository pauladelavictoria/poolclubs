import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { supabase } from "@/supabaseClient";
import PageHeader from "@/components/PageHeader";
import DrillForm from "@/components/DrillForm";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useManageDrills, type DrillInput } from "@/hooks/useManageDrills";
import { useAuth } from "@/hooks/useAuth";
import { canEditDrill } from "@/libs/drillPermissions";
import type { Drill } from "@/types";
import { useT } from "@/i18n";

export default function DrillEditorPage() {
  const { t } = useT();
  const { id } = useParams<{ id: string }>();
  const drillId = id ? Number(id) : undefined;
  const navigate = useNavigate();

  const { data: drill, isLoading } = useQuery({
    queryKey: ["drill", drillId],
    queryFn: async () => {
      const { data } = await supabase
        .from("drills")
        .select("*")
        .eq("id", drillId)
        .single()
        .throwOnError();

      return data as Drill;
    },
    enabled: !!drillId,
  });

  const { user, isAdmin, isPlayerLoading } = useAuth();
  const { createDrill, updateDrill, deleteDrill } = useManageDrills();
  const isSubmitting = createDrill.isPending || updateDrill.isPending;
  const backLink = drillId ? `/app/drills/${drillId}` : "/app/drills";

  const handleSubmit = (values: DrillInput) => {
    const onError = () => toast.error(t("drills.saveError"));

    if (drillId) {
      updateDrill.mutate(
        { id: drillId, ...values },
        { onSuccess: () => navigate(`/app/drills/${drillId}`), onError }
      );
      return;
    }
    createDrill.mutate(values, {
      onSuccess: (created) => navigate(`/app/drills/${created.id}`),
      onError,
    });
  };

  const handleDelete = () => {
    if (!drillId) return;
    if (!confirm(t("drills.deleteConfirm"))) return;
    deleteDrill.mutate(drillId, {
      onSuccess: () => navigate("/app/drills"),
      onError: () => toast.error(t("drills.deleteError")),
    });
  };

  // isAdmin is false until the linked player lands, so waiting here is what
  // keeps the admin from being bounced off their own edit screen mid-load.
  if (drillId && (isLoading || isPlayerLoading)) {
    return (
      <>
        <PageHeader title={t("drills.editTitle")} back={backLink} />
        <div className="mx-auto max-w-5xl space-y-4 px-3 py-4">
          <Skeleton className="aspect-[2/1] w-full rounded-card" />
          <Skeleton className="h-64 w-full rounded-card" />
        </div>
      </>
    );
  }

  if (drillId && !drill) {
    return (
      <>
        <PageHeader title={t("drills.editTitle")} back="/app/drills" />
        <div className="mx-auto max-w-5xl px-3 py-4">
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

  // Deep link to someone else's drill: send them back to the read-only page.
  // RLS would refuse the save anyway; this just avoids the dead-end form.
  if (drill && !canEditDrill(drill.created_by, user?.id, isAdmin)) {
    return <Navigate to={`/app/drills/${drill.id}`} replace />;
  }

  return (
    <>
      <PageHeader
        title={drill ? t("drills.editTitle") : t("drills.newTitle")}
        back={backLink}
      />
      <div className="mx-auto max-w-5xl px-3 py-4">
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
