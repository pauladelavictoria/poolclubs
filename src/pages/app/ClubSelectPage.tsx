import { Link } from "@tanstack/react-router";
import { useSession } from "@/hooks/useAuth";
import PageTitle from "@/components/layout/PageTitle";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { useT } from "@/i18n";

/**
 * Reached only when someone has more than one active membership — see /app's
 * beforeLoad. Just a list, because there's nothing to decide beyond which one:
 * no "make this my default" toggle, since the last club you picked is already
 * remembered by the browser's own history the next time you type the bare
 * /app URL.
 */
export default function ClubSelectPage() {
  const { t } = useT();
  const { memberships } = useSession();
  const clubs = memberships.filter((m) => m.status === "active" && m.club);

  return (
    <div className="mx-auto max-w-xl space-y-4 px-3 py-6">
      <PageTitle title={t("club.selectTitle")} />
      <p className="text-body text-ink-faint">{t("club.selectHint")}</p>

      <Card className="divide-y divide-hairline overflow-hidden">
        {clubs.map((m) => (
          <Link
            key={m.club_id}
            to="/app/$clubSlug"
            params={{ clubSlug: m.club!.slug }}
            className="flex items-center gap-3 px-4 py-3.5 text-left transition-colors duration-150 hover:bg-felt"
          >
            <Avatar
              name={m.club!.name}
              url={m.club!.logo_url}
              mark
              shape="plate"
              className="h-10 w-10"
            />
            <span className="min-w-0 flex-1 truncate text-body font-medium text-ink">
              {m.club!.name}
            </span>
          </Link>
        ))}
      </Card>

      <div className="flex justify-center">
        <Link
          to="/app/clubs/new"
          className="text-caption text-ink-faint transition-colors duration-150 hover:text-strike"
        >
          {t("club.create")}
        </Link>
      </div>
    </div>
  );
}
