/**
 * The one thing the geometry tests cannot see: that a shape in `shot_paths`
 * actually comes out of the renderer as that shape. Every drill diagram in the
 * app — the card, the detail page, the public page, the editor — goes through
 * this component, so this is all four at once.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import PoolTableDiagram from "./PoolTableDiagram";
import type { ShotPath } from "@/types";

// The diagram picks its artwork by theme, and theme asks the OS. jsdom has no
// matchMedia, so it gets the dark answer and this stays a test about shapes.
beforeAll(() => {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
});

const draw = (paths: ShotPath[], selectedIndex?: number) =>
  render(
    <PoolTableDiagram
      ballPositions={[]}
      shotPaths={paths}
      selected={
        selectedIndex === undefined
          ? null
          : { kind: "path", index: selectedIndex }
      }
    />,
  ).container;

describe("PoolTableDiagram shapes", () => {
  it("draws a circle from its centre and rim point", () => {
    const svg = draw([{ x1: 50, y1: 25, x2: 58, y2: 25, shape: "circle" }]);
    // The felt's own spots are circles too, so this asks for the one at (50,25).
    const circle = svg.querySelector('circle[cx="50"][cy="25"]');
    expect(circle?.getAttribute("r")).toBe("8");
    expect(circle?.getAttribute("fill")).toBe("none");
  });

  it("draws a rectangle from opposite corners, given in either order", () => {
    const svg = draw([{ x1: 40, y1: 30, x2: 20, y2: 10, shape: "rect" }]);
    const rect = svg.querySelector('rect[width="20"]');
    expect(rect?.getAttribute("x")).toBe("20");
    expect(rect?.getAttribute("y")).toBe("10");
    expect(rect?.getAttribute("height")).toBe("20");
  });

  it("leaves a shape without an arrowhead, and keeps one on a line", () => {
    const shapes = draw([{ x1: 50, y1: 25, x2: 58, y2: 25, shape: "circle" }]);
    expect(shapes.querySelector("[marker-end]")).toBeNull();

    const line = draw([{ x1: 10, y1: 10, x2: 30, y2: 10 }]);
    expect(line.querySelector("[marker-end]")).not.toBeNull();
  });

  it("puts four resize handles on a selected shape and none on an unselected one", () => {
    const rect: ShotPath = { x1: 20, y1: 10, x2: 40, y2: 30, shape: "rect" };
    // The handles are the only filled circles in the drawing besides the
    // felt's two spots, which are not on the accent colour.
    const handles = (svg: Element) =>
      svg.querySelectorAll('circle[fill="var(--color-strike)"]');

    expect(handles(draw([rect], 0))).toHaveLength(4);
    expect(handles(draw([rect]))).toHaveLength(0);
  });
});
