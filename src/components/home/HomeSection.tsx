import { Children, type ReactNode } from "react";
import { LuChevronRight } from "react-icons/lu";
import type { LinkProps } from "@tanstack/react-router";
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
  /** The section this block is the front of. */
  to: LinkProps["to"];
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
        <AppLink
          to={to}
          viewTransition
          className="flex shrink-0 items-center gap-0.5 text-caption font-medium text-ink-faint transition-colors duration-150 hover:text-strike"
        >
          {t("common.seeAll")}
          <LuChevronRight className="h-3.5 w-3.5" aria-hidden />
        </AppLink>
      </div>
      {children}
    </section>
  );
}

/**
 * A block's rows, laid along the thumb instead of down the page.
 *
 * Scroll-snap and nothing else: no library, no buttons, no dots. A phone
 * already knows how to swipe a list and a trackpad already knows how to push
 * one sideways. The negative margin is what lets a card start flush with the
 * page's own gutter and still have somewhere to scroll from — with
 * `scroll-px-3` to match, or mandatory snapping parks the first card against
 * the scroller's own edge and the gutter disappears.
 *
 * Cards are sized here rather than by each caller, so every block's rhythm
 * agrees: the width is a share of the block, never a fixed number, so what a
 * row shows is always a whole number of cards and half of the next one. The
 * half card is the only thing that says "this scrolls".
 */
export function Carousel({
  children,
  wide = false,
}: {
  children: ReactNode;
  /** For cards carrying two names and a score rather than one line of text.
   *  Only changes how many fit once there is room for more than three. */
  wide?: boolean;
}) {
  return (
    <ul
      className={[
        "-mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 scroll-px-3 pb-1",
        // The bar is noise on a block this short, and every platform the app
        // runs on scrolls this by touch or by trackpad.
        "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
      ].join(" ")}
    >
      {Children.map(children, (child) => (
        <li
          className={[
            "flex shrink-0 snap-start",
            // 1.5 cards on a phone, 2.5 once a tablet's width is there, and a
            // row of them on a laptop. Each subtraction is the gaps the whole
            // cards leave between them: n gaps for n + 0.5 cards.
            "w-[calc((100%-0.75rem)/1.5)] sm:w-[calc((100%-1.5rem)/2.5)]",
            wide
              ? "lg:w-[calc((100%-2.25rem)/3.5)]"
              : "lg:w-[calc((100%-3rem)/4.5)]",
          ].join(" ")}
        >
          {child}
        </li>
      ))}
    </ul>
  );
}
