import { Link, useParams } from "@tanstack/react-router";
import type { MouseEventHandler, ReactNode } from "react";

/**
 * A player's name, linked to wherever the reader can actually see them.
 *
 * Inside a club that is the club's own player page; on the public site it is
 * /players/$playerId. The distinction is settled from the route rather than from
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
  className,
  onClick,
  children,
}: {
  playerId: number;
  className?: string;
  /** The fixture rows stop propagation here, so a tap on a name doesn't also
   *  open the record-a-result sheet the row is wrapped in. */
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  children: ReactNode;
}) {
  const { clubSlug } = useParams({ strict: false });

  return clubSlug ? (
    <Link
      to="/app/$clubSlug/players/$playerId"
      params={{ clubSlug, playerId: String(playerId) }}
      className={className}
      onClick={onClick}
    >
      {children}
    </Link>
  ) : (
    <Link
      to="/players/$playerId"
      params={{ playerId: String(playerId) }}
      className={className}
      onClick={onClick}
    >
      {children}
    </Link>
  );
}
