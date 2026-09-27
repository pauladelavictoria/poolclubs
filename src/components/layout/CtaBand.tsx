import { headlineClasses } from "@/components/layout/publicTitleStyles";
import { Link } from "@tanstack/react-router";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { useT } from "@/i18n";

/**
 * The same closing beat on all five directory pages, so a page ends instead of
 * trailing off into the footer. Washed in the app's default accent rather than
 * any one club's — nothing on a directory page is a single club's territory.
 */
export function CtaBand() {
  const { t } = useT();

  return (
    <section className="wash wash-soft relative mt-16 overflow-hidden rounded-sheet border border-hairline">
      <div className="relative flex flex-col items-center gap-4 px-6 py-16 text-center sm:py-20">
        <h2 className={headlineClasses("display", "max-w-[24ch]")}>
          {t("public.ctaBand.title")}
        </h2>
        <p className="max-w-[46ch] text-body text-ink-soft">
          {t("public.ctaBand.body")}
        </p>
        <Link
          to="/clubs/new"
          className={buttonClasses({ className: "mt-2 px-6" })}
        >
          {t("public.footer.startClub")}
        </Link>
      </div>
    </section>
  );
}
