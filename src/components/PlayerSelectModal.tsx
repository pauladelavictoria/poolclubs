import { useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "@/hooks/useAuth";
import { useGetPlayers } from "@/hooks/useGetPlayers";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { useT } from "@/i18n";

export default function PlayerSelectModal() {
  const { t } = useT();
  const { user, player, isLoading, isPlayerLoading, linkPlayer } = useAuth();
  const { data: players, isLoading: playersLoading } = useGetPlayers();
  const [selectedId, setSelectedId] = useState<string>("");
  const [isLinking, setIsLinking] = useState(false);

  if (!user || isLoading || isPlayerLoading || player) return null;

  const handleLink = async () => {
    if (!selectedId) return;
    setIsLinking(true);
    try {
      await linkPlayer(Number(selectedId));
      toast.success(t("auth.linked"));
    } catch {
      toast.error(t("auth.linkError"));
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="link-player-title"
        className="w-full max-w-md rounded-t-sheet border border-hairline bg-felt p-5 sm:rounded-sheet"
      >
        <h2
          id="link-player-title"
          className="text-h3 font-semibold text-ink"
        >
          {t("auth.whoAreYou")}
        </h2>
        <p className="mt-1 max-w-[42ch] text-body text-ink-soft">
          {t("auth.linkIntro")}
        </p>

        <div className="mt-5 space-y-1.5">
          <Label htmlFor="link-player">{t("ranking.player")}</Label>
          <Select
            id="link-player"
            disabled={playersLoading}
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            <option value="">{t("auth.selectPlayer")}</option>
            {players?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({t("category.short", { n: p.category })})
              </option>
            ))}
          </Select>
        </div>

        <Button
          className="mt-5 w-full"
          onClick={handleLink}
          disabled={!selectedId || isLinking}
        >
          {isLinking ? t("auth.linking") : t("auth.confirm")}
        </Button>
      </div>
    </div>
  );
}
