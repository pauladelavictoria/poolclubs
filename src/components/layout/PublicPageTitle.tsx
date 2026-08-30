import type { ReactNode } from "react";
import {
  headlineClasses,
  type HeadlineSize,
} from "@/components/layout/publicTitleStyles";

/**
 * The public side's page header, the way PageTitle serves /app.
 *
 * Six pages were spelling the same wrapper and the same headline string out by
 * hand, which is six places for it to drift and — worse — six pages opening in
 * the landing page's voice. See publicTitleStyles for the size split.
 */
export default function PublicPageTitle({
  title,
  lede,
  size = "page",
  children,
}: {
  title: ReactNode;
  lede?: ReactNode;
  size?: HeadlineSize;
  /** Anything that belongs to the header rather than to the body — /search puts
   *  its field here, the legal pages their updated-on date. */
  children?: ReactNode;
}) {
  return (
    <section>
      <div className="px-4 py-6 sm:px-6 sm:py-8">
        <h1 className={headlineClasses(size)}>{title}</h1>
        {lede && (
          <p className="mt-2 max-w-[46ch] text-h4 text-ink-soft">{lede}</p>
        )}
        {children}
      </div>
    </section>
  );
}
