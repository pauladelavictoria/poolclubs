import { useState } from "react";
import { toast } from "react-toastify";
import { LuSwords } from "react-icons/lu";
import { useAuth } from "@/hooks/useAuth";
import { useGetChallenges, useManageChallenges } from "@/hooks/useChallenges";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useT } from "@/i18n";

/**
 * Challenge someone, from wherever their name appears. The note field is
 * optional and inline — a modal for one text box is a modal too many.
 */
export default function ChallengeButton({
  toPlayerId,
  size = "sm",
  isHere = false,
}: {
  toPlayerId: number;
  size?: "sm" | "md";
  /** They are at the club right now. Same mutation either way — this only
   *  changes what the button says, because "challenge" reads as a message to
   *  answer later and the answer here is that they are stood by the table.
   *  Passed in rather than looked up: this button appears once per row on a
   *  roster, and a clock hook in each of them is a timer in each of them. */
  isHere?: boolean;
}) {
  const { t } = useT();
  const { player } = useAuth();
  const { data: challenges } = useGetChallenges();
  const { sendChallenge } = useManageChallenges();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");

  // No point challenging yourself, and no point stacking a second one on an
  // open thread.
  if (!player || player.id === toPlayerId) return null;

  const existing = (challenges ?? []).find(
    (c) =>
      ["pending", "accepted"].includes(c.status) &&
      ((c.from_player_id === player.id && c.to_player_id === toPlayerId) ||
        (c.to_player_id === player.id && c.from_player_id === toPlayerId)),
  );

  if (existing) {
    return (
      <span className="shrink-0 text-caption text-ink-faint">
        {t(
          existing.status === "accepted" ? "challenge.on" : "challenge.waiting",
        )}
      </span>
    );
  }

  if (!open) {
    return (
      <Button size={size} className="shrink-0" onClick={() => setOpen(true)}>
        <LuSwords className="h-4 w-4" aria-hidden />
        {t(isHere ? "challenge.playNow" : "challenge.send")}
      </Button>
    );
  }

  return (
    <form
      className="flex w-full items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        sendChallenge.mutate(
          { toPlayerId, message },
          {
            onSuccess: () => {
              toast.success(t(isHere ? "challenge.sentHere" : "challenge.sent"));
              setMessage("");
              setOpen(false);
            },
            onError: () => toast.error(t("common.error")),
          },
        );
      }}
    >
      <Input
        autoFocus
        value={message}
        maxLength={500}
        placeholder={t("challenge.messagePlaceholder")}
        onChange={(e) => setMessage(e.target.value)}
        className="h-9"
      />
      <Button type="submit" size="sm" disabled={sendChallenge.isPending}>
        {t("challenge.send")}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => setOpen(false)}
      >
        {t("common.cancel")}
      </Button>
    </form>
  );
}
