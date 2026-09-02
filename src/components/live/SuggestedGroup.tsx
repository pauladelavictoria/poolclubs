import { Avatar } from "@/components/ui/Avatar";
import type { Player } from "@/types";

/**
 * A suggested match, as faces and names.
 *
 * Three screens offer the night's next pairing — the ranking-night list, a free
 * table's own page, and the scoreboard the moment a result is filed — and all
 * three were writing this out themselves. Only the card around it differs
 * between them (a heading here, a "not now" there), so only this much is shared:
 * the stack of faces and the one line of names.
 *
 * The line is the part worth having in one place. Which side a doubles partner
 * is on comes out of `balanceDoubles`, and a screen that joined the four names
 * in queue order instead would show a different match from the one its own
 * button starts.
 */
export default function SuggestedGroup({
  group,
  seats,
}: {
  group: Player[];
  /** 2 or 4 — see seatsNeeded in libs/algorithms/today.ts. */
  seats: number;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex shrink-0 -space-x-2">
        {group.map((p) => (
          <Avatar
            key={p.id}
            name={p.name}
            url={p.avatar_url}
            className="h-9 w-9 ring-2 ring-felt"
          />
        ))}
      </div>
      <span className="min-w-0 truncate text-body text-ink">
        {seats === 4
          ? `${group[0].name} & ${group[1].name} — ${group[2].name} & ${group[3].name}`
          : `${group[0].name} — ${group[1].name}`}
      </span>
    </div>
  );
}
