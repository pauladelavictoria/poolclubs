import { LuBanknote } from "react-icons/lu";
import { IconButton } from "@/components/ui/Button";
import { useT } from "@/i18n";

/** Whether an entrant has paid: a toggle for the club's admin, a mark for
 *  everyone else — and nothing at all for an unpaid entrant, whose absence of
 *  a mark says it. */
export function PaidMark({
  paid,
  canToggle,
  pending,
  onToggle,
}: {
  paid: boolean;
  canToggle: boolean;
  pending: boolean;
  onToggle: () => void;
}) {
  const { t } = useT();
  if (canToggle)
    return (
      <IconButton
        label={t("tournaments.paid")}
        title={t("tournaments.paid")}
        size="sm"
        disabled={pending}
        onClick={onToggle}
        shape="circle"
        className={
          paid
            ? "bg-strike text-pocket hover:bg-strike-light"
            : "text-ink-faint"
        }
      >
        <LuBanknote className="h-4 w-4" aria-hidden />
      </IconButton>
    );
  if (!paid) return null;
  return (
    <span
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-strike text-pocket"
      aria-label={t("tournaments.paid")}
      title={t("tournaments.paid")}
    >
      <LuBanknote className="h-4 w-4" aria-hidden />
    </span>
  );
}
