import { Link } from "react-router-dom";
import Layout from "./Layout";
import ProfileMenu from "@/components/ProfileMenu";
import { useAuth } from "@/hooks/useAuth";

export default function HomePage() {
  const { user } = useAuth();
  return (
    <Layout>
      <div className="relative min-h-[90vh] flex flex-col px-4 py-4">
        {/* Top Right User Menu */}
        <div className="absolute right-4 z-10">
          <ProfileMenu />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center text-center">
          {/* Main Card */}
          <div className="w-full max-w-md bg-dark-card rounded-3xl shadow-card p-8 border border-dark-border">
            <div className="mb-8">
              <img
                src="/ball.png"
                alt="Pool Valencia Logo"
                className="w-48 mx-auto mb-6 rounded-2xl"
              />
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 leading-tight">
                Ranking PoolValencia
              </h1>
            </div>

            <div className="flex flex-col gap-3">
              <Link
                to="/ranking-diario"
                className="bg-accent-red hover:bg-accent-red-dark text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-200 transform hover:scale-[1.02] hover:shadow-glow-red active:scale-[0.98] shadow-lg flex items-center justify-center text-base"
              >
                Ranking diario
              </Link>
              <Link
                to="/ranking"
                className="bg-accent-red hover:bg-accent-red-dark text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-200 transform hover:scale-[1.02] hover:shadow-glow-red active:scale-[0.98] shadow-lg flex items-center justify-center text-base"
              >
                Ranking global
              </Link>
              <Link
                to="/añadir-partido"
                className="bg-accent-red hover:bg-accent-red-dark text-white font-medium py-4 px-6 rounded-2xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] border border-dark-border hover:border-gray-600 flex items-center justify-center text-base"
              >
                Añadir partido
              </Link>
              <Link
                to="/partidos"
                className="bg-accent-red hover:bg-accent-red-dark text-white font-medium py-4 px-6 rounded-2xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] border border-dark-border hover:border-gray-600 flex items-center justify-center text-base"
              >
                Todos los partidos
              </Link>
              {user && (
                <Link
                  to="/players"
                  className="bg-dark-card-hover hover:bg-[#2a2a2a] text-blue-400 font-medium py-4 px-6 rounded-2xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] border border-dark-border hover:border-blue-500 flex items-center justify-center text-base"
                >
                  Gestionar jugadores
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
