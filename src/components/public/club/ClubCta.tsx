import { Link } from "@tanstack/react-router";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { type PublicClub } from "@/queries/public/clubs";
import { useMyMembership } from "./publicClubData";
import { useT } from "@/i18n";

/** Join, or go in. Same button, two different destinations. */
export function ClubCta({
  club,
  size,
  className,
}: {
  club: PublicClub;
  size?: "sm" | "md";
  className?: string;
}) {
  const { t } = useT();
  const mine = useMyMembership(club.slug);

  return mine ? (
    <Link
      to="/app/$clubSlug"
      params={{ clubSlug: club.slug }}
      className={buttonClasses({ size, className })}
    >
      {t(
        mine.status === "pending"
          ? "public.cta.membershipPending"
          : "public.cta.openClub",
      )}
    </Link>
  ) : (
    <Link
      to="/app/join/$slug"
      params={{ slug: club.slug }}
      className={buttonClasses({ size, className })}
    >
      {t("public.cta.joinClub")}
    </Link>
  );
}
