import { useEffect, useState } from "react";
import { LuBellRing, LuX } from "react-icons/lu";
import { toast } from "react-toastify";
import { Button, IconButton } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useDialog } from "@/hooks/useDialog";
import {
  dismissPushPromptForever,
  isPushPromptDismissed,
} from "@/libs/browser/pushConsent";
import { useT } from "@/i18n";

/**
 * Turn on notifications, asked once per app open.
 *
 * Nobody goes looking in their player settings for a feature they have not heard
 * of, and a banner at the top of a scrolling page is the easiest thing in an app
 * to never read — so this asks in front of the page, every launch, until it is
 * answered. Granting ends it because the browser then has an answer; refusing at
 * the browser prompt ends it for the same reason.
 *
 * Closing it is not refusing it: only the checkbox is persisted. That asymmetry
 * is on purpose — flicking a dialog away is a reflex, and treating a reflex as a
 * permanent decision is how an app quietly loses a feature nobody ever actually
 * considered.
 */
export default function PushConsentModal({
  /** The install modal is up; wait until it is closed. AppPrompts owns that
   *  order, because "wait your turn" has to mean until the other one is gone. */
  blocked,
}: {
  blocked: boolean;
}) {
  const { t } = useT();
  const { supported, permission, busy, enable } = usePushNotifications();
  const [closed, setClosed] = useState(false);
  const [never, setNever] = useState(false);
  // Assume dismissed until storage says otherwise, so the server's markup (no
  // modal, since it cannot read localStorage) is also the client's first paint.
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deferring the storage read to after hydration is the point, see `dismissed` above
    setDismissed(isPushPromptDismissed());
  }, []);

  // Always rendered; a closed <dialog> draws nothing. That keeps showModal()
  // from ever being called before the element exists — `supported` is false
  // until after hydration, so gating the render on it opened nothing at all.
  const open =
    !closed && !dismissed && !blocked && supported && permission === "default";
  const ref = useDialog(open);

  const dismiss = () => {
    setClosed(true);
    if (never) dismissPushPromptForever();
  };

  const turnOn = () => {
    // Straight out of the click, nothing awaited first: the permission prompt
    // has to stay inside the user's gesture. Safari will not show it otherwise.
    void enable().catch(() => toast.error(t("common.error")));
  };

  return (
    <dialog
      ref={ref}
      className="sheet m-0 mt-auto w-full max-w-none sm:max-w-md rounded-t-sheet border border-hairline bg-felt p-5 text-ink sm:m-auto sm:rounded-sheet"
      aria-label={t("push.bannerTitle")}
      onClose={dismiss}
      onClick={(e) => {
        if (e.target === ref.current) dismiss();
      }}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-felt-raised text-strike">
          <LuBellRing className="h-5 w-5" aria-hidden />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-h4 font-semibold text-ink">
            {t("push.bannerTitle")}
          </h2>
          <p className="mt-1 text-body text-ink-soft">{t("push.bannerBody")}</p>
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

      <Button className="mt-5 w-full" onClick={turnOn} disabled={busy}>
        {t("push.bannerEnable")}
      </Button>

      <div className="mt-4 border-t border-hairline pt-4">
        <Toggle
          checked={never}
          onChange={setNever}
          label={t("push.dontShowAgain")}
        />
      </div>
    </dialog>
  );
}
