import { useState } from "react";
import {
  applyMention,
  matchMentions,
  mentionDraft,
} from "@/libs/algorithms/mentions";

export type Mentionable = {
  slug: string;
  name: string;
  avatar_url?: string | null;
};

/**
 * The keyboard half of the `@` picker: which people match what is being typed,
 * which of them is highlighted, and what the arrow keys do about it.
 *
 * Split from the list it drives because the keys arrive at the input, not at
 * the list — the composer spreads `onKeyDown` onto its own field and renders
 * `<MentionPicker>` above it.
 *
 * There is no effect resetting the highlight: the index is clamped as it is
 * read, so a list that shrinks under the caret cannot point past its end, and
 * a list that changes entirely starts from the top again on the next keystroke.
 */
export function useMentionPicker<T extends Mentionable>(
  people: T[],
  draft: string,
  setDraft: (next: string) => void,
) {
  const [highlight, setHighlight] = useState(0);
  /** The whole draft as it stood when Escape was pressed. Keyed on the draft
   *  rather than on the fragment because two mentions in one comment can be the
   *  same few letters — dismissing the first would otherwise mute the second —
   *  and because any further typing should bring the list back, as it does in
   *  every chat app. */
  const [closed, setClosed] = useState<string | null>(null);

  const fragment = mentionDraft(draft);
  const matches =
    fragment === null || draft === closed
      ? []
      : matchMentions(people, fragment);
  const active = Math.min(highlight, Math.max(matches.length - 1, 0));

  const pick = (slug: string) => {
    setDraft(applyMention(draft, slug));
    setHighlight(0);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!matches.length) return;

    // Enter and Tab are the two keys that already mean something in a form —
    // submit and leave the field — so both are taken over only while the list
    // is open, and both complete the mention rather than doing that.
    if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      pick(matches[active].slug);
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setHighlight((active + step + matches.length) % matches.length);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setClosed(draft);
    }
  };

  return { matches, active, setHighlight, pick, onKeyDown };
}
