import { useRef, useState } from "react";
import { toast } from "react-toastify";
import { supabase } from "@/supabaseClient";
import { queryClient } from "@/libs/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Avatar } from "@/components/ui/Avatar";
import { toAvatarDataUrl } from "@/libs/avatarImage";
import { useT } from "@/i18n";

/**
 * Your own picture, on your own profile. The file never leaves the browser as a
 * file — it is shrunk to a data URI (see libs/avatarImage) and written straight
 * onto the player row, so there is no bucket to configure.
 *
 * Every club writes the same picture: one person, one face, and the update is
 * keyed on user_id exactly as the OAuth sync in AuthContext is.
 */
export default function AvatarUpload({
  name,
  url,
}: {
  name: string;
  url: string | null;
}) {
  const { t } = useT();
  const { user, refreshMemberships } = useAuth();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (file: File | undefined) => {
    if (!file || !user) return;
    setBusy(true);
    try {
      const dataUrl = await toAvatarDataUrl(file);
      const { error } = await supabase
        .from("players")
        .update({ avatar_url: dataUrl })
        .eq("user_id", user.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["players"] });
      await refreshMemberships();
      toast.success(t("common.saved"));
    } catch {
      toast.error(t("players.avatarError"));
    } finally {
      setBusy(false);
      // Same file picked twice in a row still fires a change event.
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Avatar name={name} url={url} className="h-14 w-14" />
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        className="text-caption text-ink-soft underline underline-offset-2 disabled:text-ink-ghost"
      >
        {busy ? t("common.saving") : t("players.changePhoto")}
      </button>
    </div>
  );
}
