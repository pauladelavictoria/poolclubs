import { LuPencil } from "react-icons/lu";
import { Button } from "@/components/ui/Button";
import { useT } from "@/i18n";

/**
 * Editing stays available after the draw is cut: what a tournament says — its
 * name, its dates, what it costs, the notes the prizes live in — is not what
 * its fixtures were generated from, and only the latter is frozen. The form
 * hides the rest itself (TournamentForm's `locked`).
 */
export function TournamentEditButton({ onEdit }: { onEdit: () => void }) {
  const { t } = useT();
  return (
    <Button variant="secondary" onClick={onEdit}>
      <LuPencil className="h-4 w-4" aria-hidden />
      {t("common.edit")}
    </Button>
  );
}
