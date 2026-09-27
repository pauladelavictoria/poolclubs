import { useT, type Key } from "@/i18n";

/**
 * The seam between the page's two halves. A rule with a word on it, so the
 * change of subject is announced rather than left to the background banding,
 * which the eye reads as rhythm and not as structure.
 */
export function LandingPartLabel({ label }: { label: Key }) {
  const { t } = useT();

  return (
    <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 pt-16 sm:px-6 lg:pt-24">
      <span className="text-caption uppercase tracking-[0.16em] text-ink-faint">
        {t(label)}
      </span>
      <span className="h-px flex-1 bg-hairline" aria-hidden />
    </div>
  );
}
