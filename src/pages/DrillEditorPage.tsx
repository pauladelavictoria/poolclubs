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

export default function DrillEditorPage() {
  const { id } = useParams<{ id: string }>();
  const drillId = id ? Number(id) : undefined;
  const navigate = useNavigate();

  const { data: drill, isLoading } = useQuery({
    queryKey: ["drill", drillId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drills")
        .select("*")
        .eq("id", drillId)
        .single();
      if (error) throw error;
      return data as Drill;
    },
    enabled: !!drillId,
  });

  const { user, isAdmin, isPlayerLoading } = useAuth();
  const { createDrill, updateDrill, deleteDrill } = useManageDrills();
  const isSubmitting = createDrill.isPending || updateDrill.isPending;
  const backLink = drillId ? `/drills/${drillId}` : "/drills";

  const handleSubmit = (values: DrillInput) => {
    const onError = () => toast.error("No se pudo guardar el ejercicio");

    if (drillId) {
      updateDrill.mutate(
        { id: drillId, ...values },
        { onSuccess: () => navigate(`/drills/${drillId}`), onError }
      );
      return;
    }
    createDrill.mutate(values, {
      onSuccess: (created) => navigate(`/drills/${created.id}`),
      onError,
    });
  };

  const handleDelete = () => {
    if (!drillId) return;
    if (!confirm("¿Eliminar este ejercicio?")) return;
    deleteDrill.mutate(drillId, {
      onSuccess: () => navigate("/drills"),
      onError: () => toast.error("No se pudo eliminar el ejercicio"),
    });
  };

  // isAdmin is false until the linked player lands, so waiting here is what
  // keeps the admin from being bounced off their own edit screen mid-load.
  if (drillId && (isLoading || isPlayerLoading)) {
    return (
      <>
        <PageHeader title="Editar ejercicio" back={backLink} />
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
        <PageHeader title="Editar ejercicio" back="/drills" />
        <div className="mx-auto max-w-5xl px-3 py-4">
          <Card>
            <EmptyState
              title="Ejercicio no encontrado"
              hint="Puede que se haya eliminado o que el enlace sea antiguo."
            />
          </Card>
        </div>
      </>
    );
  }

  // Deep link to someone else's drill: send them back to the read-only page.
  // RLS would refuse the save anyway; this just avoids the dead-end form.
  if (drill && !canEditDrill(drill.created_by, user?.id, isAdmin)) {
    return <Navigate to={`/drills/${drill.id}`} replace />;
  }

  return (
    <>
      <PageHeader
        title={drill ? "Editar ejercicio" : "Nuevo ejercicio"}
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
