/**
 * The score string.
 *
 * Every pool table has a bead abacus strung over it for counting frames. This
 * is that: recent results as beads on a wire, most recent on the right. A won
 * frame is a bead pushed across (solid); a lost one is left open (hollow, the
 * wire visible through it).
 */
export function ScoreString({
  results,
  className = "",
}: {
  /** Most-recent-first, as stored on the ranking entry. */
  results: boolean[];
  className?: string;
}) {
  const beads = results.slice(0, 10).reverse();
  if (beads.length === 0) return null;

  const won = beads.filter(Boolean).length;

  return (
    <span
      className={`relative inline-flex items-center gap-[3px] ${className}`}
      title={`${won} de ${beads.length} ganados`}
      role="img"
      aria-label={`Últimos ${beads.length} partidos: ${won} ganados`}
    >
      {/* the wire */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-hairline-strong"
      />
      {beads.map((wonFrame, i) => (
        <span
          key={i}
          aria-hidden
          className={
            wonFrame
              ? "relative h-[7px] w-[7px] rounded-full bg-pot"
              : "relative h-[7px] w-[7px] rounded-full border border-hairline-strong bg-felt"
          }
        />
      ))}
    </span>
  );
}
