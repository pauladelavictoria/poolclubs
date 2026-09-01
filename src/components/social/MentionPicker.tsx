import { Avatar } from "@/components/ui/Avatar";
import type { Mentionable } from "@/hooks/useMentionPicker";

/**
 * The `@` picker: a list of people over the comment box, the way every chat app
 * does it — face, name, slug, one row highlighted and moved with the arrows.
 *
 * Anchored above the field rather than below it. A composer sits at the bottom
 * of a thread, and on a phone the keyboard takes the half of the screen a
 * downward list would open into.
 *
 * The caller owns the state, because the keys that drive this arrive at its
 * input — see useMentionPicker.
 */
export function MentionPicker({
  people,
  active,
  onHighlight,
  onPick,
  id,
}: {
  people: Mentionable[];
  active: number;
  onHighlight: (index: number) => void;
  onPick: (slug: string) => void;
  /** Ties the highlighted row to the input's aria-activedescendant. */
  id: string;
}) {
  if (!people.length) return null;

  return (
    <ul
      role="listbox"
      id={id}
      className="absolute bottom-full left-0 z-40 mb-1 max-h-64 w-full overflow-y-auto overflow-x-hidden rounded-card border border-hairline bg-felt-raised py-1"
    >
      {people.map((person, i) => (
        <li key={person.slug}>
          <button
            type="button"
            id={`${id}-${i}`}
            role="option"
            aria-selected={i === active}
            // onMouseDown, not onClick: the input loses focus on mousedown and
            // a blur that closed the list would take the click with it.
            onMouseDown={(e) => {
              e.preventDefault();
              onPick(person.slug);
            }}
            onMouseEnter={() => onHighlight(i)}
            className={`flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors duration-100 ${
              i === active ? "bg-strike-tint text-ink" : "text-ink-soft"
            }`}
          >
            <Avatar
              name={person.name}
              url={person.avatar_url}
              seed={person.slug}
              className="h-6 w-6"
            />
            <span className="truncate text-body font-medium">
              {person.name}
            </span>
            <span className="truncate font-mono text-caption text-ink-faint">
              @{person.slug}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
