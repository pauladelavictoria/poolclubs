import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  LuChevronLeft,
  LuNetwork,
  LuTrophy,
  LuCircleDot,
  LuTarget,
} from "react-icons/lu";
import ProfileMenu from "@/components/ProfileMenu";
import { SECTIONS, type SectionId } from "@/libs/sections";
import { useT } from "@/i18n";

type Props = {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Back chevron target. Omit on tab-level pages — the rail already gets you out. */
  back?: string;
  /** Which of the four places this page belongs to. Draws the mark glyph. */
  section?: SectionId;
  /** Page-specific actions, right-aligned before the avatar. */
  children?: ReactNode;
};

/**
 * The glyph each section is already known by in the rail and the drawer.
 * Home is absent on purpose — the dashboard is the lobby, not a fifth place.
 */
const ICONS: Partial<
  Record<SectionId, React.ComponentType<{ className?: string }>>
> = {
  tournaments: LuNetwork,
  ranking: LuTrophy,
  games: LuCircleDot,
  drills: LuTarget,
};

/**
 * 56px app bar on the same surface as the cards below it, separated by a
 * hairline rather than a colour change — a red gradient bar on every screen
 * spends the accent on decoration, and then nothing is left to mean "act".
 *
 * The section mark is an 18px glyph beside the title, not that bar: it says
 * which of the four places you are standing in, costs one small object, and
 * leaves the bar's surface alone.
 */
export default function PageHeader({
  title,
  subtitle,
  back,
  section,
  children,
}: Props) {
  const Icon = section && section !== "home" ? ICONS[section] : undefined;
  const { t } = useT();

  return (
    // pt clears the status bar: viewport-fit=cover puts the page under it, and
    // the bar's own background is what fills the gap.
    <header className="sticky top-0 z-30 border-b border-hairline bg-felt/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-3">
        {back && (
          <Link
            to={back}
            viewTransition
            aria-label={t("common.back")}
            className="-ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-control text-ink-soft transition-colors duration-150 hover:bg-felt-raised hover:text-ink"
          >
            <LuChevronLeft className="h-5 w-5" aria-hidden />
          </Link>
        )}

        {Icon && section && (
          <Icon
            className={`h-[18px] w-[18px] shrink-0 ${SECTIONS[section].mark}`}
          />
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
