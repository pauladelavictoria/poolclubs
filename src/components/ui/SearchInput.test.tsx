import { useState } from "react";
import { render, screen } from "@/test/render";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SearchInput } from "./SearchInput";

vi.mock("@/i18n", async (importOriginal) => {
  const { mockI18nModule } = await import("@/test/mockI18n");
  return mockI18nModule(await importOriginal());
});

function Controlled({ initial = "" }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <SearchInput value={value} onChange={setValue} placeholder="Search…" />
  );
}

describe("SearchInput", () => {
  it("reports typed text through onChange", async () => {
    render(<Controlled />);
    await userEvent.type(screen.getByPlaceholderText("Search…"), "paula");
    expect(screen.getByPlaceholderText("Search…")).toHaveValue("paula");
  });

  it("shows no clear button when empty", () => {
    render(<Controlled />);
    expect(
      screen.queryByRole("button", { name: "Clear" }),
    ).not.toBeInTheDocument();
  });

  it("shows a clear button once there is text, and it empties the field", async () => {
    render(<Controlled initial="paula" />);
    const clear = screen.getByRole("button", { name: "Clear" });
    await userEvent.click(clear);
    expect(screen.getByPlaceholderText("Search…")).toHaveValue("");
  });
});
