import { describe, expect, it } from "vitest";
import { broadcastTitle } from "./broadcastTitle";

const base = {
  side1: ["Ana"],
  side2: ["Luis"],
  clubName: "Club Billar",
};

describe("broadcastTitle", () => {
  it("names a league fixture without a stage", () => {
    expect(
      broadcastTitle({
        ...base,
        tournament: { name: "Liga Invierno" },
        match: { bracket: "league", round: 3, group_no: null },
      }),
    ).toBe("Liga Invierno — Ana vs Luis");
  });

  it("adds the stage for a knockout or group fixture", () => {
    expect(
      broadcastTitle({
        ...base,
        tournament: { name: "Open" },
        match: { bracket: "winners", round: 2, group_no: null },
      }),
    ).toBe("Open · Cuadro de ganadores · Ronda 2 — Ana vs Luis");
    expect(
      broadcastTitle({
        ...base,
        tournament: { name: "Open" },
        match: { bracket: "group", round: 1, group_no: 3 },
      }),
    ).toBe("Open · Grupo 3 — Ana vs Luis");
  });

  it("names a casual game by its players and club, doubles joined", () => {
    expect(
      broadcastTitle({
        ...base,
        side1: ["Ana", "Bea"],
        side2: ["Luis", "Marc"],
        tournament: null,
        match: null,
      }),
    ).toBe("Ana / Bea vs Luis / Marc · Club Billar");
  });

  it("stays within 100 chars by shortening the tournament, never the players", () => {
    const title = broadcastTitle({
      ...base,
      tournament: { name: "X".repeat(120) },
      match: { bracket: "final", round: 1, group_no: null },
    });
    expect(title.length).toBe(100);
    expect(title.endsWith("… · Final — Ana vs Luis")).toBe(true);
  });

  it("drops characters YouTube refuses", () => {
    expect(
      broadcastTitle({
        ...base,
        side1: ["<Ana>"],
        tournament: null,
        match: null,
      }),
    ).toBe("Ana vs Luis · Club Billar");
  });
});
