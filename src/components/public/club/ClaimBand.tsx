import { toast } from "react-toastify";
import { headlineClasses } from "@/components/layout/publicTitleStyles";
import { useMutation } from "@tanstack/react-query";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { type PublicClubDetail } from "@/queries/public/clubs";
import { useSession } from "@/hooks/useAuth";
import { loginLink } from "@/libs/algorithms/nextPath";
import { sendClubClaimMail } from "@/libs/server/mail.functions";
import { useT } from "@/i18n";

/**
 * The closing section for a club that is in the directory because a federation
 * lists it, not because anybody here put it there — see publicClubUnclaimedQuery.
 *
 * It replaces the "join this club" band rather than sitting above it: there is
 * nobody inside to join yet, and asking a stranger to request membership of an
 * empty club was the confusing half of these pages.
 *
 * Signed out, the button is a sign-up that comes back here — a claim has to
 * arrive from an account, because the account is what the club gets transferred
 * to. Signed in, it files the claim: one mail to us, because handing a club
 * over is a hand operation (sql/clubs-seed-es.sql).
 */
export function ClaimBand({ club }: { club: PublicClubDetail }) {
  const { t } = useT();
  const { user } = useSession();

  const claim = useMutation({
    mutationFn: () => sendClubClaimMail({ data: { slug: club.slug } }),
    onSuccess: () => toast.success(t("public.publicClub.claimSent")),
    onError: () => toast.error(t("public.publicClub.claimError")),
  });

  return (
    <section className="wash wash-soft mt-10 flex flex-col items-center gap-3 rounded-sheet border border-hairline p-10 text-center">
      <h2 className={headlineClasses("display", "max-w-[24ch]")}>
        {t("public.publicClub.claimTitle")}
      </h2>
      <p className="max-w-[52ch] text-body text-ink-soft">
        {t("public.publicClub.claimBody", { name: club.name })}
      </p>
      {user ? (
        <button
          type="button"
          onClick={() => claim.mutate()}
          // Once, and once is enough: a second identical mail tells us nothing
          // the first did not.
          disabled={claim.isPending || claim.isSuccess}
          className={buttonClasses({ className: "mt-2 px-6" })}
        >
          {claim.isSuccess
            ? t("public.publicClub.claimSent")
            : t("public.publicClub.claim")}
        </button>
      ) : (
        <a
          href={loginLink(`/clubs/${club.slug}`)}
          className={buttonClasses({ className: "mt-2 px-6" })}
        >
          {t("public.publicClub.claimSignUp")}
        </a>
      )}
    </section>
  );
}
