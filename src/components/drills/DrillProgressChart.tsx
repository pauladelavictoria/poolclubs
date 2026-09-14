import { Suspense, lazy } from "react";
import type { DrillLog } from "@/types";
import { Card, CardHeader } from "@/components/ui/Card";
import { useT } from "@/i18n";

/**
 * Lazy wrapper around the recharts-based chart, same reason as MapView:
 * recharts is a large module and this chart is used on one page, but a
 * static import here would put it in the shared chunk every route pulls in.
 * The fallback matches the real card's shape so there's no layout jump.
 */

interface DrillProgressChartProps {
  logs: DrillLog[];
  title?: string;
}

const DrillProgressChartInner = lazy(() => import("./DrillProgressChartInner"));

export default function DrillProgressChart(props: DrillProgressChartProps) {
  const { t } = useT();

  return (
    <Suspense
      fallback={
        <Card className="overflow-hidden">
          <CardHeader title={props.title ?? t("training.chartTitle")} />
          <div className="h-64 w-full p-3 text-caption md:h-80" />
        </Card>
      }
    >
      <DrillProgressChartInner {...props} />
    </Suspense>
  );
}
