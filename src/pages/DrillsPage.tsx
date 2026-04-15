import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "./Layout";
import { useGetDrills } from "@/hooks/useGetDrills";
import { useGetPlayers } from "@/hooks/useGetPlayers";
import { useTrainingPlan } from "@/hooks/useTrainingPlan";
import DrillCard from "@/components/DrillCard";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { HiChevronLeft } from "react-icons/hi";
import { toast } from "react-toastify";
import type { DrillDifficulty, DrillSkillType } from "@/types";
import { DIFFICULTY_LABELS, SKILL_TYPE_LABELS } from "@/types";

export default function DrillsPage() {
  const [difficulty, setDifficulty] = useState<DrillDifficulty | "">("");
  const [skillType, setSkillType] = useState<DrillSkillType | "">("");
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);

  const navigate = useNavigate();
  const { data: drills, isLoading } = useGetDrills({
    difficulty: difficulty || undefined,
    skill_type: skillType || undefined,
  });
  const { data: players } = useGetPlayers();
  const { generatePlan } = useTrainingPlan(selectedPlayerId ?? undefined);

  const handleGeneratePlan = () => {
    if (!selectedPlayerId) {
      toast.error("Selecciona un jugador");
      return;
    }
    const player = players?.find((p) => p.id === selectedPlayerId);
    if (!player) return;

    generatePlan.mutate(
      { playerId: player.id, category: player.category },
      {
        onSuccess: () => {
          navigate(`/entrenamientos/plan/${player.id}`);
        },
        onError: () => {
          toast.error("Error al generar el plan");
        },
      }
    );
  };

  return (
    <Layout>
      <div>
        <div className="bg-dark-card shadow-card overflow-hidden">
          <div className="bg-gradient-to-r from-accent-red to-accent-red-dark p-4 text-white">
            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-white py-2 transition-colors hover:opacity-80"
                aria-label="Inicio"
              >
                <HiChevronLeft className="h-6 w-6" aria-hidden />
              </Link>
              <h1 className="text-2xl font-bold">Entrenamientos</h1>
            </div>
          </div>

          {/* Auto plan section */}
          <div className="px-6 py-5 border-b border-dark-border">
            <h2 className="text-lg font-medium text-white mb-3">
              Plan automático
            </h2>
            <p className="text-sm text-gray-400 mb-4">
              Genera un plan de entrenamiento personalizado con ~10 ejercicios
              adaptados a tu nivel.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Select
                className="p-3 rounded-2xl flex-1"
                value={selectedPlayerId ?? ""}
                onChange={(e) =>
                  setSelectedPlayerId(
                    e.target.value ? Number(e.target.value) : null
                  )
                }
              >
                <option value="">Seleccionar jugador</option>
                {players?.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name} (Cat. {player.category})
                  </option>
                ))}
              </Select>
              <Button
                className="rounded-2xl shadow-md whitespace-nowrap"
                onClick={handleGeneratePlan}
                disabled={!selectedPlayerId || generatePlan.isPending}
              >
                {generatePlan.isPending
                  ? "Generando..."
                  : "Generar plan"}
              </Button>
              {selectedPlayerId && (
                <Link
                  to={`/entrenamientos/plan/${selectedPlayerId}`}
                  className="inline-flex items-center justify-center text-sm text-accent-red hover:text-white transition-colors px-3 py-2 rounded-2xl border border-dark-border hover:bg-dark-card-hover"
                >
                  Ver plan actual
                </Link>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="px-6 py-4 border-b border-dark-border flex flex-col sm:flex-row gap-3">
            <Select
              className="p-3 rounded-2xl flex-1"
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
              className="p-3 rounded-2xl flex-1"
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

          {/* Drills grid */}
          <div className="px-6 py-5">
            {isLoading ? (
              <div className="py-8 flex justify-center">
                <div className="animate-spin rounded-xl h-8 w-8 border-t-2 border-b-2 border-accent-red"></div>
              </div>
            ) : drills && drills.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {drills.map((drill) => (
                  <DrillCard key={drill.id} drill={drill} />
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-gray-400">
                No se encontraron ejercicios con estos filtros.
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
