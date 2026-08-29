import { describe, expect, it } from "vitest";
import { buildKnockout, buildLeague } from "./generate";
import { placings, raceFor } from "./podium";
import { field, ids, playOut } from "./testHelpers";

describe("raceFor — race lengths", () => {
  const races = { race_to: 5, race_semi: 6, race_final: 7 };

  it("gives double elimination a semi race for the last round of each half and a final race for the grand final", () => {
    // Double elimination: the grand final is the final, and the last round of
    // each half is a semi — both of them feed it.
    const de = buildKnockout(field(8), { doubleElim: true }, ids());
    const race = (m: (typeof de)[number]) => raceFor(m, races, de);
    const lastWinners = Math.max(
      ...de.filter((m) => m.bracket === "winners").map((m) => m.round),
    );
    const lastLosers = Math.max(
      ...de.filter((m) => m.bracket === "losers").map((m) => m.round),
    );

    expect(race(de.find((m) => m.bracket === "final")!)).toBe(7);
    expect(
      race(de.find((m) => m.bracket === "winners" && m.round === lastWinners)!),
    ).toBe(6);
    expect(
      race(de.find((m) => m.bracket === "losers" && m.round === lastLosers)!),
    ).toBe(6);
    expect(
      race(de.find((m) => m.bracket === "winners" && m.round === 1)!),
      "an opener is the base race",
    ).toBe(5);
  });

  it("labels a single-elimination semi and final without double-counting either", () => {
    // Single elimination: the last winners round is the semi, and the match
    // after it is already labelled `final` — so nothing is counted as both.
    const se = buildKnockout(field(8), { doubleElim: false }, ids());
    const semis = se.filter((m) => m.bracket === "winners" && m.round === 2);
    expect(semis.length).toBe(2);
    for (const m of semis) expect(raceFor(m, races, se)).toBe(6);
    expect(raceFor(se.find((m) => m.bracket === "final")!, races, se)).toBe(
      7,
    );
  });

  it("gives a round robin no closing stage", () => {
    const league = buildLeague(field(4), 1, ids());
    for (const m of league) expect(raceFor(m, races, league)).toBe(5);
  });

  it("falls back unset overrides to the base race rather than to nothing", () => {
    const de = buildKnockout(field(8), { doubleElim: true }, ids());
    const flat = { race_to: 4, race_semi: null, race_final: null };
    for (const m of de) expect(raceFor(m, flat, de)).toBe(4);
  });
});

describe("placings — the podium", () => {
  it("makes third place one player in double elimination, since the losers final decides it", () => {
    const played = playOut(buildKnockout(field(8), { doubleElim: true }, ids()));
    const { first, second, third } = placings(played);
    expect(first, "the top seed wins out").toBe(1);
    expect(second).not.toBeNull();
    expect(second).not.toBe(first);
    expect(third.length, "third place was actually played").toBe(1);
    expect(!third.includes(first!) && !third.includes(second!)).toBe(true);
  });

  it("never separates the two beaten semi-finalists in single elimination", () => {
    const played = playOut(
      buildKnockout(field(8), { doubleElim: false }, ids()),
    );
    const { first, second, third } = placings(played);
    expect(first).toBe(1);
    expect(third.length, "joint third").toBe(2);
    expect(
      new Set([first, second, ...third]).size,
      "four distinct names",
    ).toBe(4);
  });

  it("has nobody in third for a two-player final", () => {
    const played = playOut(buildKnockout(field(2), { doubleElim: true }, ids()));
    expect(placings(played)).toEqual({ first: 1, second: 2, third: [] });
  });

  it("shows nothing until the final has been played", () => {
    const unplayed = buildKnockout(field(4), { doubleElim: true }, ids());
    expect(placings(unplayed)).toEqual({
      first: null,
      second: null,
      third: [],
    });
  });
});
