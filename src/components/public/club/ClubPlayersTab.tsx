import { Link } from "@tanstack/react-router";
import { Avatar } from "@/components/ui/Avatar";
import { useT } from "@/i18n";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { listedOf, useClub, useRoster } from "./publicClubData";
import { ClubTabEmpty } from "./ClubTabEmpty";

/** Everyone who plays here and chose to be listed. */
export function ClubPlayersTab() {
  const { t } = useT();
  const club = useClub();
  const listed = listedOf(useRoster());

  if (listed.length === 0) {
    return <ClubTabEmpty text={t("public.publicClub.noRosterHint")} />;
  }

  return (
    <section className="mt-8">
      <div className="grid grid-cols-4 gap-4 sm:grid-cols-6 lg:grid-cols-8">
        {listed.map((player) => (
          <Link
            key={player.id}
            to="/players/$playerSlug"
            params={{ playerSlug: player.slug }}
            className="group flex flex-col items-center gap-1.5 text-center"
          >
            <Avatar
              name={player.name}
              url={player.avatar_url}
              seed={player.id}
              className="h-16 w-16 transition-transform duration-150 group-hover:scale-105 sm:h-20 sm:w-20"
            />
            <span className="w-full truncate text-caption text-ink-soft group-hover:text-ink">
              {player.name}
              <CountryFlag country={player.country} />
            </span>
          </Link>
        ))}
      </div>
      {/* Said plainly rather than left as a discrepancy the reader has to spot
          between the count above and the length of this list. */}
      {club.member_count > listed.length && (
        <p className="mt-4 text-caption text-ink-faint">
          {t("public.publicClub.hiddenMembers", {
            n: club.member_count - listed.length,
          })}
        </p>
      )}
    </section>
  );
}
