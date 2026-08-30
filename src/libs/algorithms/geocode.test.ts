/**
 * The features below are trimmed copies of real photon.komoot.io responses.
 * Photon's own field set varies by what matched — a house number, a town, a
 * pub — and every branch in toPlace() exists because of one of these shapes.
 */
import { describe, expect, it } from "vitest";
import { countryName, placeLabel, toPlace } from "./geocode";

describe("toPlace", () => {
  it("joins number and street for a street address; city and country come through", () => {
    expect(
      toPlace({
        geometry: { coordinates: [-3.7038, 40.4168] },
        properties: {
          name: "12",
          housenumber: "12",
          street: "Calle Mayor",
          city: "Madrid",
          state: "Comunidad de Madrid",
          countrycode: "es",
        },
      }),
    ).toEqual({
      address: "Calle Mayor 12",
      city: "Madrid",
      country: "ES",
      lat: 40.4168,
      lon: -3.7038,
    });
  });

  it("uses the name as the address for a named venue with no street", () => {
    expect(
      toPlace({
        geometry: { coordinates: [2.1734, 41.3851] },
        properties: {
          name: "Billar Barcelona",
          city: "Barcelona",
          countrycode: "ES",
        },
      })?.address,
    ).toBe("Billar Barcelona");
  });

  it("handles a village rather than a city, and a country Photon spells lowercase", () => {
    expect(
      toPlace({
        geometry: { coordinates: [1.0, 42.0] },
        properties: { name: "Aigües", village: "Aigües", countrycode: "es" },
      }),
    ).toEqual({ address: "Aigües", city: "Aigües", country: "ES", lat: 42, lon: 1 });
  });

  it("returns null when unusable: no coordinates, out-of-range coordinates, nothing to name it by", () => {
    expect(toPlace({ properties: { name: "Nowhere" } })).toBeNull();
    expect(
      toPlace({
        geometry: { coordinates: ["1", "2"] },
        properties: { name: "x" },
      }),
    ).toBeNull();
    expect(
      toPlace({ geometry: { coordinates: [0, 91] }, properties: { name: "x" } }),
    ).toBeNull();
    expect(
      toPlace({ geometry: { coordinates: [0, 0] }, properties: {} }),
    ).toBeNull();
  });

  it("drops a malformed country code rather than storing it — the CHECK in sql/schema.sql would reject it anyway", () => {
    expect(
      toPlace({
        geometry: { coordinates: [0, 0] },
        properties: { name: "Somewhere", countrycode: "XYZ" },
      })?.country,
    ).toBe("");
  });
});

describe("placeLabel", () => {
  const place = {
    address: "Calle Mayor 12",
    city: "Madrid",
    country: "ES",
    lat: 40.4168,
    lon: -3.7038,
  };

  it("reads in the reader's language and skips what is missing", () => {
    expect(placeLabel(place, "en-GB")).toBe("Calle Mayor 12, Madrid, Spain");
    expect(placeLabel(place, "es-ES")).toBe("Calle Mayor 12, Madrid, España");
    expect(placeLabel({ ...place, address: "", country: "" }, "en-GB")).toBe(
      "Madrid",
    );
  });
});

describe("countryName", () => {
  it("renders, passes through, or ignores the country code", () => {
    expect(countryName("FR", "fr-FR")).toBe("France");
    expect(countryName("", "en-GB")).toBe("");
    expect(countryName("es", "en-GB")).toBe(""); // must be uppercase by here
  });
});
