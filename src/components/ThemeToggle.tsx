import { LuMoon, LuSun } from "react-icons/lu";
import { setTheme, useTheme } from "@/libs/theme";
import { useT } from "@/i18n";

/**
 * Two states, one button: the icon shows where you are, the label says where
 * you'd land. Small enough to sit next to the language picker in the drawer
 * and in the landing footer, which are the only two places it appears.
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
      title={t(`theme.${next}`)}
      className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-control border border-hairline px-3 text-caption font-medium text-ink-faint transition-colors duration-150 hover:border-hairline-strong hover:text-ink ${className}`}
    >
      {theme === "dark" ? (
        <LuSun className="h-4 w-4" aria-hidden />
      ) : (
        <LuMoon className="h-4 w-4" aria-hidden />
      )}
      {t(`theme.${next}`)}
    </button>
  );
}
