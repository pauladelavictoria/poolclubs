import { BallGlyph } from "@/components/ui/Ball";
import { CLUB_BALL_COLORS, type BallColor } from "@/types";
import { useT } from "@/i18n";

/**
 * The palette is exactly the rack: solids 1-7 plus the 8, in that order,
 * drawn as the same ball the drill editor draws. Picking one is instant —
 * there is nothing to review before it takes effect, the same as the
 * language row and the theme toggle in the nav drawer.
 */
export default function ClubThemePicker({
  value,
  onChange,
  disabled,
}: {
  value: BallColor;
  onChange: (color: BallColor) => void;
  disabled?: boolean;
}) {
  const { t } = useT();

  return (
    <div
      role="radiogroup"
      aria-label={t("club.branding.colorLabel")}
      className="grid grid-cols-4 gap-2 sm:grid-cols-8"
    >
      {CLUB_BALL_COLORS.map((color, i) => (
        <button
          key={color}
          type="button"
          role="radio"
          aria-checked={value === color}
          aria-label={t(`club.branding.ball.${color}`)}
          title={t(`club.branding.ball.${color}`)}
          disabled={disabled}
          onClick={() => onChange(color)}
          className={[
            "flex aspect-square items-center justify-center rounded-control border p-2",
            "transition-colors duration-150",
            value === color
              ? "border-strike bg-strike-tint"
              : "border-hairline hover:border-hairline-strong",
            "disabled:cursor-not-allowed disabled:opacity-50",
          ].join(" ")}
        >
          <BallGlyph
            color={color}
            label={String(i + 1)}
            className="h-14 w-14"
          />
        </button>
      ))}
    </div>
  );
}
