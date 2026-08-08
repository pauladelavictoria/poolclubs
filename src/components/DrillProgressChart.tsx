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
import { Card, CardHeader } from "@/components/ui/Card";

/* Chart ink, matched to the theme tokens */
const AXIS = "#8d9793";
const GRID = "rgba(255,255,255,0.07)";
const SCORE = "#3fbf7f";

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
    <Card className="overflow-hidden">
      <CardHeader title={title} />
      <div className="h-64 w-full p-3 text-caption md:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis
              dataKey="date"
              stroke={AXIS}
              tick={{ fill: AXIS, fontSize: 12 }}
              axisLine={{ stroke: GRID }}
              tickLine={{ stroke: GRID }}
            />
            <YAxis
              stroke={AXIS}
              tick={{ fill: AXIS, fontSize: 12 }}
              domain={[0, 100]}
              axisLine={{ stroke: GRID }}
              tickLine={{ stroke: GRID }}
              tickFormatter={(val) => `${val}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1f2624",
                border: "1px solid rgba(255,255,255,0.13)",
                borderRadius: "10px",
                color: "#f4f2ec",
                fontSize: 14,
              }}
              itemStyle={{ color: "#f4f2ec" }}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke={SCORE}
              strokeWidth={2}
              dot={{ r: 3, fill: SCORE }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
