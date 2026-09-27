import { Children, useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "@tanstack/react-router";

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
 * half card is the only thing that says "this scrolls", and the fade over
 * each edge says so too — always on, not just once you've scrolled partway,
 * since that's simpler than tracking scroll position to hide it.
 *
 * A fade can't be the row's own background: the cards are opaque, so a
 * gradient behind them would never show through. It has to sit on top, as a
 * sticky child of the scroller itself rather than an absolutely-positioned
 * div in a wrapper — this row bleeds past its own box on both sides (the
 * negative margin below), so a wrapper's edges land 12px short of where the
 * row actually clips. Sticky, positioned against the scroller it lives
 * inside, can't drift out of step with it.
 */
export function Carousel({ children }: { children: ReactNode }) {
  const fade = (edge: "start" | "end") => (
    <li
      aria-hidden
      className={[
        "sticky z-10 w-0 shrink-0",
        edge === "start" ? "left-0 -mr-3" : "right-0 -ml-3",
      ].join(" ")}
    >
      <div
        className={[
          "pointer-events-none h-full w-4",
          edge === "start"
            ? "-ml-3 bg-gradient-to-r from-pocket to-transparent"
            : "-ml-1 bg-gradient-to-l from-pocket to-transparent",
        ].join(" ")}
      />
    </li>
  );

  // Always opens on the newest. The router's scroll restoration records every
  // element that scrolls, this row included, and puts it back on reload and on
  // the way back to the page — which hid the latest match off the left edge,
  // behind a row that looked like it was starting at the beginning. The
  // restore runs in a layout effect, so this passive one lands after it: once
  // on mount — a reload, or arriving here — and on every render after that the
  // router restores through.
  const ref = useRef<HTMLUListElement>(null);
  const router = useRouter();
  useEffect(() => {
    const toStart = () => ref.current?.scrollTo({ left: 0 });
    toStart();
    return router.subscribe("onRendered", toStart);
  }, [router]);

  return (
    <ul
      ref={ref}
      className={[
        "-mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 scroll-px-3 pb-1",
        // The bar is noise on a block this short, and every platform the app
        // runs on scrolls this by touch or by trackpad.
        "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
      ].join(" ")}
    >
      {fade("start")}
      {Children.map(children, (child) => (
        <li
          className={[
            "flex shrink-0 snap-start",
            // 1.5 cards on a phone, 2.5 once a tablet's width is there, and 3.5
            // on a laptop — the same in every row, so the blocks on the home
            // page line up. Each subtraction is the gaps the whole cards leave
            // between them: n gaps for n + 0.5 cards.
            "w-[calc((100%-0.75rem)/1.5)] sm:w-[calc((100%-1.5rem)/2.5)] lg:w-[calc((100%-2.25rem)/3.5)]",
          ].join(" ")}
        >
          {child}
        </li>
      ))}
      {fade("end")}
    </ul>
  );
}
