import { useT } from "@/i18n";

/**
 * The options of a "who played" select, with the reader's own name at the top.
 *
 * Whoever is filing a result is, nine times out of ten, one of the two people
 * in it — and their own name was somewhere in the middle of an alphabetical
 * roster of eighty, found by scrolling past everyone they did not play.
 *
 * Marked with the word rather than a colour: on a phone and on the tablet the
 * open list is the platform's own (see the coarse-pointer rule in index.css),
 * and an <option> there takes no styling at all. Text is the one mark that
 * survives every picker this app opens.
 *
 * `meId` is left undefined where "you" is not a person: the club's tablet is
 * signed in as a device, and the device never played anything.
 *
 * An id and a name is all it asks for, so the lists that carry less than a
 * whole player — a tournament's entrants, a filter's own roster — use it too.
 */
export function PlayerOptions<T extends { id: number; name: string }>({
  players,
  meId,
  format,
}: {
  players: T[];
  /** The signed-in player, when they are one of the pickable names. */
  meId?: number | null;
  /** How the other names are written — a presence mark, mostly. The reader's
   *  own row is not run through it: it carries its own mark already. */
  format?: (player: T) => string;
}) {
  const { t } = useT();
  const me = meId ? players.find((p) => p.id === meId) : undefined;
  const rest = me ? players.filter((p) => p.id !== me.id) : players;

  return (
    <>
      {me && (
        <option value={me.id}>
          {me.name} · {t("club.you")}
        </option>
      )}
      {rest.map((player) => (
        <option key={player.id} value={player.id}>
          {format ? format(player) : player.name}
        </option>
      ))}
    </>
  );
}
