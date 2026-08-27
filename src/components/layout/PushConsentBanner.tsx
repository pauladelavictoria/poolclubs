import { useEffect, useState } from "react";
import { LuBellRing, LuX } from "react-icons/lu";
import { toast } from "react-toastify";
import { Card } from "@/components/ui/Card";
import { Button, IconButton } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useT } from "@/i18n";

/**
 * The ask. Nobody goes looking in their player settings for a feature they have
 * not heard of, so consent is requested where they already are: above the page,
 * beside the admin's join-request banner.
 *
 * Closing it is not the same as refusing it. With the checkbox off — its default
 * — this comes back next session, because "not now" is the commonest honest
 * answer to a permission prompt. Only ticking the box is a decision, and it is a
 * decision this respects for good. PushToggle in settings is where either
 * answer can be changed afterwards.
 */

/** Two keys, two lifetimes: one session, or forever. */
const HIDDEN_KEY = "pc:pushPromptHidden";
const DISMISSED_KEY = "pc:pushPromptDismissed";

export default function PushConsentBanner() {
  const { t } = useT();
  const { supported, permission, busy, enable } = usePushNotifications();
  const [visible, setVisible] = useState(false);
  const [never, setNever] = useState(false);

  // The server has no sessionStorage, so this has to start hidden to match the
  // markup it sent — an effect is what defers the real answer to after
  // hydration instead of rendering two different pages.
  useEffect(() => {
    try {
      if (
        sessionStorage.getItem(HIDDEN_KEY) === "1" ||
        localStorage.getItem(DISMISSED_KEY) === "1"
      )
        return;
    } catch {
      // A private window refuses to be read. Asking once too often is a much
      // smaller problem than throwing during render.
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deferring to after hydration is the point, see above
    setVisible(true);
  }, []);

  // Nothing to ask once the browser has an answer: granted means it is already
  // on, denied means no API of ours can re-open it.
  if (!visible || !supported || permission !== "default") return null;

  const dismiss = () => {
    setVisible(false);
    try {
      if (never) localStorage.setItem(DISMISSED_KEY, "1");
      else sessionStorage.setItem(HIDDEN_KEY, "1");
    } catch {
      // Same as above: forgetting that it was closed is survivable, throwing
      // out of the click that closed it is not.
    }
  };

  const turnOn = () => {
    // Straight out of the click, nothing awaited first: the permission prompt
    // has to stay inside the user's gesture. Safari will not show it otherwise.
    void enable().catch(() => toast.error(t("common.error")));
  };

  return (
    <Card className="mx-4 mt-4 overflow-hidden border-strike/40 bg-strike-tint md:mx-6">
      <div className="flex items-start gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-felt-raised text-strike">
          <LuBellRing className="h-5 w-5" aria-hidden />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-body font-medium text-ink">
            {t("push.bannerTitle")}
          </p>
          <p className="mt-0.5 text-caption text-ink-faint">
            {t("push.bannerBody")}
          </p>

          <Button size="sm" className="mt-3" onClick={turnOn} disabled={busy}>
            {t("push.bannerEnable")}
          </Button>

          <div className="mt-3 border-t border-hairline pt-3">
            <Toggle
              checked={never}
              onChange={setNever}
              label={t("push.dontShowAgain")}
            />
          </div>
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
    </Card>
  );
}
