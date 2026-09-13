import { LuDownload, LuMonitorPlay } from "react-icons/lu";
import { AppLink } from "@/components/layout/AppLink";
import { Card, CardHeader } from "@/components/ui/Card";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { useAuth } from "@/hooks/useAuth";
import { useT } from "@/i18n";

/**
 * The one-time OBS setup a club needs — see
 * docs/youtube-streaming.md Phase 1.5. A plain `<a>` rather than a Button:
 * this is a real file download (`content-disposition: attachment` on the
 * route), not a client action, so a normal navigable link is the correct
 * element and works from a right-click too.
 */
export default function ClubObsCard() {
  const { t } = useT();
  const { activeClub } = useAuth();

  return (
    <Card>
      <CardHeader title={t("club.obs.title")} />
      <div className="space-y-3 p-4">
        <p className="text-caption text-ink-faint">{t("club.obs.hint")}</p>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/clubs/${activeClub.slug}/obs-scenes.json`}
            className={buttonClasses({ variant: "secondary", size: "sm" })}
          >
            <LuDownload className="h-4 w-4" aria-hidden />
            {t("club.obs.download")}
          </a>
          <AppLink
            to="/app/$clubSlug/obs-dock"
            className={buttonClasses({ variant: "ghost", size: "sm" })}
          >
            <LuMonitorPlay className="h-4 w-4" aria-hidden />
            {t("club.obs.dockLink")}
          </AppLink>
        </div>
      </div>
    </Card>
  );
}
