import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LuX } from "react-icons/lu";
import { IconButton } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { searchGifs } from "@/libs/server/gifs.functions";
import { keys } from "@/libs/queryKeys";
import { useT } from "@/i18n";

/**
 * Search Klipy and pick one GIF. Picking is sending — a GIF comment has no
 * text to add, so there is no second step to confirm it.
 *
 * Opens on billiards GIFs rather than an empty box (see searchGifs), so the
 * common case is one tap.
 */
export function GifPicker({
  onPick,
  onClose,
}: {
  onPick: (url: string) => void;
  onClose: () => void;
}) {
  const { t } = useT();
  const [text, setText] = useState("");
  // Same debounce as ClubLocationPicker: a fetch when the typing stops, not
  // per keystroke.
  const [term, setTerm] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setTerm(text.trim()), 300);
    return () => clearTimeout(id);
  }, [text]);

  const { data: gifs, isFetching } = useQuery({
    queryKey: keys.gifs.for(term),
    queryFn: () => searchGifs({ data: { q: term } }),
    staleTime: 5 * 60_000,
  });

  return (
    <div className="mt-2 rounded-control border border-hairline bg-felt-raised p-2">
      <div className="flex items-center gap-2">
        <Input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
          }}
          maxLength={50}
          placeholder={t("social.gifSearch")}
          aria-label={t("social.gifSearch")}
          className="h-9"
        />
        <IconButton
          type="button"
          label={t("common.cancel")}
          size="sm"
          onClick={onClose}
        >
          <LuX className="h-4 w-4" />
        </IconButton>
      </div>

      <div className="mt-2 grid max-h-64 grid-cols-3 gap-1.5 overflow-y-auto sm:grid-cols-4">
        {gifs?.map((gif) => (
          <button
            key={gif.id}
            type="button"
            onClick={() => onPick(gif.url)}
            className="aspect-square overflow-hidden rounded-control bg-pocket transition-opacity duration-150 hover:opacity-80"
          >
            <img
              src={gif.preview}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </button>
        ))}
      </div>
      {gifs?.length === 0 && !isFetching && (
        <p className="py-4 text-center text-body text-ink-ghost">
          {t("social.gifEmpty")}
        </p>
      )}

      {/* Klipy's terms ask for attribution where its search is used. */}
      <p className="mt-1.5 text-right text-caption text-ink-ghost">
        Powered by KLIPY
      </p>
    </div>
  );
}
