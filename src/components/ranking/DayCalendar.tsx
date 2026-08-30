import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LuCalendar, LuChevronLeft, LuChevronRight } from "react-icons/lu";
import { useAuth } from "@/hooks/useAuth";
import { useOutsideClose } from "@/hooks/useOutsideClose";
import { gameDaysQuery } from "@/queries/games";
import { zoneOf } from "@/libs/algorithms/day";
import { fmt } from "@/libs/algorithms/dayLabel";
import { monthGrid, monthOf, shiftMonth } from "@/libs/algorithms/monthGrid";
import { useT } from "@/i18n";

/**
 * A month at a time, with a dot on every night that was actually played.
 *
 * The native `<input type="date">` next to this is still the way to jump to an
 * arbitrary date, and it stays: it is keyboard- and screen-reader-complete for
 * free and it works before hydration. What it cannot do is show *where the
 * games are*, and "which Thursday was that tournament" is the question people
 * actually arrive with. So this is additive — a second way in, not a
 * replacement.
 *
 * Nothing marks today. The page goes out of its way not to compute `new Date()`
 * during render (see the route's beforeLoad), because the server and the
 * browser can disagree about which day it is and a highlighted cell would flip
 * after hydration. The selected day is already in the URL and is what needs
 * showing.
 */
export default function DayCalendar({
  selected,
  onSelect,
}: {
  /** The day key the page is showing, "YYYY-MM-DD". */
  selected: string;
  onSelect: (day: string) => void;
}) {
  const { t, locale } = useT();
  const { activeClub, activeClubId } = useAuth();
  const [open, setOpen] = useState(false);
  // Which month is on screen, which is not which day is selected — you can page
  // back through March without leaving the night you are looking at.
  const [month, setMonth] = useState(() => monthOf(selected));
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClose(open, ref, () => setOpen(false));

  const tz = zoneOf(activeClub);
  // Only while the panel is open: a closed calendar is on every visit to this
  // page and the dots are worth nothing until somebody looks at them.
  const { data: played } = useQuery({
    ...gameDaysQuery(activeClubId, month, tz),
    enabled: open && activeClubId != null,
  });

  const cells = monthGrid(month);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => {
          // Reopening lands on the selected night rather than wherever the last
          // visit was left — the URL is the truth, not this component's state.
          if (!open) setMonth(monthOf(selected));
          setOpen(!open);
        }}
        aria-label={t("ranking.calendar")}
        aria-expanded={open}
        className="flex h-8 w-8 items-center justify-center rounded-control border border-hairline text-ink-soft transition-colors duration-150 hover:border-hairline-strong hover:text-ink"
      >
        <LuCalendar className="h-4 w-4" aria-hidden />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-72 max-w-[calc(100vw-1.5rem)] rounded-card border border-hairline bg-felt-raised p-3">
          <div className="flex items-center justify-between gap-2 pb-2">
            <MonthStep
              label={t("ranking.prevMonth")}
              onClick={() => setMonth(shiftMonth(month, -1))}
            >
              <LuChevronLeft className="h-4 w-4" aria-hidden />
            </MonthStep>
            {/* timeZone: "UTC" because the key is parsed as UTC midnight — in a
                negative offset the local formatter would name the month before. */}
            <p aria-live="polite" className="text-body font-medium text-ink">
              {fmt(locale, {
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              }).format(new Date(`${month}-01T00:00:00Z`))}
            </p>
            <MonthStep
              label={t("ranking.nextMonth")}
              onClick={() => setMonth(shiftMonth(month, 1))}
            >
              <LuChevronRight className="h-4 w-4" aria-hidden />
            </MonthStep>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {WEEKDAY_SAMPLE.map((day) => (
              <abbr
                key={day}
                // The full weekday as the title, the initial as the label —
                // seven letters is what fits, and a screen reader gets the word.
                title={weekday(locale, day, "long")}
                className="pb-1 text-center text-caption font-medium text-ink-faint no-underline"
              >
                {weekday(locale, day, "narrow")}
              </abbr>
            ))}

            {cells.map((day, i) =>
              day === null ? (
                // Keyed by position: a blank has no identity of its own, and
                // there are at most six of them at each end.
                <span key={`pad-${i}`} aria-hidden />
              ) : (
                <button
                  key={day}
                  type="button"
                  aria-current={day === selected ? "date" : undefined}
                  onClick={() => {
                    onSelect(day);
                    setOpen(false);
                  }}
                  className={[
                    "relative flex h-8 items-center justify-center rounded-control font-mono text-caption tabular-nums transition-colors duration-150",
                    day === selected
                      ? "bg-strike font-semibold text-pocket"
                      : "text-ink-soft hover:bg-felt hover:text-ink",
                  ].join(" ")}
                >
                  {Number(day.slice(8))}
                  {played?.has(day) && (
                    <span
                      className={[
                        "absolute bottom-1 h-1 w-1 rounded-full",
                        day === selected ? "bg-pocket" : "bg-strike",
                      ].join(" ")}
                      aria-hidden
                    />
                  )}
                </button>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MonthStep({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-control text-ink-soft transition-colors duration-150 hover:bg-felt hover:text-ink"
    >
      {children}
    </button>
  );
}

/** A week that starts on a Monday: 2024-01-01 was one. Only ever formatted, so
 *  the year is irrelevant — it exists to give Intl seven days to name. */
const WEEKDAY_SAMPLE = [1, 2, 3, 4, 5, 6, 7].map(
  (d) => `2024-01-0${d}T00:00:00Z`,
);

const weekday = (locale: string, iso: string, weekday: "narrow" | "long") =>
  fmt(locale, { weekday, timeZone: "UTC" }).format(new Date(iso));
