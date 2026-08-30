import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Toggle } from "./Toggle";

describe("Toggle", () => {
  it("is a real checkbox, reflecting the checked prop", () => {
    render(<Toggle checked label="Send notifications" onChange={() => {}} />);
    expect(
      screen.getByRole("checkbox", { name: "Send notifications" }),
    ).toBeChecked();
  });

  it("reports the new checked state on change, since the whole row is the label", async () => {
    const onChange = vi.fn();
    render(
      <Toggle checked={false} label="Send notifications" onChange={onChange} />,
    );
    await userEvent.click(screen.getByText("Send notifications"));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("cannot be toggled while disabled", async () => {
    const onChange = vi.fn();
    render(
      <Toggle
        checked={false}
        label="Send notifications"
        onChange={onChange}
        disabled
      />,
    );
    expect(
      screen.getByRole("checkbox", { name: "Send notifications" }),
    ).toBeDisabled();
    await userEvent.click(screen.getByText("Send notifications"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("shows the hint when given one", () => {
    render(
      <Toggle
        checked={false}
        label="Send notifications"
        hint="Only for your own matches"
        onChange={() => {}}
      />,
    );
    expect(screen.getByText("Only for your own matches")).toBeInTheDocument();
  });
});
