import { headlineClasses } from "@/components/layout/publicTitleStyles";
import { Link } from "@tanstack/react-router";
import ShareButton from "@/components/social/ShareButton";
import { Avatar } from "@/components/ui/Avatar";
import { Stat } from "@/components/ui/Stat";
import type { PublicPersonWithClubs } from "@/queries/public/players";
import { useT } from "@/i18n";
import { CountryFlag } from "@/components/ui/CountryFlag";

/**
 * Full-bleed, no photography (a stock pool-hall photo behind a named real
 * person implies it is their room), and no club wash either: the club and
 * tournament heroes are the page's own surface under a rule, and a tinted
 * band here made a player read as a different kind of page than the two it
 * sits beside. The two headline numbers plus a last-10 form strip are pulled
 * up here rather than left in a card below the fold. Neither number takes the
 * accent — with nothing else coloured in the band, one yellow figure read as
 * a status rather than as the more important of two neutral facts.
 */
export function PlayerHero({
  person,
  stats,
  url,
}: {
  person: PublicPersonWithClubs;
  stats: {
    played: number;
    won: number;
    racksWon: number;
    racks: number;
    winRate: number;
    rackRate: number;
    last10: boolean[];
  };
  url: string;
}) {
  const { t } = useT();
  return (
    <section className="border-b border-hairline">
      <div className="px-4 pt-10 pb-8 sm:px-6 sm:pt-16 sm:pb-10">
        {/* Top-aligned, like the club and tournament heroes: bottom alignment
            put the h1 wherever the detail under it happened to end, so the title
            sat at a different height on each of the three profiles. */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
            <Avatar
              name={person.name}
              url={person.avatar_url}
              seed={person.id}
              className="h-20 w-20 sm:h-28 sm:w-28"
            />
            <div className="min-w-0">
              <h1 className={headlineClasses("display", "truncate")}>
                {person.name}
                <CountryFlag country={person.country} />
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
                {person.memberships.map(({ id, club }) => (
                  <Link
                    key={id}
                    to="/clubs/$slug"
                    params={{ slug: club.slug }}
                    className="flex items-center gap-1.5 text-body text-ink-soft transition-colors duration-150 hover:text-strike"
                  >
                    <Avatar
                      name={club.name}
                      url={club.logo_url}
                      mark
                      className="h-4 w-4"
                    />
                    {club.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {/* The link carries the picture with it: what it unfurls to in a
                chat is the card drawn by /api/og/players. */}
            <ShareButton title={person.name} url={url} />
          </div>
        </div>

        {stats.played > 0 && (
          <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex gap-8">
              <Stat
                label={t("players.gamesWon")}
                value={`${stats.winRate}%`}
                delta={t("players.ofTotal", {
                  n: stats.won,
                  total: stats.played,
                })}
              />
              <Stat
                label={t("players.racksWon")}
                value={`${stats.rackRate}%`}
                delta={t("players.ofTotal", {
                  n: stats.racksWon,
                  total: stats.racks,
                })}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-caption text-ink-faint">
                {t("public.publicPlayer.form")}
              </span>
              <div
                className="flex gap-1"
                aria-label={t("public.publicPlayer.form")}
              >
                {stats.last10.map((won, i) => (
                  <span
                    key={i}
                    aria-hidden
                    className={`h-2.5 w-2.5 rounded-full ${won ? "bg-pot" : "bg-ink-ghost"}`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
