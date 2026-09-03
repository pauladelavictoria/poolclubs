import type { ReactNode } from "react";

/**
 * One labelled field of a page's header: the question, then the answer.
 *
 * A <div> per pair so a grid places the label and its value together — a bare
 * dt/dt/dd/dd sequence in a grid puts each in whatever cell comes next. Put
 * these inside a <dl>, which is what a header full of them is.
 *
 * The alternative, and what both tournament pages used to do, is a run-on of
 * pills and separators: "9-ball · League · Entries open". A reader looking for
 * one of those has to read the sentence to find it, and none of the words are
 * named — which is how a page ends up not saying when the thing starts.
 */
export function Fact({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  /** Grid placement from the list this sits in — a value too long to share a
   *  narrow row takes the whole of it. */
  className?: string;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <dt className="text-caption text-ink-faint">{label}</dt>
      <dd className="mt-1 truncate text-body text-ink">{children}</dd>
    </div>
  );
}
