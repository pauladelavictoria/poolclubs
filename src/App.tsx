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
import AddGamePage from "@/pages/AddGamePage";

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

            {/* <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<DashboardPage />} />
            </Route> */}
          </Routes>
        </BrowserRouter>
        <ToastContainer />
      </AuthProvider>
    </QueryClientProvider>
  );
}
