import { LuPlus, LuX } from "react-icons/lu";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import {
  ALL_DAY,
  WEEKDAYS,
  allWeek,
  isAllDay,
  isAlwaysOpen,
  type Range,
  type Schedule,
  type Weekday,
} from "@/libs/algorithms/schedule";
import { useT, type Key } from "@/i18n";

/**
 * Opening hours, seven rows of them.
 *
 * Staged, not self-saving — same contract as ClubLogoUpload: it hands the whole
 * schedule back on every edit and the settings form's one Save button commits
 * it. That is what lets the Collapsible above it show what the hours will be
 * rather than what they were.
 *
 * Native `<input type="time">`, so the picker, the keyboard behaviour and the
 * locale's own 12- or 24-hour display come from the platform. It hands back
 * "HH:MM" in every browser regardless of what it displays, which is exactly the
 * shape stored — see libs/algorithms/schedule.ts.
 *
 * ponytail: no validation that a range makes sense beyond what the input
 * enforces. An end before its start is a *legal* schedule here — it means the
 * night runs past midnight, which is most Fridays — so there is nothing to
 * reject, and overlapping ranges are the admin's business.
 */
export default function ClubScheduleEditor({
  value,
  onChange,
  disabled,
}: {
  value: Schedule;
  onChange: (next: Schedule) => void;
  disabled?: boolean;
}) {
  const { t } = useT();

  /** Rewrite one day, dropping it entirely when its last range goes: an empty
   *  day and an absent day both mean closed, and only one of them is stored. */
  const setDay = (day: Weekday, ranges: Range[]) => {
    const next = { ...value };
    if (ranges.length > 0) next[day] = ranges;
    else delete next[day];
    onChange(next);
  };

  const always = isAlwaysOpen(value);

  return (
    <div className="space-y-3">
      {/* The case two time inputs cannot express. Without it people reach for
          00:00–23:00, which is a club that shuts for an hour every night. */}
      <Toggle
        checked={always}
        onChange={(on) => onChange(on ? allWeek() : {})}
        label={t("club.schedule.always")}
        hint={t("club.schedule.alwaysHint")}
        disabled={disabled}
      />

      {!always &&
        WEEKDAYS.map((day) => {
          const ranges = value[day] ?? [];
          const allDay = isAllDay(ranges);
          return (
            <div key={day} className="flex flex-wrap items-center gap-2">
              <span className="w-24 shrink-0 text-body text-ink-soft">
                {t(`club.schedule.day.${day}` as Key)}
              </span>

              {ranges.length === 0 && (
                <span className="text-caption text-ink-faint">
                  {t("club.schedule.closed")}
                </span>
              )}

              {/* Rendered as a chip rather than two inputs both reading 00:00,
                which looks like a mistake somebody should correct. */}
              {allDay && (
                <span className="flex items-center gap-1">
                  <span className="rounded-control border border-hairline bg-pocket px-2 py-1 text-body text-ink">
                    {t("club.schedule.allDay")}
                  </span>
                  <button
                    type="button"
                    disabled={disabled}
                    aria-label={t("club.schedule.removeRange")}
                    onClick={() => setDay(day, [])}
                    className="flex h-7 w-7 items-center justify-center rounded-control text-ink-faint transition-colors duration-150 hover:bg-felt hover:text-ink"
                  >
                    <LuX className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </span>
              )}

              {!allDay &&
                ranges.map(([from, to], i) => (
                  // Keyed by position: the ranges of a day have no id, and the only
                  // edits are "change this one" and "remove this one", both of which
                  // are positional anyway.
                  <span key={i} className="flex items-center gap-1">
                    <TimeInput
                      label={t("club.schedule.from")}
                      value={from}
                      disabled={disabled}
                      onChange={(v) =>
                        setDay(
                          day,
                          ranges.map((r, j) => (j === i ? [v, r[1]] : r)),
                        )
                      }
                    />
                    <span aria-hidden className="text-ink-faint">
                      –
                    </span>
                    <TimeInput
                      label={t("club.schedule.to")}
                      value={to}
                      disabled={disabled}
                      onChange={(v) =>
                        setDay(
                          day,
                          ranges.map((r, j) => (j === i ? [r[0], v] : r)),
                        )
                      }
                    />
                    <button
                      type="button"
                      disabled={disabled}
                      aria-label={t("club.schedule.removeRange")}
                      onClick={() =>
                        setDay(
                          day,
                          ranges.filter((_, j) => j !== i),
                        )
                      }
                      className="flex h-7 w-7 items-center justify-center rounded-control text-ink-faint transition-colors duration-150 hover:bg-felt hover:text-ink"
                    >
                      <LuX className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </span>
                ))}

              {!allDay && (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={disabled}
                    aria-label={t("club.schedule.addRange")}
                    // A first range starts on a plausible evening rather than
                    // 00:00 — the club is being described, and midnight to
                    // midnight is never what anyone meant by typing.
                    onClick={() => setDay(day, [...ranges, ["17:00", "23:00"]])}
                  >
                    <LuPlus className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                  {/* One day open around the clock, for a club that does it at
                    weekends but not all week. */}
                  {ranges.length === 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={disabled}
                      onClick={() => setDay(day, [[...ALL_DAY] as Range])}
                    >
                      {t("club.schedule.allDay")}
                    </Button>
                  )}
                </>
              )}
            </div>
          );
        })}
    </div>
  );
}

function TimeInput({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <input
      type="time"
      aria-label={label}
      value={value}
      disabled={disabled}
      // Clearing the field yields "", which is not a time. Ignored rather than
      // stored: parseSchedule would drop it on the way back out anyway, and
      // silently losing the row someone was halfway through editing is worse.
      onChange={(e) => e.target.value && onChange(e.target.value)}
      className="h-8 rounded-control border border-hairline bg-pocket px-2 text-body tabular-nums text-ink transition-colors duration-150 hover:border-hairline-strong disabled:opacity-50"
    />
  );
}
