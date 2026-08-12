import { useId, useMemo } from "react";
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
import { bandGradientStops, scoreColor, scorePct } from "@/libs/scoreBand";
import { fmt, timeOf } from "@/libs/dayLabel";
import { useChartTheme } from "@/libs/chartTheme";
import { useT } from "@/i18n";

interface DrillProgressChartProps {
  logs: DrillLog[];
  title?: string;
}

export default function DrillProgressChart({
  logs,
  title,
}: DrillProgressChartProps) {
  const { t, locale } = useT();
  const chart = useChartTheme();

  const chartData = useMemo(() => {
    if (!logs || logs.length === 0) return [];

    // Logs come sorted desc, reverse for chronological order
    return [...logs].reverse().map((log, idx) => {
      const at = new Date(log.created_at);
      return {
        // The x key must be unique. Several attempts in one session share a
        // date, and recharts resolves a category axis by value: every one of
        // them would hand the tooltip the first row that carries that label.
        index: idx + 1,
        label: `${fmt(locale, { day: "numeric", month: "short" }).format(at)} · ${timeOf(at, locale)}`,
        score: scorePct(log.score, log.max_score),
        raw: `${log.score}/${log.max_score}`,
      };
    });
  }, [logs, locale]);

  // The gradient is defined over the line's own bounding box, so its stops
  // depend on the range actually drawn, not on the 0–100 axis.
  const gradientId = useId();
  const stops = useMemo(() => {
    const scores = chartData.map((d) => d.score);
    return bandGradientStops(Math.min(...scores), Math.max(...scores));
  }, [chartData]);

  if (chartData.length === 0) {
    return null;
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader title={title ?? t("training.chartTitle")} />
      <div className="h-64 w-full p-3 text-caption md:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                {stops.map((s, i) => (
                  <stop key={i} offset={s.offset} stopColor={s.color} />
                ))}
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
            <XAxis
              dataKey="index"
              stroke={chart.axis}
              tick={{ fill: chart.axis, fontSize: 14 }}
              axisLine={{ stroke: chart.grid }}
              tickLine={{ stroke: chart.grid }}
              tickFormatter={(i) => chartData[i - 1]?.label ?? ""}
              minTickGap={24}
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
              labelFormatter={(i) => chartData[Number(i) - 1]?.label ?? ""}
              formatter={(value, _name, item) => [
                `${value}% · ${item.payload.raw}`,
                t("training.result"),
              ]}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke={`url(#${gradientId})`}
              strokeWidth={2}
              // Dot colour is the score band, so a dip reads before the axis does
              dot={({ cx, cy, payload, key }) => (
                <circle
                  key={key}
                  cx={cx}
                  cy={cy}
                  r={3.5}
                  fill={scoreColor(payload.score)}
                />
              )}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
