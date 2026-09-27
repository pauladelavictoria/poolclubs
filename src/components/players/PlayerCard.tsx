import { cardClasses } from "@/components/ui/cardStyles";
import { Avatar } from "@/components/ui/Avatar";
import { type Player } from "@/types";
import { useT } from "@/i18n";
import { AppLink } from "@/components/layout/AppLink";
import { CountryFlag } from "@/components/ui/CountryFlag";

/** Win rate and matches played, keyed by player. Anyone with no games is absent
 *  rather than zero, so the card can say "no matches" instead of "0%". */
export type Record_ = { played: number; won: number };

export function PlayerCard({
  player,
  record,
  isHere,
}: {
  player: Player;
  record?: Record_;
  isHere?: boolean;
}) {
  const { t } = useT();

  return (
    <AppLink
      to="/app/$clubSlug/players/$playerId"
      params={{ playerId: player.id }}
      className={cardClasses({
        interactive: true,
        className: "group flex flex-col gap-3 p-4",
      })}
    >
      <div className="flex items-center gap-3">
        <Avatar
          name={player.name}
          url={player.avatar_url}
          className="h-10 w-10"
        />
        <div className="min-w-0">
          <h3 className="truncate text-body font-medium text-ink transition-colors duration-150 group-hover:text-strike">
            {player.name}
            <CountryFlag country={player.country} />
          </h3>
          <p className="flex items-center gap-1.5 truncate text-caption text-ink-faint">
            {isHere && (
              <span className="live-dot h-1.5 w-1.5 shrink-0 rounded-full bg-strike" />
            )}
            {isHere ? t("tonight.hereNow") : t(`category.${player.category}`)}
          </p>
        </div>
      </div>

      {/* The figure is why this page exists, so it leads on its own line rather
          than trailing the name as another caption. */}
      <div className="mt-auto">
        <div className="text-caption font-medium uppercase tracking-[0.08em] text-ink-faint">
          {t("players.winRate")}
        </div>
        {record ? (
          <div className="mt-0.5 flex items-baseline gap-2">
            {/* The club's own ball, not the fixed green: this figure is the
                page's headline, so it wears the one accent the club picked. */}
            <span className="font-mono text-h2 font-semibold tabular-nums text-strike">
              {Math.round((record.won / record.played) * 100)}%
            </span>
            <span className="text-caption text-ink-faint">
              {t("players.ofTotal", { n: record.won, total: record.played })}
            </span>
          </div>
        ) : (
          <div className="mt-0.5 text-body text-ink-faint">
            {t("players.noGamesShort")}
          </div>
        )}
      </div>
    </AppLink>
  );
}
