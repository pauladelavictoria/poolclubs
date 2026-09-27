import { toast } from "react-toastify";
import { LuCopy } from "react-icons/lu";
import { useT } from "@/i18n";

/** A one-line command with a copy button — commands here are pasted into a
 *  terminal, and retyping a sed expression is where they go wrong. */
export function StreamerCommand({ text }: { text: string }) {
  const { t } = useT();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("club.copied"));
    } catch {
      toast.error(t("club.copyError"));
    }
  };
  return (
    <div className="flex items-start gap-2 rounded-control bg-pocket p-2">
      <code className="min-w-0 flex-1 overflow-x-auto whitespace-pre font-mono text-caption text-ink">
        {text}
      </code>
      <button
        type="button"
        onClick={copy}
        aria-label={t("club.copy")}
        className="shrink-0 text-ink-faint hover:text-ink"
      >
        <LuCopy className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
