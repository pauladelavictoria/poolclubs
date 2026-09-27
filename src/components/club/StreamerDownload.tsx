import { LuDownload } from "react-icons/lu";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { type StreamerFile } from "@/libs/algorithms/streamerSetup";
import { useT } from "@/i18n";

/** A generated file as a real download: a data: URL, since the content is
 *  already here and a server route would only hand the same bytes back. */
export function StreamerDownload({ file }: { file: StreamerFile }) {
  const { t } = useT();
  return (
    <a
      href={`data:text/plain;charset=utf-8,${encodeURIComponent(file.content)}`}
      download={file.name}
      className={buttonClasses({ variant: "primary", size: "sm" })}
    >
      <LuDownload className="h-4 w-4" aria-hidden />
      {t("club.streamer.download", { file: file.name })}
    </a>
  );
}
