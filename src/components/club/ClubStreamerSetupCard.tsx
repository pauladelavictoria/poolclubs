import { useState } from "react";
import { toast } from "react-toastify";
import { LuCopy, LuDownload, LuMonitorPlay } from "react-icons/lu";
import { useAuth } from "@/hooks/useAuth";
import { useClubTables } from "@/hooks/useClubTables";
import { useClubStreams } from "@/hooks/useClubYoutube";
import { AppLink } from "@/components/layout/AppLink";
import { Card, CardHeader } from "@/components/ui/Card";
import { Segmented } from "@/components/ui/Segmented";
import { buttonClasses } from "@/components/ui/buttonStyles";
import {
  streamerFiles,
  type StreamerFile,
  type StreamerOs,
} from "@/libs/algorithms/streamerSetup";
import { useT } from "@/i18n";

/** Which tab opens first — the browser's own OS, which is usually but not
 *  always the streaming computer's (see ClubStreamingCard's
 *  detectScriptPlatform for the same caveat), so all three stay a tap away.
 *  A phone, or anything unrecognised, opens on Windows: most club PCs are. */
function detectOs(): StreamerOs {
  if (typeof navigator === "undefined") return "windows";
  const ua = navigator.userAgent;
  if (/android|iphone|ipad|ipod/i.test(ua)) return "windows";
  if (/mac os x|macintosh/i.test(ua)) return "mac";
  if (/linux/i.test(ua)) return "linux";
  return "windows";
}

const LINUX_INSTALL =
  "sudo add-apt-repository ppa:obsproject/obs-studio && sudo apt install obs-studio";
const MAC_AWAKE = "sudo pmset -a sleep 0 disksleep 0 autorestart 1";
const LINUX_LID =
  "sudo sed -i 's/^#\\?HandleLidSwitch=.*/HandleLidSwitch=ignore/; s/^#\\?HandleLidSwitchExternalPower=.*/HandleLidSwitchExternalPower=ignore/' /etc/systemd/logind.conf && sudo systemctl restart systemd-logind";

/**
 * How to set up the club's streaming computer, for the OS picked, with the
 * club's own table names already in every script: one OBS per table, each
 * started and stopped by its overlay (OverlayTablePage). The scripts come
 * from libs/algorithms/streamerSetup.ts and download as generated, so what an
 * admin runs is exactly what's shown under "Show what it does".
 */
