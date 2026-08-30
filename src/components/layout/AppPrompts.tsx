import { useEffect, useState } from "react";
import InstallAppModal from "@/components/layout/InstallAppModal";
import PushConsentModal from "@/components/layout/PushConsentModal";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import {
  canOfferInstall,
  isInstallPromptDismissed,
} from "@/libs/browser/installPrompt";

/**
 * The two things the app asks for on the way in, one at a time.
 *
 * Both are asked on every app open until answered, so on a browser where both
 * apply they would open together — and two stacked native dialogs is nobody's
 * idea of a welcome. Install goes first: on iOS it is a prerequisite rather than
 * a parallel choice, because web push there does not exist until the app is on
 * the home screen.
 *
 * The order lives here rather than inside either modal because "wait your turn"
 * needs to mean *until the other one is closed*, not *while the other one could
 * ever appear*. Deriving it inside PushConsentModal, as this first did, blocked
 * the notification ask on every single launch of a desktop Chrome that was
 * offering an install nobody wanted — the install modal reappeared each time, so
 * its turn never ended and push was never asked at all.
 */
export default function AppPrompts() {
  const prompt = useInstallPrompt();
  // Assume refused until storage says otherwise: the server cannot read
  // localStorage, so this is the value it renders with and the one the client's
  // first paint has to agree with.
  const [dismissed, setDismissed] = useState(true);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deferring the storage read to after hydration is the point, see `dismissed` above
    setDismissed(isInstallPromptDismissed());
  }, []);

  const installOpen = !closed && !dismissed && canOfferInstall(prompt);

  return (
    <>
      <InstallAppModal
        open={installOpen}
        prompt={prompt}
        onClose={() => setClosed(true)}
      />
      <PushConsentModal blocked={installOpen} />
    </>
  );
}
