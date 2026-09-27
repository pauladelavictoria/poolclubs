import { useMemo, type ReactNode } from "react";
import { CountryContext } from "./playerContexts";

/**
 * Every player's country, keyed by player id, for the PlayerLinks inside it.
 *
 * ponytail: a context rather than a `country` threaded through every nameOf /
 * slugOf pair in the bracket, league and fixture components. ClubLayout
 * provides the roster; a public page provides whoever it loaded.
 */
export function PlayerCountries({
  players,
  children,
}: {
  players: readonly { id: number; country: string | null }[] | undefined;
  children: ReactNode;
}) {
  const map = useMemo(
    () => new Map((players ?? []).map((p) => [p.id, p.country])),
    [players],
  );
  return (
    <CountryContext.Provider value={map}>{children}</CountryContext.Provider>
  );
}
