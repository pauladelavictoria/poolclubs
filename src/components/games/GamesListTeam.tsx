import { type GamesListPlayer, GamesListName } from "./GamesListName";

/**
 * A team's name(s) on the tape, one per line.
 *
 * Stacked rather than joined with a slash: the row gives each side half the
 * width, and two names on one line of it is two truncations — every doubles
 * result read as "Jesus Sr ... v Vicent R...", which is the same four letters
 * whoever was playing.
 */
export function GamesListTeam({
  id1,
  id2,
  byId,
  linked,
}: {
  id1: number;
  id2?: number | null;
  byId: Map<number, GamesListPlayer>;
  linked: boolean;
}) {
  return (
    <>
      <span className="truncate">
        <GamesListName player={byId.get(id1)} linked={linked} />
      </span>
      {id2 != null && (
        <span className="truncate">
          <GamesListName player={byId.get(id2)} linked={linked} />
        </span>
      )}
    </>
  );
}
