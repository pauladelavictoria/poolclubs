import { Link } from "@tanstack/react-router";
import { Avatar } from "@/components/ui/Avatar";
import { type PublicPersonWithClubs } from "@/queries/public/players";
import { CountryFlag } from "@/components/ui/CountryFlag";

/**
 * One row per person — every club they play for on the same card.
 *
 * This row is the reason people exists. It used to take a membership, so the
 * same human in three clubs was three rows, three faces and three profile links
 * that each knew about a third of them.
 *
 * No win rate here, unlike the club's own roster: that figure needs a club's
 * whole game history, and a page of thirty people from thirty clubs cannot fetch
 * thirty histories to print one number each.
 */
export function PersonRow({ person }: { person: PublicPersonWithClubs }) {
  return (
    <Link
      to="/players/$playerSlug"
      params={{ playerSlug: person.slug }}
      className="group flex items-center gap-2.5 rounded-control border border-hairline px-2.5 py-2 transition-colors duration-150 hover:bg-felt-raised"
    >
      <Avatar
        name={person.name}
        url={person.avatar_url}
        seed={person.id}
        className="h-9 w-9"
      />
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-caption font-medium text-ink transition-colors duration-150 group-hover:text-strike">
          {person.name}
          <CountryFlag country={person.country} />
        </h3>
        {/* The club logos, the same pile the club header uses for its roster,
            one size down: at card width the names never fit past the second
            club, and the marks are what people recognise anyway. */}
        <div className="mt-1 flex -space-x-1.5">
          {person.memberships.map(({ id, club }) => (
            <Avatar
              key={id}
              name={club.name}
              url={club.logo_url}
              mark
              className="h-5 w-5"
            />
          ))}
          <span className="sr-only">
            {person.memberships.map((m) => m.club.name).join(", ")}
          </span>
        </div>
      </div>
    </Link>
  );
}
