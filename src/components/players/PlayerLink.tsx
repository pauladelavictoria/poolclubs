import { Link, useParams } from "@tanstack/react-router";
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type MouseEventHandler,
  type ReactNode,
} from "react";

const HighlightContext = createContext<{
  active: number | null;
  toggle: (playerId: number) => void;
} | null>(null);

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

/**
 * A player's name, linked to wherever the reader can actually see them.
 *
 * Inside a club that is the club's own player page; on the public site it is
 * /players/$playerSlug. The distinction is settled from the route rather than from
 * a prop, because the components that link players — the league table, the
 * bracket's match cards, the fixtures list — are shared between the two sides
 * and threading a flag down through all of them would mean four files and a
 * dozen call sites saying the same thing.
 *
 * `strict: false` is what makes that possible: it returns the params of whatever
 * route is actually matched instead of throwing when it isn't the one named. It
 * is the reason this cannot be folded into AppLink, whose whole contract is that
 * a club is present.
 */
export default function PlayerLink({
  playerId,
  playerSlug,
  className,
  onClick,
  children,
}: {
  playerId: number;
  /** The person's slug, which is what the public URL is keyed on since people
   *  split out of players. Absent means the caller could not resolve it — a
   *  player no longer on the roster — and the public branch then renders the
   *  name unlinked rather than pointing at a 404. */
  playerSlug?: string;
  className?: string;
  /** The fixture rows stop propagation here, so a tap on a name doesn't also
   *  open the record-a-result sheet the row is wrapped in. */
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  children: ReactNode;
}) {
  const { clubSlug } = useParams({ strict: false });
  const highlight = useContext(HighlightContext);

  // Inside a <PlayerHighlight>, the name marks the player's fixtures instead of
  // navigating. `data-highlight` is what the rows around it key their own
  // styling off, so nothing has to thread the active id down to them.
  if (highlight) {
    const on = highlight.active === playerId;
    return (
      <button
        type="button"
        data-highlight={on || undefined}
        aria-pressed={on}
        onClick={(e) => {
          e.stopPropagation();
          highlight.toggle(playerId);
        }}
        className={`${className ?? ""} ${on ? "text-strike" : ""}`}
      >
        {children}
      </button>
    );
  }

  if (clubSlug) {
    return (
      <Link
        to="/app/$clubSlug/players/$playerId"
        params={{ clubSlug, playerId: String(playerId) }}
        className={className}
        onClick={onClick}
      >
        {children}
      </Link>
    );
  }

  if (!playerSlug) return <span className={className}>{children}</span>;

  return (
    <Link
      to="/players/$playerSlug"
      params={{ playerSlug }}
      className={className}
      onClick={onClick}
    >
      {children}
    </Link>
  );
}
