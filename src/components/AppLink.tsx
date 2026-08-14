import { Link, useParams } from "@tanstack/react-router";
import type { LinkProps } from "@tanstack/react-router";

/**
 * A link inside the current club.
 *
 * Every path under /app now carries the club: "/app/$clubSlug/players/$playerId"
 * rather than the "/app/players/12" template literals this replaced. That is
 * what makes a link checkable — a typo in a route is a build error now — but it
 * would also mean every one of the forty-odd link sites in the app reading
 * `clubSlug` off the URL just to put it straight back.
 *
 * So this fills it in. Call sites pass only the ids they actually know:
 *
 *   <AppLink to="/app/$clubSlug/players/$playerId" params={{ playerId: p.id }}>
 *
 * `to` keeps its real type, so the router still checks the path exists and that
 * its parameters are supplied. `params` is loosened to a plain record because the
 * merge below is what makes the club implicit, and the router's own parameter
 * type has no way to express "all of them except this one". Numbers are allowed
 * and stringified, since ids come out of the database as numbers.
 */
type AppLinkProps = Omit<LinkProps, "params"> & {
  params?: Record<string, string | number>;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps>;

export function AppLink({ params, ...rest }: AppLinkProps) {
  const { clubSlug } = useParams({ from: "/app/_authed/$clubSlug" });

  const merged: Record<string, string> = { clubSlug };
  for (const [key, value] of Object.entries(params ?? {})) {
    merged[key] = String(value);
  }

  // The one cast in this file, and the reason it exists is in the comment above:
  // `to` is checked, the parameter *object* cannot be without restating every
  // route's shape here.
  return <Link {...rest} params={merged as never} />;
}
