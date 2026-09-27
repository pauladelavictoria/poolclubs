import { type ReactNode } from "react";
import { LuChevronDown, LuSettings } from "react-icons/lu";

/**
 * The organiser's controls. A native <details> — click to open, Esc, no state
 * and no outside-click listener — with a dashed edge, so it reads as scaffolding
 * around the tournament rather than another part of it.
 */
export function TournamentManagePanel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <details className="group rounded-card border border-dashed border-hairline">
      <summary className="flex h-11 cursor-pointer list-none items-center gap-2 px-4 text-caption font-medium uppercase tracking-[0.08em] text-ink-faint transition-colors duration-150 hover:text-ink-soft [&::-webkit-details-marker]:hidden">
        <LuSettings className="h-4 w-4" aria-hidden />
        {title}
        <LuChevronDown
          className="ml-auto h-4 w-4 transition-transform duration-150 group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="space-y-3 border-t border-dashed border-hairline p-4">
        {children}
      </div>
    </details>
  );
}
