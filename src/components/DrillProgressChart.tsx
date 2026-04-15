import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { DrillLog } from "@/types";

interface DrillProgressChartProps {
  logs: DrillLog[];
  title?: string;
}

export default function DrillProgressChart({
  logs,
  title = "Progreso",
}: DrillProgressChartProps) {
  const chartData = useMemo(() => {
    if (!logs || logs.length === 0) return [];

    // Logs come sorted desc, reverse for chronological order
    return [...logs].reverse().map((log, idx) => ({
      index: idx + 1,
      date: new Date(log.created_at).toLocaleDateString(),
      score: log.max_score > 0
        ? parseFloat(((log.score / log.max_score) * 100).toFixed(1))
        : 0,
      raw: `${log.score}/${log.max_score}`,
    }));
  }, [logs]);

  if (chartData.length === 0) {
    return null;
  }

  return (
    <div className="bg-dark-card p-4 md:p-6 rounded-3xl border border-dark-border shadow-card">
      <h2 className="text-xl font-bold text-white mb-6 ml-2">{title}</h2>
      <div className="h-64 md:h-80 w-full text-sm">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis
              dataKey="date"
              stroke="#888"
              tick={{ fill: "#888" }}
              axisLine={{ stroke: "#333" }}
              tickLine={{ stroke: "#333" }}
            />
            <YAxis
              stroke="#888"
              tick={{ fill: "#888" }}
              domain={[0, 100]}
              axisLine={{ stroke: "#333" }}
              tickLine={{ stroke: "#333" }}
              tickFormatter={(val) => `${val}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1a1a1a",
                borderColor: "#333",
                borderRadius: "0.5rem",
                color: "#fff",
              }}
              itemStyle={{ color: "#fff" }}
              // formatter={(value: number , _name: string, props: { payload: { raw: string } }) => [
              //   `${value || 0}% (${props.payload.raw})`,
              //   "Puntuación",
              // ]}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#4ade80"
              strokeWidth={2}
              dot={{ r: 3, fill: "#4ade80" }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
