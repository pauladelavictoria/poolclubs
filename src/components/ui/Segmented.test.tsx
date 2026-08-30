import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Segmented } from "./Segmented";

const options = [
  { value: "bracket", label: "Bracket" },
  { value: "list", label: "List" },
] as const;

describe("Segmented", () => {
  it("renders as a tablist with one tab per option", () => {
    render(
      <Segmented
        value="bracket"
        onChange={() => {}}
        options={[...options]}
        label="View"
      />,
    );
    expect(screen.getByRole("tablist", { name: "View" })).toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(2);
  });

  it("marks the current value's tab as selected, and no other", () => {
    render(
      <Segmented
        value="list"
        onChange={() => {}}
        options={[...options]}
        label="View"
      />,
    );
    expect(screen.getByRole("tab", { name: "List" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Bracket" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("reports the picked option's value on click", async () => {
    const onChange = vi.fn();
    render(
      <Segmented
        value="bracket"
        onChange={onChange}
        options={[...options]}
        label="View"
      />,
    );
    await userEvent.click(screen.getByRole("tab", { name: "List" }));
    expect(onChange).toHaveBeenCalledWith("list");
  });
});
