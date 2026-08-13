import { useRef, useState } from "react";
import { toast } from "react-toastify";
import { LuImageOff } from "react-icons/lu";
import { Button } from "@/components/ui/Button";
import { toLogoDataUrl } from "@/libs/logoImage";
import { useT } from "@/i18n";

/**
 * The club's own picture, staged in the single club settings form and
 * committed by that form's one Guardar button rather than saving itself.
 * Same shrink-in-the-browser approach as AvatarUpload — see
 * libs/logoImage.ts — except square-cornered rather than round, so it reads
 * as a mark rather than a face.
 */
export default function ClubLogoUpload({
  name,
  url,
  onChange,
  disabled,
}: {
  name: string;
  url: string | null;
  onChange: (dataUrl: string | null) => void;
  disabled?: boolean;
}) {
  const { t } = useT();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const dataUrl = await toLogoDataUrl(file);
      onChange(dataUrl);
    } catch {
      toast.error(t("club.branding.logoError"));
    } finally {
      setBusy(false);
      // Same file picked twice in a row still fires a change event.
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-4">
      <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-card border border-hairline bg-felt-raised">
        {url ? (
          <img
            src={url}
            alt=""
            className="h-full w-full bg-white object-cover"
          />
        ) : (
          <span aria-hidden className="text-h4 font-semibold text-ink-soft">
            {name.charAt(0).toUpperCase()}
          </span>
        )}
      </span>
      <div className="flex flex-wrap gap-2">
        <input
          ref={input}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0])}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={busy || disabled}
          onClick={() => input.current?.click()}
        >
          {t("club.branding.changeLogo")}
        </Button>
        {url && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy || disabled}
            onClick={() => onChange(null)}
          >
            <LuImageOff className="h-4 w-4" aria-hidden />
            {t("club.branding.removeLogo")}
          </Button>
        )}
      </div>
    </div>
  );
}
