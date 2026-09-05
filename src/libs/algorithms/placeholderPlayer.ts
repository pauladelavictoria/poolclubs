/**
 * The club's stand-in for "somebody who isn't a member".
 *
 * A roster row literally named `_Invitado`, one per club, that a result can be
 * filed against when a member plays a visitor nobody wants to add. It is a
 * player row because a game needs two of them, and it is a convention rather
 * than a column because that is all it has ever needed to be — the leading
 * underscore is what keeps it out of the way alphabetically.
 *
 * Being one row standing for many different people is exactly why it has to be
 * kept out of anything that treats a row as a person: it earns no rating (see
 * elo.ts), nobody claims it as their own past on the way into the club, and it
 * cannot be entered in a tournament — the bracket would be several strangers
 * playing under one name.
 *
 * ponytail: a name comparison, not an `is_placeholder` column. Add the column
 * when something needs the database to know, rather than to spare this file.
 */
export const PLACEHOLDER_PLAYER_NAME = "_Invitado";

export const isPlaceholderPlayer = (player: { name: string }) =>
  player.name === PLACEHOLDER_PLAYER_NAME;
