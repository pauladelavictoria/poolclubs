import { AuthProvider } from "@/context/AuthContext";
import { I18nProvider } from "@/i18n";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./libs/queryClient";
import { ToastContainer } from "react-toastify";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
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

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
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
                <Route
                  path="me/training"
                  element={<MeRedirect suffix="/training" />}
                />
                <Route
                  path="me/training/plan"
                  element={<MeRedirect suffix="/training/plan" />}
                />
                <Route
                  path="players/:playerId/training"
                  element={<TrainingProgressPage />}
                />
                <Route
                  path="players/:playerId/training/plan"
                  element={<TrainingPlanPage />}
                />
                {/* Anyone signed in may author; DrillEditorPage turns away
                    non-owners on the /edit route, since that needs the drill. */}
                <Route path="drills/new" element={<DrillEditorPage />} />
                <Route path="drills/:id/edit" element={<DrillEditorPage />} />
              </Route>

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
      </I18nProvider>
    </QueryClientProvider>
  );
}
