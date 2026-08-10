import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { LuChevronLeft } from "react-icons/lu";
import ProfileMenu from "@/components/ProfileMenu";
import { useT } from "@/i18n";

type Props = {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Back chevron target. Omit on tab-level pages — the rail already gets you out. */
  back?: string;
  /** Page-specific actions, right-aligned before the avatar. */
  children?: ReactNode;
};

/**
 * 56px app bar on the same surface as the cards below it, separated by a
 * hairline rather than a colour change — a red gradient bar on every screen
 * spends the accent on decoration, and then nothing is left to mean "act".
 */
export default function PageHeader({ title, subtitle, back, children }: Props) {
  const { t } = useT();

  return (
    <header className="sticky top-0 z-30 border-b border-hairline bg-felt/85 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-3">
        {back && (
          <Link
            to={back}
            aria-label={t("common.back")}
            className="-ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-control text-ink-soft transition-colors duration-150 hover:bg-felt-raised hover:text-ink"
          >
            <LuChevronLeft className="h-5 w-5" aria-hidden />
          </Link>
        )}

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-h3 font-semibold text-ink">{title}</h1>
          {subtitle && (
            <p className="truncate text-caption text-ink-faint">{subtitle}</p>
          )}
        </div>

        {children}
        <ProfileMenu />
      </div>
    </header>
  );
}
