import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardHeader } from "@/components/ui/Card";
import { useChartTheme } from "@/libs/theme/chartTheme";
import { useT } from "@/i18n";

type ChartPoint = {
  gameIndex: number;
  date: string;
  gameWinRate: number;
  rackWinRate: number;
  gamesWon: number;
  racksWon: number;
};

export default function PlayerRatingChart({
  chartData,
}: {
  chartData: ChartPoint[];
}) {
  const { t } = useT();
  const chart = useChartTheme();

  return (
    <Card className="overflow-hidden">
      <CardHeader title={t("players.winsOverTime")} />
      <div className="h-64 w-full p-3 text-caption md:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
            <XAxis
              dataKey="date"
              stroke={chart.axis}
              tick={{ fill: chart.axis, fontSize: 14 }}
              axisLine={{ stroke: chart.grid }}
              tickLine={{ stroke: chart.grid }}
              tickFormatter={(val) => val.split(",")[0]}
            />
            <YAxis
              stroke={chart.axis}
              tick={{ fill: chart.axis, fontSize: 14 }}
              domain={[0, 100]}
              axisLine={{ stroke: chart.grid }}
              tickLine={{ stroke: chart.grid }}
              tickFormatter={(val) => `${val}%`}
            />
            <Tooltip
              contentStyle={chart.tooltip}
              itemStyle={chart.tooltipItem}
              formatter={(value) => `${value}%`}
              itemSorter={(i) => (i.dataKey === "gameWinRate" ? -1 : 1)}
            />
            <Line
              type="step"
              name={t("players.racks")}
              dataKey="rackWinRate"
              stroke={chart.series.racks}
              strokeWidth={2}
              strokeDasharray="3 3"
              dot={false}
            />
            <Line
              type="step"
              name={t("players.games")}
              dataKey="gameWinRate"
              stroke={chart.series.games}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
