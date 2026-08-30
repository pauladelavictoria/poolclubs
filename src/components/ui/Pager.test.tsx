import { render, screen } from "@/test/render";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Pager } from "./Pager";

vi.mock("@/i18n", async (importOriginal) => {
  const { mockI18nModule } = await import("@/test/mockI18n");
  return mockI18nModule(await importOriginal());
});

describe("Pager", () => {
  it("renders nothing when everything fits on one page, so callers don't each guard", () => {
    const { container } = render(
      <Pager page={1} pageSize={20} totalCount={10} onPage={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the current page over the total", () => {
    render(<Pager page={2} pageSize={10} totalCount={35} onPage={() => {}} />);
    expect(screen.getByText("2 / 4")).toBeInTheDocument();
  });

  it("disables previous on the first page", () => {
    render(<Pager page={1} pageSize={10} totalCount={35} onPage={() => {}} />);
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
  });

  it("disables next on the last page", () => {
    render(<Pager page={4} pageSize={10} totalCount={35} onPage={() => {}} />);
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("moves one page at a time", async () => {
    const onPage = vi.fn();
    render(<Pager page={2} pageSize={10} totalCount={35} onPage={onPage} />);
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onPage).toHaveBeenCalledWith(3);
    await userEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(onPage).toHaveBeenCalledWith(1);
  });
});
