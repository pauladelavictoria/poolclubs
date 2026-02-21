import { Link } from "react-router-dom";
import Layout from "./Layout";
import ProfileMenu from "@/components/ProfileMenu";

export default function HomePage() {
  return (
    <Layout>
      <div className="relative min-h-[90vh] flex flex-col px-4 py-4">
        {/* Top Right User Menu */}
        <div className="absolute right-4 z-10">
          <ProfileMenu />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center text-center">
          {/* Main Card */}
          <div className="w-full max-w-lg bg-dark-card rounded-3xl shadow-card p-8 border border-dark-border">
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
              <div className="text-gray-400 text-sm text-left">Rankings</div>
              <div className="flex gap-3 w-full">
                <Link
                  to="/ranking-diario"
                  className="flex-1 bg-accent-red hover:bg-accent-red-dark text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-200 transform hover:scale-[1.02] hover:shadow-glow-red active:scale-[0.98] shadow-lg flex items-center justify-center text-base"
                >
                  Diario
                </Link>
                <Link
                  to="/ranking"
                  className="flex-1 bg-accent-red hover:bg-accent-red-dark text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-200 transform hover:scale-[1.02] hover:shadow-glow-red active:scale-[0.98] shadow-lg flex items-center justify-center text-base"
                >
                  Global
                </Link>
              </div>
              <div className="text-gray-400 text-sm text-left">Partidos</div>
              <div className="flex gap-3 w-full">
                <Link
                  to="/partidos"
                  className="flex-1 bg-accent-red hover:bg-accent-red-dark text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-200 transform hover:scale-[1.02] hover:shadow-glow-red active:scale-[0.98] shadow-lg flex items-center justify-center text-base"
                >
                  Todos los partidos
                </Link>
                <Link
                  to="/añadir-partido"
                  className="flex-1 bg-accent-red hover:bg-accent-red-dark text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-200 transform hover:scale-[1.02] hover:shadow-glow-red active:scale-[0.98] shadow-lg flex items-center justify-center text-base"
                >
                  Añadir partido
                </Link>
              </div>
              <div className="text-gray-400 text-sm text-left">Jugadores</div>
              <Link
                to="/players"
                className="bg-accent-red hover:bg-accent-red-dark text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-200 transform hover:scale-[1.02] hover:shadow-glow-red active:scale-[0.98] shadow-lg flex items-center justify-center text-base"
              >
                Todos los jugadores
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
