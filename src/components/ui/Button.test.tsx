import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button, IconButton } from "./Button";

describe("Button", () => {
  it("fires onClick", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("vibrates on a primary click, as tactile confirmation the UI heard it", async () => {
    const vibrate = vi.fn();
    Object.defineProperty(navigator, "vibrate", {
      value: vibrate,
      configurable: true,
    });
    render(<Button>Primary</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Primary" }));
    expect(vibrate).toHaveBeenCalledWith(8);
  });

  it("does not vibrate on a secondary click — that confirmation is reserved for the one action on the screen", async () => {
    const vibrate = vi.fn();
    Object.defineProperty(navigator, "vibrate", {
      value: vibrate,
      configurable: true,
    });
    render(<Button variant="secondary">Cancel</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(vibrate).not.toHaveBeenCalled();
  });

  it("does not fire onClick while disabled", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Save
      </Button>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("IconButton", () => {
  it("uses the label prop as its accessible name, since an icon-only button has no text", () => {
    render(<IconButton label="Close">×</IconButton>);
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });
});
