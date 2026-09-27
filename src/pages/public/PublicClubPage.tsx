import { headlineClasses } from "@/components/layout/publicTitleStyles";
import { Outlet } from "@tanstack/react-router";
import PublicShell from "@/components/layout/PublicShell";
import { useT } from "@/i18n";
import { ClubCta } from "@/components/public/club/ClubCta";
import {
  listedOf,
  route,
  useMyMembership,
  useRoster,
} from "@/components/public/club/publicClubData";
import { ClaimBand } from "@/components/public/club/ClaimBand";
import { ClubHero } from "@/components/public/club/ClubHero";

/** Enough recent results to show the club is alive, not its whole history —
 *  which is what /clubs/$slug is for and the club's own app is not. */
export const CLUB_GAMES_LIMIT = 30;

/**
 * A club's public face: who plays there, who is winning, what is on, and one way
 * in.
 *
 * The frame only — the hero, the tabs and the closing call to action. Each tab under it is its own route, because a club's players
 * and a club's results are two different things to link somebody at, and one
 * page that stacked all four made the reader scroll past three of them.
 */
export default function PublicClubPage() {
  const { t } = useT();
  const { club, unclaimed, origin } = route.useLoaderData();

  const url = `${origin}/clubs/${club.slug}`;
  const listed = listedOf(useRoster());
  const mine = useMyMembership(club.slug);

  return (
    <>
      <ClubHero club={club} listed={listed} url={url} />

      <PublicShell>
        <Outlet />

        {/* Nothing to pitch to somebody who is already in: the band asks a
            stranger to join, and the hero's button already offers a member the
            way into the club itself. */}
        {unclaimed ? (
          <ClaimBand club={club} />
        ) : mine ? null : (
          <section className="wash wash-soft mt-10 flex flex-col items-center gap-3 rounded-sheet border border-hairline p-10 text-center">
            <h2 className={headlineClasses("display", "max-w-[24ch]")}>
              {t("public.publicClub.joinTitle", { name: club.name })}
            </h2>
            <p className="max-w-[46ch] text-body text-ink-soft">
              {t("public.publicClub.joinBody")}
            </p>
            {/* The club's own invite link, which is public now — signed out
                it previews the club and offers a sign-up that comes back to it,
                so there is nothing to gate here. */}
            <ClubCta club={club} className="mt-2 px-6" />
          </section>
        )}
      </PublicShell>
    </>
  );
}
