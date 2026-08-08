import { AuthProvider } from "@/context/AuthContext";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./libs/queryClient";
import { ToastContainer } from "react-toastify";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useParams,
} from "react-router-dom";
import Layout from "@/pages/Layout";
import DashboardPage from "@/pages/DashboardPage";
import LoginPage from "@/pages/LoginPage";
import GamesPage from "@/pages/GamesPage";
import AddGamePage from "@/pages/AddGamePage";
import RankingDailyPage from "@/pages/RankingDailyPage";
import RankingAllTimePage from "@/pages/RankingAllTimePage";
import PlayersPage from "@/pages/PlayersPage";
import PlayerDetailPage from "@/pages/PlayerDetailPage";
import DrillsPage from "@/pages/DrillsPage";
import DrillDetailPage from "@/pages/DrillDetailPage";
import DrillEditorPage from "@/pages/DrillEditorPage";
import TrainingProgressPage from "@/pages/TrainingProgressPage";
import TrainingPlanPage from "@/pages/TrainingPlanPage";
import { ProtectedRoute } from "@/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import PlayerSelectModal from "@/components/PlayerSelectModal";

/** "/me/..." resolves to the signed-in player's own URL. Lets links exist before
 *  we know their id; signed in but not linked yet, PlayerSelectModal takes over. */
function MeRedirect({ suffix = "" }: { suffix?: string }) {
  const { player } = useAuth();
  return (
    <Navigate to={player ? `/players/${player.id}${suffix}` : "/"} replace />
  );
}

/** Redirect that carries route params across, e.g. "/players/:playerId/plan". */
function Redirect({ to }: { to: string }) {
  const params = useParams();
  return (
    <Navigate
      to={to.replace(/:(\w+)/g, (_, key: string) => params[key] ?? "")}
      replace
    />
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<DashboardPage />} />
              <Route path="login" element={<LoginPage />} />

              <Route path="ranking" element={<RankingAllTimePage />} />
              <Route path="ranking/daily" element={<RankingDailyPage />} />

              <Route path="games" element={<GamesPage />} />
              <Route path="games/new" element={<AddGamePage />} />

              <Route path="players" element={<PlayersPage />} />
              <Route path="players/:id" element={<PlayerDetailPage />} />

              {/* Browsing drills is public; logging a result and editing are not */}
              <Route path="drills" element={<DrillsPage />} />
              <Route path="drills/:id" element={<DrillDetailPage />} />

              <Route element={<ProtectedRoute />}>
                <Route path="me" element={<MeRedirect />} />
                <Route path="me/plan" element={<MeRedirect suffix="/plan" />} />
                <Route
                  path="me/progress"
                  element={<MeRedirect suffix="/progress" />}
                />
                <Route
                  path="players/:playerId/plan"
                  element={<TrainingPlanPage />}
                />
                <Route
                  path="players/:playerId/progress"
                  element={<TrainingProgressPage />}
                />
                {/* Anyone signed in may author; DrillEditorPage turns away
                    non-owners on the /edit route, since that needs the drill. */}
                <Route path="drills/new" element={<DrillEditorPage />} />
                <Route path="drills/:id/edit" element={<DrillEditorPage />} />
              </Route>

              {/* Old Spanish/mixed-language URLs */}
              <Route path="partidos" element={<Navigate to="/games" replace />} />
              <Route
                path="añadir-partido"
                element={<Navigate to="/games/new" replace />}
              />
              <Route
                path="ranking-diario"
                element={<Navigate to="/ranking/daily" replace />}
              />
              <Route
                path="entrenamientos"
                element={<Navigate to="/drills" replace />}
              />
              <Route
                path="entrenamientos/plan/:playerId"
                element={<Redirect to="/players/:playerId/plan" />}
              />
              <Route
                path="entrenamientos/progreso/:playerId"
                element={<Redirect to="/players/:playerId/progress" />}
              />
              <Route
                path="entrenamientos/:id"
                element={<Redirect to="/drills/:id" />}
              />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <PlayerSelectModal />
        <ToastContainer
          theme="dark"
          position="bottom-center"
          autoClose={2600}
          hideProgressBar
        />
      </AuthProvider>
    </QueryClientProvider>
  );
}
