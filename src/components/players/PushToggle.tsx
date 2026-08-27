import { toast } from "react-toastify";
import { Card } from "@/components/ui/Card";
import { Toggle } from "@/components/ui/Toggle";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { useT } from "@/i18n";

/**
 * The switch for web push, per device.
 *
 * PushConsentModal is the ask; this is where the decision lives afterwards,
 * including for whoever closed that modal for good. Its own card, outside the
 * name form, because flipping it takes effect immediately — there is nothing
 * here to save.
 *
 * A device, not an account: the row is keyed by push endpoint, so turning this
 * on your phone says nothing about your laptop. The hint says so.
 */
export default function PushToggle() {
  const { t } = useT();
  const { supported, permission, enabled, busy, enable, disable } =
    usePushNotifications();
  const { installed, isIOS } = useInstallPrompt();

  // iPhone allows web push only once the app is on the home screen, so there is
  // something useful to say. Everywhere else, an unsupported browser is not the
  // player's problem and the card just isn't there.
  if (!supported) {
    if (!isIOS || installed) return null;
    return (
      <Card className="p-4">
        <p className="text-body text-ink">{t("push.title")}</p>
        <p className="mt-0.5 text-caption text-ink-faint">
          {t("push.iosHint")}
        </p>
      </Card>
    );
  }

  // Nothing can re-open a permission the browser has been told to refuse — it is
  // a browser setting now, not ours.
  const blocked = permission === "denied";

  const toggle = (next: boolean) => {
    // Called straight out of the checkbox's change handler, so the permission
    // prompt inside enable() is still inside the user's gesture.
    void (next ? enable() : disable()).catch(() =>
      toast.error(t("common.error")),
    );
  };

  return (
    <Card className="p-4">
      <Toggle
        checked={enabled}
        onChange={toggle}
        label={t("push.title")}
        hint={blocked ? t("push.blocked") : t("push.hint")}
        disabled={busy || blocked}
      />
    </Card>
  );
}
