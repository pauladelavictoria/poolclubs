import { LuPlay } from "react-icons/lu";
import { useT } from "@/i18n";
import { IconButton } from "@/components/ui/Button";

/** The watch button a fixture carries when it has video. `relative` lifts it
 *  over GameLinkOverlay, like the names. */
export function WatchButton({ onWatch }: { onWatch: () => void }) {
  const { t } = useT();
  return (
    <IconButton
      label={t("live.watch")}
      title={t("live.watch")}
      size="sm"
      shape="circle"
      onClick={(e) => {
        e.stopPropagation();
        onWatch();
      }}
      className="relative shrink-0 text-strike"
    >
      <LuPlay className="h-3.5 w-3.5" aria-hidden />
    </IconButton>
  );
}
