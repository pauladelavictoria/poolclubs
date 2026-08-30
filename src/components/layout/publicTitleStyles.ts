/**
 * The public headline's classes, apart from the component, the same way
 * buttonStyles sits apart from Button — the three profile heroes build their
 * own header around an avatar and a tab row, so the string has to be reachable
 * without PublicPageTitle's wrapper.
 *
 * Two sizes, and the split is the point. `display` is for the pages whose
 * subject *is* the thing on them: the landing page, a club, a player, a
 * tournament. `page` is for the directories and the search, which are tools —
 * nine pages opening at 60px was nine pages in the marketing page's voice.
 */
export type HeadlineSize = "page" | "display";

export const headlineClasses = (size: HeadlineSize = "page", className = "") =>
  [
    size === "display" ? "text-display" : "text-h1",
    "leading-[1.2] font-semibold text-ink",
    className,
  ]
    .filter(Boolean)
    .join(" ");
