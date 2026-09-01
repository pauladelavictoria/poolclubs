import { useState } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MentionPicker } from "@/components/social/MentionPicker";
import { useMentionPicker } from "@/hooks/useMentionPicker";

const PEOPLE = [
  { slug: "ana-lopez", name: "Ana López", avatar_url: null },
  { slug: "ana-ruiz", name: "Ana Ruiz", avatar_url: null },
];

/** The composer, reduced to the two parts the picker touches. */
function Composer() {
  const [draft, setDraft] = useState("");
  const picker = useMentionPicker(PEOPLE, draft, setDraft);

  return (
    <div>
      <MentionPicker
        id="m"
        people={picker.matches}
        active={picker.active}
        onHighlight={picker.setHighlight}
        onPick={picker.pick}
      />
      <input
        aria-label="comment"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={picker.onKeyDown}
      />
    </div>
  );
}

describe("the @ picker", () => {
  it("opens on @, walks with the arrows and completes on Enter", async () => {
    const user = userEvent.setup();
    render(<Composer />);
    const input = screen.getByLabelText("comment");

    await user.type(input, "gg @ana");
    expect(screen.getAllByRole("option")).toHaveLength(2);

    await user.keyboard("{ArrowDown}{Enter}");
    expect(input).toHaveValue("gg @ana-ruiz ");
    // Completing closes the list rather than matching the slug it just wrote.
    expect(screen.queryByRole("option")).toBeNull();
  });

  it("closes on Escape and stays closed for that mention", async () => {
    const user = userEvent.setup();
    render(<Composer />);
    const input = screen.getByLabelText("comment");

    await user.type(input, "@ana");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("option")).toBeNull();

    // A second mention later in the same comment opens again.
    await user.type(input, " @ana");
    expect(screen.getAllByRole("option")).toHaveLength(2);
  });
});
