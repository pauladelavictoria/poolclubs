import { type ReactNode } from "react";
import { LuChevronRight } from "react-icons/lu";
import { type LinkProps } from "@tanstack/react-router";
import { AppLink } from "@/components/layout/AppLink";
import { useT, type Key } from "@/i18n";

/**
 * One block of the lobby: a heading, the way into the section it summarises,
 * and whatever the block itself shows.
 *
 * The lobby used to be one long feed with everything else hidden behind the tab
 * bar and the drawer. It is a set of blocks now — the night, the tournaments,
 * the last matches, the last drills — each of them a handful of the section's
 * newest rows and a link to the rest. The section link is the discovery
 * mechanism: a heading with a way in beats a grid of icons, because it arrives
 * with the section's actual content underneath it.
 */
export function HomeSection({
  titleKey,
  to,
  children,
}: {
  titleKey: Key;
  /** The section this block is the front of. Omitted for a block that is
   *  the whole of its answer — the week's drill has no "all" to see. */
  to?: LinkProps["to"];
  children: ReactNode;
}) {
  const { t } = useT();

  return (
    <section className="space-y-3">
      {/* No gutter of its own: the heading lines up with the first card's edge,
          which the carousel's scroll-padding holds at the page gutter. */}
      {/* A rule under the heading, not around the block: five blocks of the
          same shape stacked on one ground read as a single list of lists, and
          a line each is what tells them apart without boxing every one of them
          in a card the cards inside would then sit in. */}
      <div className="flex items-baseline justify-between gap-3 border-b border-hairline pb-2">
        <h2 className="text-h4 font-semibold text-ink">{t(titleKey)}</h2>
        {to && (
          <AppLink
            to={to}
            viewTransition
            className="flex shrink-0 items-center gap-0.5 text-caption font-medium text-ink-faint transition-colors duration-150 hover:text-strike"
          >
            {t("common.seeAll")}
            <LuChevronRight className="h-3.5 w-3.5" aria-hidden />
          </AppLink>
        )}
      </div>
      {children}
    </section>
  );
}
