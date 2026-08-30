import { Avatar } from "@/components/ui/Avatar";
import { usePlayerLookup } from "@/hooks/usePlayers";
import { AppLink } from "@/components/layout/AppLink";

/** One side of a match: faces on top, names under them, so the card reads as
 *  two people rather than as two rows of text. */
export default function Side({
  ids,
  won,
}: {
  /** Null where the column is empty, undefined where singles skips the slot. */
  ids: (number | null | undefined)[];
  won: boolean;
}) {
  const { byId } = usePlayerLookup();
  // The name comes from the same lookup as the face. Games used to carry a copy
  // of it; they carry only the id since names moved to people.
  //
  // Singles pass an empty second slot, and a player the lookup has not got —
  // someone removed from the roster — drops the same way rather than rendering
  // a blank face.
  const people = ids
    .map((id) => (id == null ? null : byId.get(id)))
    .filter((player) => !!player)
    .map((player) => ({
      id: player.id,
      name: player.name,
      url: player.avatar_url,
    }));

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
      <div className="flex -space-x-3">
        {people.map((person, i) => (
          <Avatar
            key={i}
            name={person.name}
            url={person.url}
            className={`h-12 w-12 ${won ? "" : "opacity-70"}`}
          />
        ))}
      </div>
      <span
        className={`w-full truncate text-body ${
          won ? "font-semibold text-ink" : "text-ink-faint"
        }`}
      >
        {people.map((p, i) => (
          <span key={p.id}>
            {i > 0 && " / "}
            <AppLink
              to="/app/$clubSlug/players/$playerId"
              params={{ playerId: p.id }}
              className="transition-colors duration-150 hover:text-strike"
            >
              {p.name}
            </AppLink>
          </span>
        ))}
      </span>
    </div>
  );
}
