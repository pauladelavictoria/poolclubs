import { Link } from "react-router-dom";
import Layout from "./Layout";

export default function HomePage() {
  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <h1 className="text-4xl md:text-5xl font-bold text-indigo-600 mb-6">
          Ranking PoolValencia
        </h1>

        <div className="max-w-2xl mx-auto">
          <p className="text-lg text-gray-700 mb-8"></p>
        </div>

        <Link
          to="/dashboard"
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-8 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center"
        >
          Ver partidos
        </Link>
      </div>
    </Layout>
  );
}
