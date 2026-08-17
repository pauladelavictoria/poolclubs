import { useEffect, useState } from "react";
import { LuShare2, LuSmartphone, LuX } from "react-icons/lu";
import { Card } from "@/components/ui/Card";
import { Button, IconButton } from "@/components/ui/Button";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import {
  consumeJustJoinedClub,
  dismissInstallPromptForever,
  isInstallPromptDismissed,
} from "@/libs/installPrompt";
import { useT } from "@/i18n";

/**
 * Shown once, right after joining or creating a club: the first moment there
 * is a reason to come back tomorrow is the moment "put it on your home
 * screen" actually lands, rather than as a cold ask on the very first visit.
 *
 * Chrome/Edge on Android and desktop get a real install button, wired to the
 * browser's own `beforeinstallprompt`. iOS never fires that event — Add to
 * Home Screen there only exists behind the Share sheet, so the best this can
 * do is point at it. Anywhere else (desktop Safari, Firefox) there is
 * nothing to offer, so the banner stays hidden.
 */
export default function InstallAppBanner() {
  const { t } = useT();
  const { installed, canPromptNative, isIOS, promptInstall } =
    useInstallPrompt();
  // Server has no sessionStorage, so this has to start false to match the
  // markup it rendered — an effect, not a lazy initializer, is what defers
  // the real (client-only) answer to after hydration instead of mismatching it.
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (installed || isInstallPromptDismissed()) return;
    if (consumeJustJoinedClub())
      // eslint-disable-next-line react-hooks/set-state-in-effect -- deferring to after hydration is the point, see `visible` above
      setVisible(true);
  }, [installed]);

  const dismiss = () => {
    setVisible(false);
    dismissInstallPromptForever();
  };

  if (!visible || installed || (!canPromptNative && !isIOS)) return null;

  return (
    <Card className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom)+0.75rem)] z-50 overflow-hidden shadow-lg md:inset-x-auto md:bottom-4 md:right-4 md:w-96">
      <div className="flex items-start gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-felt-raised text-ink-faint">
          <LuSmartphone className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-body font-medium text-ink">
            {t("installPrompt.title")}
          </p>
          <p className="mt-0.5 text-caption text-ink-faint">
            {isIOS ? (
              <>
                {t("installPrompt.iosBody")}{" "}
                <LuShare2
                  className="inline h-3.5 w-3.5 align-[-2px]"
                  aria-hidden
                />
              </>
            ) : (
              t("installPrompt.body")
            )}
          </p>
          {!isIOS && (
            <Button
              size="sm"
              className="mt-3"
              onClick={() => promptInstall().then(dismiss)}
            >
              {t("installPrompt.install")}
            </Button>
          )}
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
