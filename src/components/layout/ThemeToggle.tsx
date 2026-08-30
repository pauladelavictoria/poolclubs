import { LuMoon, LuSun } from "react-icons/lu";
import { pickerClasses } from "@/components/ui/buttonStyles";
import { setTheme, useTheme } from "@/libs/theme/theme";
import { useT } from "@/i18n";

/**
 * Two states, one button, showing the one you are not in: a sun to go light, a
 * moon to go dark. Nothing to read — with two themes and those two glyphs the
 * label was saying what the icon already said, and it was saying it at three
 * times the width of the language buttons it now shares a row with.
 *
 * It wears the unselected pill from that row rather than the lit one. Sitting
 * beside three choices where one is on, a lit pill would claim to be a fourth
 * choice that is on; this is the one control in the row that acts rather than
 * reports. The name stays on `title` and `aria-label`.
 */
export default function ThemeToggle({
  className = "",
}: {
  className?: string;
}) {
  const { t } = useT();
  const theme = useTheme();
  const next = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={t(`theme.${next}`)}
      title={t(`theme.${next}`)}
      className={`${pickerClasses(false)} w-8 shrink-0 ${className}`}
    >
      {next === "light" ? (
        <LuSun className="h-4 w-4" aria-hidden />
      ) : (
        <LuMoon className="h-4 w-4" aria-hidden />
      )}
    </button>
  );
}
