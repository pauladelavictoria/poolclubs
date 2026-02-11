import { Link } from "react-router-dom";
import Layout from "./Layout";
import ProfileMenu from "@/components/ProfileMenu";
import { useAuth } from "@/hooks/useAuth";

export default function HomePage() {
  const { user } = useAuth();
  return (
    <Layout>
      <div className="relative min-h-[80vh] flex flex-col px-4">
        {/* Top Right User Menu */}
        <div className="absolute top-0 right-0 p-4">
          <ProfileMenu />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center text-center mt-12 sm:mt-0">
          <img
            src="/poolvalencia-logo.jpg"
            alt="Pool Valencia Logo"
            width={300}
            className="mb-4 mix-blend-multiply"
          />
          <h1 className="text-3xl md:text-5xl font-bold text-red-600 mb-8 max-w-2xl leading-tight">
            Ranking PoolValencia
          </h1>

          <div className="w-full max-w-sm flex flex-col gap-4">
            <Link
              to="/ranking-diario"
              className="bg-red-600 hover:bg-red-700 text-white font-medium py-3.5 px-6 rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg flex items-center justify-center text-lg"
            >
              Ranking diario
            </Link>
            <Link
              to="/ranking"
              className="bg-red-600 hover:bg-red-700 text-white font-medium py-3.5 px-6 rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg flex items-center justify-center text-lg"
            >
              Ranking global
            </Link>
            <Link
              to="/añadir-partido"
              className="bg-red-600 hover:bg-red-700 text-white font-medium py-3.5 px-6 rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg flex items-center justify-center text-lg"
            >
              Añadir partido
            </Link>
            <Link
              to="/partidos"
              className="bg-red-600 hover:bg-red-700 text-white font-medium py-3.5 px-6 rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg flex items-center justify-center text-lg"
            >
              Todos los partidos
            </Link>
            {user && <Link
              to="/players"
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3.5 px-6 rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg flex items-center justify-center text-lg"
            >
              Gestionar jugadores
            </Link>}
          </div>
        </div>
      </div>
    </Layout>
  );
}
