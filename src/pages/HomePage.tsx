import { Link } from "react-router-dom";
import Layout from "./Layout";

export default function HomePage() {
  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <img
          src="/poolvalencia-logo.jpg"
          width={300}
          style={{ mixBlendMode: "multiply" }}
        />
        <h1 className="text-4xl md:text-5xl font-bold text-red-600 mb-6">
          Ranking PoolValencia
        </h1>
        <div className="max-w-2xl mx-auto">
          <p className="text-lg text-gray-700 mb-8"></p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            to="/ranking-diario"
            className="bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-8 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center"
          >
            Ranking diario
          </Link>
          <Link
            to="/"
            className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-8 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center"
            aria-disabled
          >
            Ranking global (Coming soon)
          </Link>
          <Link
            to="/añadir-partido"
            className="bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-8 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center"
          >
            Añadir partido
          </Link>
          <Link
            to="/partidos"
            className="bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-8 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center"
          >
            Todos los partidos
          </Link>
        </div>
      </div>
    </Layout>
  );
}
