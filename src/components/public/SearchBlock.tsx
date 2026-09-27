import { Link } from "@tanstack/react-router";
import { useT } from "@/i18n";
import type { Key } from "@/i18n";

/** One kind of result, with the way through to all of them. */
export function SearchBlock({
  titleKey,
  to,
  term,
  children,
}: {
  titleKey: Key;
  to: "/clubs" | "/players" | "/tournaments" | "/drills";
  term: string;
  children: React.ReactNode;
}) {
  const { t } = useT();

  return (
    <section>
      <div className="flex items-center justify-between gap-3 pb-3">
        <h2 className="text-h3 font-semibold tracking-tight text-ink">
          {t(titleKey)}
        </h2>
        <Link
          to={to}
          // Carries the term: every directory has its own field now, so it
          // arrives filled in and the short list has a visible cause and a way
          // to clear it.
          search={{ q: term || undefined }}
          className="shrink-0 text-caption font-medium text-strike transition-colors duration-150 hover:text-strike-light"
        >
          {t("common.seeAll")}
        </Link>
      </div>
      {children}
    </section>
  );
}
