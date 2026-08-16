/**
 * Self-check for the Photon → Place fold. No test runner in this project:
 *   node src/libs/geocode.check.ts
 *
 * The features below are trimmed copies of real photon.komoot.io responses.
 * Photon's own field set varies by what matched — a house number, a town, a
 * pub — and every branch in toPlace() exists because of one of these shapes.
 */
import assert from "node:assert/strict";
import { countryName, placeLabel, toPlace } from "./geocode.ts";

// A street address: number and street join, city and country come through.
assert.deepEqual(
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
  {
    address: "Calle Mayor 12",
    city: "Madrid",
    country: "ES",
    lat: 40.4168,
    lon: -3.7038,
  },
);

// A named venue with no street: the name is the address.
assert.deepEqual(
  toPlace({
    geometry: { coordinates: [2.1734, 41.3851] },
    properties: {
      name: "Billar Barcelona",
      city: "Barcelona",
      countrycode: "ES",
    },
  })?.address,
  "Billar Barcelona",
);

// A village rather than a city, and a country Photon spells lowercase.
assert.deepEqual(
  toPlace({
    geometry: { coordinates: [1.0, 42.0] },
    properties: { name: "Aigües", village: "Aigües", countrycode: "es" },
  }),
  { address: "Aigües", city: "Aigües", country: "ES", lat: 42, lon: 1 },
);

// Unusable: no coordinates, out-of-range coordinates, nothing to name it by.
assert.equal(toPlace({ properties: { name: "Nowhere" } }), null);
assert.equal(
  toPlace({ geometry: { coordinates: ["1", "2"] }, properties: { name: "x" } }),
  null,
);
assert.equal(
  toPlace({ geometry: { coordinates: [0, 91] }, properties: { name: "x" } }),
  null,
);
assert.equal(toPlace({ geometry: { coordinates: [0, 0] }, properties: {} }), null);

// A malformed country code is dropped, not stored — the CHECK in
// sql/club-location.sql would reject it anyway.
assert.equal(
  toPlace({
    geometry: { coordinates: [0, 0] },
    properties: { name: "Somewhere", countrycode: "XYZ" },
  })?.country,
  "",
);

// The label reads in the reader's language, and skips what is missing.
const place = {
  address: "Calle Mayor 12",
  city: "Madrid",
  country: "ES",
  lat: 40.4168,
  lon: -3.7038,
};
assert.equal(placeLabel(place, "en-GB"), "Calle Mayor 12, Madrid, Spain");
assert.equal(placeLabel(place, "es-ES"), "Calle Mayor 12, Madrid, España");
assert.equal(
  placeLabel({ ...place, address: "", country: "" }, "en-GB"),
  "Madrid",
);

// Country codes: rendered, passed through, or ignored.
assert.equal(countryName("FR", "fr-FR"), "France");
assert.equal(countryName("", "en-GB"), "");
assert.equal(countryName("es", "en-GB"), ""); // must be uppercase by here

console.log("geocode check passed");
