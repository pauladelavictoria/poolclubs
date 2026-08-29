import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import type { ClubSchedule, ClubScheduleDay } from "@/types";
import { useT } from "@/i18n";

const DAYS: ClubScheduleDay[] = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
];

/**
 * One free-text field per day rather than a time-range picker: "10:00-22:00",
 * "Cerrado", "Solo socios" and "9-14 / 17-21" are all things a real club
 * schedule says, and a picker only knows how to represent the first one.
 */
export default function ClubScheduleEditor({
  value,
  onChange,
  disabled,
}: {
  value: ClubSchedule;
  onChange: (schedule: ClubSchedule) => void;
  disabled?: boolean;
}) {
  const { t } = useT();

  const setDay = (day: ClubScheduleDay, text: string) => {
    const next = { ...value };
    if (text.trim()) next[day] = text;
    else delete next[day];
    onChange(next);
  };

  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      {DAYS.map((day) => (
        <div key={day} className="space-y-1">
          <Label htmlFor={`schedule-${day}`}>{t(`club.schedule.${day}`)}</Label>
          <Input
            id={`schedule-${day}`}
            value={value[day] ?? ""}
            placeholder={t("club.schedule.placeholder")}
            maxLength={60}
            disabled={disabled}
            onChange={(e) => setDay(day, e.target.value)}
          />
        </div>
      ))}
    </div>
  );
}
