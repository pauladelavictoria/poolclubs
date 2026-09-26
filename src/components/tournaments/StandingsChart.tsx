import { Suspense, lazy, type ComponentProps } from "react";

/** Lazy for the same reason as DrillProgressChart: recharts is large, and a
 *  static import would put it in the chunk every tournament page pulls in. */
const StandingsChartInner = lazy(() => import("./StandingsChartInner"));

export default function StandingsChart(
  props: ComponentProps<typeof StandingsChartInner>,
) {
  return (
    <Suspense fallback={<div className="h-80 md:h-96" />}>
      <StandingsChartInner {...props} />
    </Suspense>
  );
}
