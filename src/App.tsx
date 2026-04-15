import { AuthProvider } from "@/context/AuthContext";
import LoginPage from "@/pages/LoginPage";
import GamesPage from "@/pages/GamesPage";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./libs/queryClient";
import { ToastContainer } from "react-toastify";
import { Routes } from "react-router-dom";
import { Route } from "react-router-dom";
import { BrowserRouter } from "react-router-dom";
import HomePage from "@/pages/HomePage";
import RankingDailyPage from "@/pages/RankingDailyPage";
import RankingAllTimePage from "@/pages/RankingAllTimePage";
import AddGamePage from "@/pages/AddGamePage";
import PlayersPage from "@/pages/PlayersPage";
import PlayerDetailPage from "@/pages/PlayerDetailPage";
import DrillsPage from "@/pages/DrillsPage";
import DrillDetailPage from "@/pages/DrillDetailPage";
import TrainingProgressPage from "@/pages/TrainingProgressPage";
import TrainingPlanPage from "@/pages/TrainingPlanPage";
import { ProtectedRoute } from "@/ProtectedRoute";
import PlayerSelectModal from "@/components/PlayerSelectModal";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/partidos" element={<GamesPage />} />
            <Route path="/añadir-partido" element={<AddGamePage />} />
            <Route path="/ranking-diario" element={<RankingDailyPage />} />
            <Route path="/ranking" element={<RankingAllTimePage />} />

            <Route path="/players" element={<PlayersPage />} />
            <Route path="/players/:id" element={<PlayerDetailPage />} />

            <Route path="/entrenamientos" element={<DrillsPage />} />
            <Route path="/entrenamientos/progreso/:playerId" element={<TrainingProgressPage />} />
            <Route path="/entrenamientos/plan/:playerId" element={<TrainingPlanPage />} />
            <Route path="/entrenamientos/:id" element={<DrillDetailPage />} />

            <Route element={<ProtectedRoute />}>
              {/* Add protected routes here later if needed */}
            </Route>
          </Routes>
        </BrowserRouter>
        <PlayerSelectModal />
        <ToastContainer />
      </AuthProvider>
    </QueryClientProvider>
  );
}
