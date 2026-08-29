import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ConfirmButton from "./ConfirmButton";

describe("ConfirmButton", () => {
  it("arms on the first press rather than confirming immediately", async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmButton onConfirm={onConfirm} confirmLabel="Really delete?">
        Delete
      </ConfirmButton>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Really delete?" }),
    ).toBeInTheDocument();
  });

  it("confirms on the second press", async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmButton onConfirm={onConfirm} confirmLabel="Really delete?">
        Delete
      </ConfirmButton>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Really delete?" }),
    );
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  describe("disarming", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("disarms itself a few seconds after arming, so a destructive button left on a bar does not stay armed", () => {
      const onConfirm = vi.fn();
      render(
        <ConfirmButton onConfirm={onConfirm} confirmLabel="Really delete?">
          Delete
        </ConfirmButton>,
      );
      fireEvent.click(screen.getByRole("button", { name: "Delete" }));
      expect(
        screen.getByRole("button", { name: "Really delete?" }),
      ).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(4000);
      });

      expect(
        screen.getByRole("button", { name: "Delete" }),
      ).toBeInTheDocument();
      expect(onConfirm).not.toHaveBeenCalled();
    });
  });
});
