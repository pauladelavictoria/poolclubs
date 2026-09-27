/** One line where a tab has nothing to show — a heading over an empty grid
 *  reads as a bug, and every tab is reachable whether or not it is filled in. */
export function ClubTabEmpty({ text }: { text: string }) {
  return <p className="mt-8 text-body text-ink-faint">{text}</p>;
}
