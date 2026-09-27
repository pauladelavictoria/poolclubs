import { createContext, useContext } from "react";

/** Every player's country, keyed by player id — see PlayerCountries. */
export const CountryContext = createContext<Map<number, string | null> | null>(
  null,
);

/** The player a PlayerHighlight has marked, and its toggle. */
export const HighlightContext = createContext<{
  active: number | null;
  toggle: (playerId: number) => void;
} | null>(null);

/** The player PlayerHighlight has marked, and its toggle — for a chart that
 *  follows the same thread the names do. Null outside a provider. */
export const usePlayerHighlight = () => useContext(HighlightContext);
