import { useState } from "react";
import { LuShare2, LuSmartphone, LuX } from "react-icons/lu";
import { Button, IconButton } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import type { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { dismissInstallPromptForever } from "@/libs/browser/installPrompt";
import { useDialog } from "@/hooks/useDialog";
import { useT } from "@/i18n";

/**
 * Add PoolClubs to the home screen, asked once per app open.
 *
 * Every launch until it is answered, rather than once after joining a club: an
 * installed app is what makes the club a tap away instead of a bookmark, and on
 * iOS it is the hard prerequisite for notifications — web push does not exist
 * there until the app is on the home screen. So the offer keeps coming back
 * until it is either taken or explicitly refused.
 *
 * Closing it is not refusing it. Only the checkbox is persisted; see
 * libs/browser/installPrompt.ts for why that asymmetry is deliberate.
 *
 * Whether it is open is AppPrompts' decision, not this component's — it is the
 * one that knows this modal has to go before the notification one.
 */
export default function InstallAppModal({
  open,
  prompt,
  onClose,
}: {
  open: boolean;
  prompt: ReturnType<typeof useInstallPrompt>;
  onClose: () => void;
}) {
  const { t } = useT();
  const { isIOS, promptInstall } = prompt;
  const [never, setNever] = useState(false);

  // The <dialog> always renders. A closed one draws nothing, and having the
  // element there unconditionally means showModal() can never be asked to run
  // before it exists — which is what went wrong when the render was gated on
  // `canPromptNative`, a value that only arrives once the browser fires
  // beforeinstallprompt, several renders in.
  const ref = useDialog(open);

  const dismiss = () => {
    onClose();
    // Only the box is remembered. Esc, the backdrop and the X are all "not now",
    // and all of them let it ask again next launch.
    if (never) dismissInstallPromptForever();
  };

  return (
    <dialog
      ref={ref}
      className="sheet m-0 mt-auto w-full max-w-none sm:max-w-md rounded-t-sheet border border-hairline bg-felt p-5 text-ink sm:m-auto sm:rounded-sheet"
      aria-label={t("installPrompt.title")}
      onClose={dismiss}
      onClick={(e) => {
        if (e.target === ref.current) dismiss();
      }}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-felt-raised text-ink-faint">
          <LuSmartphone className="h-5 w-5" aria-hidden />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-h4 font-semibold text-ink">
            {t("installPrompt.title")}
          </h2>
          <p className="mt-1 text-body text-ink-soft">
            {isIOS ? (
              <>
                {t("installPrompt.iosBody")}{" "}
                <LuShare2 className="inline h-4 w-4 align-[-3px]" aria-hidden />
              </>
            ) : (
              t("installPrompt.body")
            )}
          </p>
        </div>

        <IconButton
          label={t("common.close")}
          size="sm"
          onClick={dismiss}
          className="-mr-1 -mt-1 shrink-0"
        >
          <LuX className="h-4 w-4" aria-hidden />
        </IconButton>
      </div>

      {/* iOS has no programmatic Add to Home Screen, so there is no button to
          offer there — only the Share-sheet instruction above. */}
      {!isIOS && (
        <Button
          className="mt-5 w-full"
          // Installing is an answer, and `installed` flips on appinstalled, so
          // the modal has no reason to come back after this.
          onClick={() => promptInstall().then(dismiss)}
        >
          {t("installPrompt.install")}
        </Button>
      )}

      <div className="mt-4 border-t border-hairline pt-4">
        <Toggle
          checked={never}
          onChange={setNever}
          label={t("installPrompt.dontShowAgain")}
        />
      </div>
    </dialog>
  );
}
