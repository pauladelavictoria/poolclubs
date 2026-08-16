import { LuShare2 } from "react-icons/lu";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/Button";
import { useT } from "@/i18n";

/**
 * Hand this page to somebody. Same two-step as the club invite in NavDrawer: the
 * native share sheet where there is one, the clipboard where there isn't.
 *
 * Labelled rather than an icon on its own, unlike the app's chrome: sharing is
 * one of the two things a public profile is for, and a bare glyph in the corner
 * is not an invitation.
 *
 * The URL comes from the caller rather than `window.location`, because a public
 * profile is rendered on the server first and the absolute link is already built
 * there for og:url — one source for the link that is shared and the link that is
 * previewed.
 */
export default function ShareButton({
  title,
  url,
  text,
}: {
  title: string;
  url: string;
  text?: string;
}) {
  const { t } = useT();

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch {
        // Share sheet dismissed — nothing to recover.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("public.share.copied"));
    } catch {
      toast.error(t("public.share.copyError"));
    }
  };

  return (
    <Button variant="secondary" size="sm" onClick={share}>
      <LuShare2 className="h-4 w-4" aria-hidden />
      {t("public.share.label")}
    </Button>
  );
}
