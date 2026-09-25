import { describe, expect, it } from "vitest";
import { translate } from "./translate";

describe("translate — the dictionary without React", () => {
  it("picks the plural form, so a one-member club is not '1 jugadores'", () => {
    expect(translate("es", "public.publicClubs.members", { n: 1 })).toBe(
      "1 jugador",
    );
    expect(translate("es", "public.publicClubs.members", { n: 21 })).toBe(
      "21 jugadores",
    );
  });

  it("reads Spanish for a language it does not know", () => {
    expect(translate("xx", "tournaments.status.done")).toBe(
      translate("es", "tournaments.status.done"),
    );
  });

  it("reads the language asked for", () => {
    expect(translate("en", "games.doubles")).not.toBe(
      translate("es", "games.doubles"),
    );
  });
});
