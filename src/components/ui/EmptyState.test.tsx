import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("always shows the title", () => {
    render(<EmptyState title="No matches yet" />);
    expect(screen.getByText("No matches yet")).toBeInTheDocument();
  });

  it("shows the hint and action when given", () => {
    render(
      <EmptyState
        title="No matches yet"
        hint="Play one to see it here."
        action={<button>Add match</button>}
      />,
    );
    expect(screen.getByText("Play one to see it here.")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add match" }),
    ).toBeInTheDocument();
  });

  it("prefers art over the icon circle — the two are alternatives, not layers", () => {
    render(
      <EmptyState
        title="No matches yet"
        icon={<span data-testid="icon" />}
        art={<span data-testid="art" />}
      />,
    );
    expect(screen.getByTestId("art")).toBeInTheDocument();
    expect(screen.queryByTestId("icon")).not.toBeInTheDocument();
  });
});
