import type { ReactNode } from "react";
import type { LinkProps } from "@tanstack/react-router";
import { timeOf } from "@/libs/algorithms/dayLabel";
import { useT } from "@/i18n";
import { AppLink } from "@/components/layout/AppLink";

/**
 * Something was added to the club rather than played: a tournament opened, and
 * anything else with nothing to show for itself yet. Nobody scored anything, so
 * it gets no card — one dashed line on the canvas, which is what stops a page
 * of identical boxes.
 */
export default function CreatedRow({
  icon,
  label,
  name,
  to,
  params,
  at,
}: {
  icon: ReactNode;
  label: string;
  name: string;
  to: LinkProps["to"];
  params?: Record<string, string | number>;
  at: string;
}) {
  const { locale } = useT();

  return (
    <AppLink
      to={to}
      params={params}
      className="flex items-center gap-2.5 rounded-card border border-dashed border-hairline px-3 py-2 text-caption transition-colors duration-150 hover:border-hairline-strong hover:bg-felt"
    >
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0 flex-1 truncate">
        <span className="text-ink-faint">{label} · </span>
        <span className="font-medium text-ink">{name}</span>
      </span>
      <time
        dateTime={at}
        className="shrink-0 font-mono tabular-nums text-ink-ghost"
      >
        {timeOf(new Date(at), locale)}
      </time>
    </AppLink>
  );
}
