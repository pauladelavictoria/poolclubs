import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { LuTarget } from "react-icons/lu";
import PageHeader from "@/components/PageHeader";
import DrillCard from "@/components/DrillCard";
import { useGetDrills } from "@/hooks/useGetDrills";
import { useGetPlayers } from "@/hooks/useGetPlayers";
import { useAuth } from "@/hooks/useAuth";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { useTrainingPlan } from "@/hooks/useTrainingPlan";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import type { DrillDifficulty, DrillSkillType } from "@/types";
import { DIFFICULTY_LABELS, SKILL_TYPE_LABELS } from "@/types";

export default function DrillsPage() {
  const [difficulty, setDifficulty] = useState<DrillDifficulty | "">("");
  const [skillType, setSkillType] = useState<DrillSkillType | "">("");
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);

  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: drills, isLoading } = useGetDrills({
    difficulty: difficulty || undefined,
    skill_type: skillType || undefined,
  });
  const { data: players } = useGetPlayers();
  const { generatePlan } = useTrainingPlan(selectedPlayerId ?? undefined);

  const handleGeneratePlan = () => {
    const player = players?.find((p) => p.id === selectedPlayerId);
    if (!player) {
      toast.error("Selecciona un jugador");
      return;
    }

    generatePlan.mutate(
      { playerId: player.id, category: player.category },
      {
        onSuccess: () => navigate(`/players/${player.id}/training/plan`),
        onError: () => toast.error("Error al generar el plan"),
      },
    );
  };

  return (
    <>
      <PageHeader title="Ejercicios">
        {user && (
          <Link
            to="/drills/new"
            className={buttonClasses({ variant: "secondary", size: "sm" })}
          >
            Nuevo ejercicio
          </Link>
        )}
      </PageHeader>

      <div className="mx-auto max-w-5xl space-y-4 px-3 py-4">
        {/* The primary action on this screen: get a plan. It leads. */}
        <Card className="p-5">
          <h2 className="text-h4 font-semibold text-ink">Plan automático</h2>
          <p className="mt-1 max-w-[52ch] text-body text-ink-soft">
            Diez ejercicios elegidos para tu categoría, en orden.
          </p>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Select
              className="flex-1"
              aria-label="Jugador para el plan"
              value={selectedPlayerId ?? ""}
              onChange={(e) =>
                setSelectedPlayerId(
                  e.target.value ? Number(e.target.value) : null,
                )
              }
            >
              <option value="">Seleccionar jugador</option>
              {players?.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name} ({player.category}ª)
                </option>
              ))}
            </Select>

            <Button
              onClick={handleGeneratePlan}
              disabled={!selectedPlayerId || generatePlan.isPending}
              className="shrink-0"
            >
              {generatePlan.isPending ? "Generando..." : "Generar plan"}
            </Button>
          </div>

          {selectedPlayerId && (
            <Link
              to={`/players/${selectedPlayerId}/training/plan`}
              className="mt-3 inline-block text-caption font-medium text-ink-faint transition-colors duration-150 hover:text-ink"
            >
              Ver el plan actual
            </Link>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="flex flex-col gap-2 border-b border-hairline p-3 sm:flex-row">
            <Select
              className="flex-1"
              aria-label="Filtrar por dificultad"
              value={difficulty}
              onChange={(e) =>
                setDifficulty(e.target.value as DrillDifficulty | "")
              }
            >
              <option value="">Todas las dificultades</option>
              {(
                Object.entries(DIFFICULTY_LABELS) as [DrillDifficulty, string][]
              ).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>

            <Select
              className="flex-1"
              aria-label="Filtrar por tipo"
              value={skillType}
              onChange={(e) =>
                setSkillType(e.target.value as DrillSkillType | "")
              }
            >
              <option value="">Todos los tipos</option>
              {(
                Object.entries(SKILL_TYPE_LABELS) as [DrillSkillType, string][]
              ).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>
          </div>

          <div className="p-3">
            {isLoading ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {Array.from({ length: 6 }, (_, i) => (
                  <Skeleton key={i} className="h-44 rounded-card" />
                ))}
              </div>
            ) : drills && drills.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {drills.map((drill) => (
                  <DrillCard key={drill.id} drill={drill} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<LuTarget className="h-5 w-5" />}
                title="Ningún ejercicio coincide"
                hint="Prueba a quitar alguno de los filtros."
                action={
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setDifficulty("");
                      setSkillType("");
                    }}
                  >
                    Quitar filtros
                  </Button>
                }
              />
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
