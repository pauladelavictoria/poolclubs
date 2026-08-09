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
import PlayerDetailPage from "@/pages/PlayerDetailPage";
import DrillsPage from "@/pages/DrillsPage";
import DrillDetailPage from "@/pages/DrillDetailPage";
import DrillEditorPage from "@/pages/DrillEditorPage";
import TrainingProgressPage from "@/pages/TrainingProgressPage";
import TrainingPlanPage from "@/pages/TrainingPlanPage";
import ChallengesPage from "@/pages/ChallengesPage";
import ClubPage from "@/pages/ClubPage";
import ClubOnboardingPage from "@/pages/ClubOnboardingPage";
import JoinClubPage from "@/pages/JoinClubPage";
import { ProtectedRoute } from "@/ProtectedRoute";
import { RequireClub } from "@/RequireClub";
import { useAuth } from "@/hooks/useAuth";

/** "/me/..." resolves to the signed-in player's own URL. Lets links exist before
 *  we know their id. */
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
              {/* The only two doors that open from outside a club. */}
              <Route path="login" element={<LoginPage />} />
              <Route path="join/:code" element={<JoinClubPage />} />

              {/* Clubs are members-only, so every page below needs both an
                  account and an approved membership. */}
              <Route element={<ProtectedRoute />}>
                {/* Outside RequireClub: starting or joining a second club is
                    the one club-scoped thing members already in one can do. */}
                <Route path="clubs/new" element={<ClubOnboardingPage />} />

                <Route element={<RequireClub />}>
                  <Route index element={<DashboardPage />} />

                  <Route path="ranking" element={<RankingAllTimePage />} />
                  <Route path="ranking/daily" element={<RankingDailyPage />} />

                  <Route path="games" element={<GamesPage />} />
                  <Route path="games/new" element={<AddGamePage />} />
                  <Route path="challenges" element={<ChallengesPage />} />

                  {/* The roster moved into club settings; old links still resolve. */}
                  <Route
                    path="players"
                    element={<Navigate to="/club" replace />}
                  />
                  <Route path="players/:id" element={<PlayerDetailPage />} />
                  <Route path="club" element={<ClubPage />} />

                  <Route path="drills" element={<DrillsPage />} />
                  <Route path="drills/:id" element={<DrillDetailPage />} />

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
                  {/* Drills are one global library shared by every club;
                      DrillEditorPage turns away non-owners on /edit. */}
                  <Route path="drills/new" element={<DrillEditorPage />} />
                  <Route path="drills/:id/edit" element={<DrillEditorPage />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
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
