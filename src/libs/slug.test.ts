/**
 * The point of these assertions is the SQL: every case below is also what
 * public.slugify() in sql/club-slug.sql must return. If you change one,
 * change both.
 */
import { describe, expect, it } from "vitest";
import { RESERVED_SLUGS, isValidSlug, needsIdSuffix, slugify } from "./slug";

describe("slugify", () => {
  it("handles the ordinary case", () => {
    expect(slugify("Paula's Pool")).toBe("paulas-pool");
    expect(slugify("Billar Union Club")).toBe("billar-union-club");
  });

  it("folds accents to ASCII rather than turning them into separators", () => {
    expect(slugify("Peña Billar")).toBe("pena-billar");
    expect(slugify("Café Français")).toBe("cafe-francais");
    expect(slugify("Åre Biljard")).toBe("are-biljard");
    expect(slugify("Straße 8")).toBe("strasse-8");
  });

  it("collapses runs of punctuation to one hyphen and trims the ends", () => {
    expect(slugify("  --Pool--  Hall!!  ")).toBe("pool-hall");
    expect(slugify("8-Ball / 9-Ball")).toBe("8-ball-9-ball");
  });

  it("still produces a valid slug for a name with nothing usable in it, because the CHECK constraint requires a leading alphanumeric", () => {
    expect(slugify("!!!")).toBe("club");
    expect(slugify("")).toBe("club");
  });

  it("always produces a slug that satisfies the shape the database enforces", () => {
    for (const name of ["Paula's Pool", "Peña", "!!!", "8-Ball / 9-Ball"]) {
      expect(isValidSlug(slugify(name)), name).toBe(true);
    }
  });

  it("slugifies a club named after a reserved word onto it, which is exactly the case the id suffix exists for", () => {
    expect(slugify("Clubs")).toBe("clubs");
    expect(needsIdSuffix(slugify("Clubs"))).toBe(true);
  });
});

describe("needsIdSuffix", () => {
  it("flags reserved segments — the ones a static route would shadow", () => {
    expect(needsIdSuffix("login")).toBe(true);
    expect(needsIdSuffix("clubs")).toBe(true);
    expect(needsIdSuffix("paulas-pool")).toBe(false);
  });
});

describe("isValidSlug", () => {
  it("rejects a reserved segment", () => {
    expect(isValidSlug("login")).toBe(false);
  });

  it("enforces the shape rules", () => {
    expect(isValidSlug("-leading-hyphen")).toBe(false);
    expect(isValidSlug("Upper")).toBe(false);
    expect(isValidSlug("has space")).toBe(false);
    expect(isValidSlug("acentué")).toBe(false);
    expect(isValidSlug("1")).toBe(true);
  });
});

describe("RESERVED_SLUGS", () => {
  it("is not empty", () => {
    expect(RESERVED_SLUGS.length).toBeGreaterThan(0);
  });
});
