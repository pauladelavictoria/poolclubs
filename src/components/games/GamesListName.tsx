import type { Player } from "@/types";
import { Link } from "@tanstack/react-router";
import { CountryFlag } from "@/components/ui/CountryFlag";

const NAME_LINK = "transition-colors duration-150 hover:text-strike";

/** What this list needs to turn a game's player id into a linked name. Games
 *  stopped carrying a copy of the name when names moved to people, so the
 *  roster is now an input rather than a convenience. */
export type GamesListPlayer = Pick<Player, "id" | "name" | "slug" | "country">;

/**
 * One player's name on the tape.
 *
 * Text, not a link, wherever the row itself opens the result: a row full of
 * links to somewhere else is a row you cannot tap. Only a tape whose results
 * have no page to go to — a public club that cannot be resolved to a slug —
 * spends the name on a link to the person instead.
 */
export function GamesListName({
  player,
  linked,
}: {
  /** Undefined for somebody who has since left the club: the game keeps its id,
   *  the roster no longer has the row. The em dash is what the rest of the app
   *  shows for that — see usePlayerLookup. */
  player: GamesListPlayer | undefined;
  linked: boolean;
}) {
  if (!player) return <>—</>;

  return linked ? (
    <Link
      to="/players/$playerSlug"
      params={{ playerSlug: player.slug }}
      className={NAME_LINK}
    >
      {player.name}
      <CountryFlag country={player.country} />
    </Link>
  ) : (
    <>
      {player.name}
      <CountryFlag country={player.country} />
    </>
  );
}
