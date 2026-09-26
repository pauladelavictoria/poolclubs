import { useCallback, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { usePlayerHighlight } from "@/components/players/PlayerLink";
import {
  positionsByDay,
  type LeaguePoints,
  type ResultMatch,
  type Standing,
} from "@/libs/algorithms/leagueTable";
import { fmt } from "@/libs/algorithms/dayLabel";
import { useChartTheme } from "@/libs/theme/chartTheme";
import { useTheme } from "@/libs/theme/theme";
import { useT } from "@/i18n";

/** Categorical slots 1–5 of the dataviz reference palette, light and dark,
 *  validated as a set (scripts/validate_palette.js). The light set warns on
 *  contrast; the bold names at the line ends and the standings table are the relief. */
const SERIES = {
  light: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4"],
  dark: ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181"],
};

// The reader's calendar day. ponytail: not the club's 06:00 night boundary
// (libs/algorithms/day.ts) — a 01:00 result lands on the next day.
const dayOf = (at: string) => new Date(at).toLocaleDateString("sv");

/**
 * The league table over time: each entrant's place after every day of
 * results, 1 at the top. Twenty-nine coloured lines is no chart at all, so the
 * current top five carry the palette and everyone else is a thin grey thread —
 * until hovered, or picked out by tapping a name, which lights that one line.
 */
export default function StandingsChartInner({
  rows,
  matches,
  points,
  nameOf,
}: {
  rows: Standing[];
  matches: ResultMatch[];
  points?: LeaguePoints;
  nameOf: (id: number) => string;
}) {
  const { t, locale } = useT();
  const chart = useChartTheme();
  const palette = SERIES[useTheme() === "light" ? "light" : "dark"];
  const highlight = usePlayerHighlight();
  const [hover, setHover] = useState<number | null>(null);
  // A phone opens the scroller at its right edge: today's names and the
  // latest days are what it is read for. Stable, so a re-render (every hover)
  // never yanks it back.
  const toLatest = useCallback((el: HTMLDivElement | null) => {
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);
  const focus = hover ?? highlight?.active ?? null;

  // Only who has played: an entrant with no games is a flat line along the
  // bottom. With a points-for-playing league they rank last anyway, so the
  // places above them match the table.
  const ids = rows.filter((r) => r.played > 0).map((r) => r.playerId);
  const days = positionsByDay(ids, matches, points, dayOf);
  const data = days.map(({ day, positions }) => ({
    day,
    ...Object.fromEntries(ids.map((id) => [`p${id}`, positions.get(id)])),
  }));

  // Colour follows the player, fixed by today's table.
  const colourOf = new Map(ids.slice(0, 5).map((id, i) => [id, palette[i]]));
  const shortDay = (day: string) =>
    fmt(locale, { day: "numeric", month: "short" }).format(
      new Date(`${day}T12:00`),
    );

  if (days.length < 2)
    return (
      <p className="px-4 py-10 text-center text-body text-ink-faint">
        {t("tournaments.chartTooEarly")}
      </p>
    );

  // Drawn in order: grey first, then the coloured five, the focused line last
  // so it is never under another.
  const order = [...ids].sort(
    (a, b) =>
      Number(a === focus) - Number(b === focus) ||
      Number(colourOf.has(a)) - Number(colourOf.has(b)),
  );
  /** A line's name at its right-hand end — where it stands today. */
  const nameTag = (id: number, x: number, y: number) => {
    const colour = colourOf.get(id);
    const lit = id === focus;
    const name = nameOf(id);
    return (
      <g
        transform={`translate(${x + 8},${y})`}
        style={{ cursor: "pointer" }}
        onMouseEnter={() => setHover(id)}
        onClick={() => highlight?.toggle(id)}
      >
        <title>{name}</title>
        <text
          dy="0.32em"
          fontSize={12}
          fontWeight={lit || colour ? 600 : 400}
          fill={lit || colour ? chart.tooltipItem.color : chart.axis}
        >
          {name.length > 22 ? `${name.slice(0, 21)}…` : name}
        </text>
      </g>
    );
  };
  const last = data.length - 1;

  // Who the tooltip lists: the coloured five, and the focused player.
  const legend = [
    ...colourOf.keys(),
    ...(focus && !colourOf.has(focus) ? [focus] : []),
  ];

  return (
    <div className="p-3">
      {/* A row per entrant, so every name on the right has room to be read. */}
      {/* A phone scrolls it sideways rather than squeeze the lines to
          nothing beside the names — the bracket's own answer. */}
      <div ref={toLatest} className="-mx-3 overflow-x-auto px-3">
        <div
          className="w-full text-caption"
          // Rows per entrant, columns per day: a long season scrolls rather
          // than squeezing its days into a smear. 210 is the axis + names.
          style={{
            height: Math.max(384, ids.length * 26 + 40),
            minWidth: Math.max(560, days.length * 40 + 210),
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              // Room on the right for the names.
              margin={{ top: 8, right: 170, bottom: 0, left: -12 }}
              onMouseLeave={() => setHover(null)}
            >
              <CartesianGrid
                stroke={chart.grid}
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="day"
                tickFormatter={shortDay}
                stroke={chart.axis}
                tick={{ fill: chart.axis, fontSize: 12 }}
                axisLine={{ stroke: chart.grid }}
                tickLine={false}
                minTickGap={24}
              />
              <YAxis
                yAxisId="pos"
                reversed
                domain={[1, ids.length]}
                ticks={ids.map((_, i) => i + 1)}
                interval={0}
                stroke={chart.axis}
                tick={{ fill: chart.axis, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip
                contentStyle={chart.tooltip}
                labelFormatter={(day) => shortDay(String(day))}
                content={({ active, label, payload }) => {
                  if (!active || !payload?.length) return null;
                  const shown = payload
                    .filter((p) =>
                      legend.includes(Number(String(p.dataKey).slice(1))),
                    )
                    .sort((a, b) => Number(a.value) - Number(b.value));
                  return (
                    <div style={chart.tooltip} className="px-3 py-2">
                      <p className="mb-1 text-ink-faint">
                        {shortDay(String(label))}
                      </p>
                      {shown.map((p) => {
                        const id = Number(String(p.dataKey).slice(1));
                        return (
                          <p
                            key={id}
                            className="flex items-center gap-2 tabular-nums"
                          >
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ background: p.stroke }}
                              aria-hidden
                            />
                            <span className="w-5 font-mono text-ink">
                              {p.value}
                            </span>
                            <span className="text-ink-soft">{nameOf(id)}</span>
                          </p>
                        );
                      })}
                    </div>
                  );
                }}
              />
              {order.map((id) => {
                const lit = id === focus;
                const colour = colourOf.get(id);
                const stroke = lit
                  ? (colour ?? chart.series.games)
                  : (colour ?? chart.axis);
                const opacity =
                  focus !== null && !lit ? 0.2 : colour ? 1 : 0.35;
                return (
                  <Line
                    key={id}
                    yAxisId="pos"
                    dataKey={`p${id}`}
                    name={nameOf(id)}
                    type="linear"
                    stroke={stroke}
                    strokeWidth={lit ? 4.5 : colour ? 3.5 : 2}
                    strokeOpacity={opacity}
                    // A dot per matchday: each is where that day left them.
                    dot={{
                      r: lit ? 4 : colour ? 3.5 : 2.5,
                      fill: stroke,
                      fillOpacity: opacity,
                      strokeWidth: 0,
                    }}
                    activeDot={lit || colour ? { r: 4 } : false}
                    label={(p) =>
                      p.index === last ? (
                        nameTag(id, Number(p.x), Number(p.y))
                      ) : (
                        <g />
                      )
                    }
                    isAnimationActive={false}
                    onMouseEnter={() => setHover(id)}
                    onClick={() => highlight?.toggle(id)}
                    style={{ cursor: "pointer" }}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
