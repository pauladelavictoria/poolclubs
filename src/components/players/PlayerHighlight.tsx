import { useMemo, useState, type ReactNode } from "react";
import { HighlightContext } from "./playerContexts";

/**
 * Turns every player's name inside it from a link into a highlighter.
 *
 * On a tournament page a name is not a place you want to go — it is a thread
 * you want to follow: tapping it marks every fixture that player is in, which
 * is the question ("which of these are mine?") the page is actually asked.
 */
export function PlayerHighlight({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<number | null>(null);
  const value = useMemo(
    () => ({
      active,
      toggle: (playerId: number) =>
        setActive((current) => (current === playerId ? null : playerId)),
    }),
    [active],
  );
  return (
    <HighlightContext.Provider value={value}>
      {children}
    </HighlightContext.Provider>
  );
}
