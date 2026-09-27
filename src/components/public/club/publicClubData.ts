import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { useSession } from "@/hooks/useAuth";
import {
  publicClubRosterQuery,
  type PublicPlayer,
} from "@/queries/public/clubs";

/** What the public club page and its tabs read, shared so the component files
 *  only export components. */
export const route = getRouteApi("/_public/clubs/$slug");

/**
 * The club itself. It came from the loader, which already threw notFound() if
 * there wasn't one, so it is non-null here where the query's type is nullable.
 * Every tab reads it through this rather than through props — they are route
 * components, so there is nowhere for props to come from.
 */
export const useClub = () => route.useLoaderData().club;

/** The roster, listed and unlisted. Primed by the parent loader; the tabs read
 *  the same cache entry the hero does. */
export const useRoster = () =>
  useSuspenseQuery(publicClubRosterQuery(useClub().id)).data;

/**
 * The roster grid is the one block that is a list of people, so it is the one
 * place the opt-out applies. Everything else on this page is the club's record.
 *
 * Faces first: the hero shows the first six of these, and six initials in
 * circles say nothing about the club. Stable, so within each group the roster
 * keeps the order it arrived in.
 */
export const listedOf = (roster: PublicPlayer[]) =>
  roster
    .filter((player) => player.is_public)
    .sort((a, b) => Number(!!b.avatar_url) - Number(!!a.avatar_url));

/**
 * The visitor's own row in this club, if they have one.
 *
 * A member reading their club's public page is not a lead to convert — they
 * already went through the door, and "join this club" sent them back to a form
 * that only tells them so. The session already carries every membership, so
 * this costs a find, not a request.
 */
export const useMyMembership = (slug: string) =>
  useSession().memberships.find((m) => m.club?.slug === slug);
