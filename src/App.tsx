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
import { ProtectedRoute } from "@/ProtectedRoute";

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

            <Route element={<ProtectedRoute />}>
              {/* Add protected routes here later if needed */}
            </Route>
          </Routes>
        </BrowserRouter>
        <ToastContainer />
      </AuthProvider>
    </QueryClientProvider>
  );
}