export default function ClubStreamerSetupCard() {
  const { t } = useT();
  const { activeClub } = useAuth();
  const [os, setOs] = useState(detectOs);
  const { data: tables } = useClubTables();
  const { data: streams } = useClubStreams();

  // The tables that stream, once any do; every table before YouTube is set
  // up, so the guide is already right when it is.
  const streamed = new Set((streams ?? []).map((s) => s.table_id));
  const all = tables ?? [];
  const names = (
    streamed.size ? all.filter((tbl) => streamed.has(tbl.id)) : all
  ).map((tbl) => tbl.label);
  const files = names.length ? streamerFiles(os, names) : [];

  const steps: { title: string; body: React.ReactNode }[] = [
    {
      title: t("club.streamer.installTitle"),
      body:
        os === "linux" ? (
          <>
            <p>{t("club.streamer.installLinux")}</p>
            <Command text={LINUX_INSTALL} />
          </>
        ) : (
          <p>{t("club.streamer.installDownload")}</p>
        ),
    },
    {
      title: t("club.streamer.importTitle"),
      body: (
        <>
          {/* A plain <a>: the route answers with content-disposition:
              attachment, so this is a real file download, not app navigation. */}
          <a
            href={`/api/clubs/${activeClub.slug}/obs-scenes.json`}
            className={buttonClasses({ variant: "primary", size: "sm" })}
          >
            <LuDownload className="h-4 w-4" aria-hidden />
            {t("club.obs.download")}
          </a>
          <p>{t("club.streamer.importBody")}</p>
        </>
      ),
    },
    {
      title: t("club.streamer.permissionTitle"),
      body: <p>{t("club.streamer.permissionBody")}</p>,
    },
    {
      title: t("club.streamer.profilesTitle"),
      body: (
        <>
          <p>{t("club.streamer.profilesBody")}</p>
          <p className="text-ink-faint">{t("club.streamer.profileNames")}</p>
          <ul className="flex flex-wrap gap-1.5">
            {names.map((name) => (
              <li
                key={name}
                className="rounded-control bg-felt-raised px-2 py-0.5 font-mono text-ink"
              >
                {name}
              </li>
            ))}
          </ul>
        </>
      ),
    },
    {
      title: t("club.streamer.autostartTitle"),
      body: (
        <>
          <p>
            {t(
              os === "windows"
                ? "club.streamer.autostartWindows"
                : "club.streamer.autostartUnix",
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            {files.map((file) => (
              <Download key={file.name} file={file} />
            ))}
          </div>
          {os !== "windows" && (
            <Command text={`bash ~/Downloads/${files[0]?.name}`} />
          )}
          <details>
            <summary className="cursor-pointer text-ink-faint">
              {t("club.streamer.showScript")}
            </summary>
            {files.map((file) => (
              <div key={file.name} className="mt-2">
                <p className="font-mono text-ink-faint">{file.name}</p>
                <pre className="overflow-x-auto rounded-control bg-pocket p-2 font-mono text-caption text-ink">
                  {file.content}
                </pre>
              </div>
            ))}
          </details>
        </>
      ),
    },
    {
      title: t("club.streamer.awakeTitle"),
      body:
        os === "windows" ? (
          <p>{t("club.streamer.awakeWindows")}</p>
        ) : os === "mac" ? (
          <>
            <p>{t("club.streamer.awakeMac")}</p>
            <Command text={MAC_AWAKE} />
          </>
        ) : (
          <>
            <p>{t("club.streamer.awakeLinux")}</p>
            <Command text={LINUX_LID} />
          </>
        ),
    },
    {
      title: t("club.streamer.checkTitle"),
      body: <p>{t("club.streamer.checkBody")}</p>,
    },
  ];

  return (
    <Card>
      <CardHeader title={t("club.streamer.title")} />
      <div className="space-y-4 p-4">
        <p className="text-caption text-ink-faint">{t("club.streamer.hint")}</p>
        {!activeClub.is_public && (
          <p className="text-caption text-accent-red">
            {t("club.streamer.privateClub")}
          </p>
        )}
        <Segmented
          value={os}
          onChange={setOs}
          label={t("club.streamer.os")}
          options={[
            { value: "windows", label: "Windows" },
            { value: "mac", label: "macOS" },
            { value: "linux", label: "Linux" },
          ]}
        />
        {names.length === 0 ? (
          <p className="text-caption text-ink-faint">
            {t("club.streamer.noTables")}
          </p>
        ) : (
          <ol className="space-y-4">
            {steps.map((step, i) => (
              <li key={step.title} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-felt-raised text-caption font-semibold text-ink">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1 space-y-2 text-caption text-ink-soft">
                  <p className="text-body font-medium text-ink">{step.title}</p>
                  {step.body}
                </div>
              </li>
            ))}
          </ol>
        )}
        {/* Optional: a live-scores panel an operator can dock inside OBS
            (View → Docks → Custom Browser Docks), reached by its own URL. */}
        <AppLink
          to="/app/$clubSlug/obs-dock"
          className={buttonClasses({ variant: "ghost", size: "sm" })}
        >
          <LuMonitorPlay className="h-4 w-4" aria-hidden />
          {t("club.obs.dockLink")}
        </AppLink>
      </div>
    </Card>
  );
}

/** A one-line command with a copy button — commands here are pasted into a
 *  terminal, and retyping a sed expression is where they go wrong. */
function Command({ text }: { text: string }) {
  const { t } = useT();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("club.copied"));
    } catch {
      toast.error(t("club.copyError"));
    }
  };
  return (
    <div className="flex items-start gap-2 rounded-control bg-pocket p-2">
      <code className="min-w-0 flex-1 overflow-x-auto whitespace-pre font-mono text-caption text-ink">
        {text}
      </code>
      <button
        type="button"
        onClick={copy}
        aria-label={t("club.copy")}
        className="shrink-0 text-ink-faint hover:text-ink"
      >
        <LuCopy className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

/** A generated file as a real download: a data: URL, since the content is
 *  already here and a server route would only hand the same bytes back. */
function Download({ file }: { file: StreamerFile }) {
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
