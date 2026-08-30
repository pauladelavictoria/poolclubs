/**
 * Turning a typed address into coordinates, via Photon.
 *
 * Photon (photon.komoot.io) is an OpenStreetMap geocoder: no API key, no
 * signup, and unlike Nominatim's 1-request-per-second policy it is built for
 * exactly what the settings form does — search-as-you-type. The alternatives
 * all wanted either a key with a daily quota or a 100GB planet import.
 *
 * This file is the pure half: the shape of a Photon feature and how it folds
 * into the five columns `clubs` stores. The fetch lives in
 * geocode.functions.ts so it stays on the server, and so this half can be
 * checked without one — see geocode.test.ts.
 */

/** What the club stores, and what one suggestion in the picker is. */
export type Place = {
  /** Street and number, or the venue's name when the match is a place. */
  address: string;
  city: string;
  /** ISO 3166-1 alpha-2, uppercase. Empty when Photon didn't say. */
  country: string;
  lat: number;
  lon: number;
};

/** Only the fields we read; Photon sends a good deal more. */
export type PhotonFeature = {
  geometry?: { coordinates?: unknown } | null;
  properties?: {
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    countrycode?: string;
  } | null;
};

const isFinite2 = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n);

/**
 * One Photon feature as a Place, or null if it isn't usable.
 *
 * Null rather than a partial row: a suggestion with no coordinates is the one
 * thing this whole feature exists to produce, and one with neither a street
 * nor a city is a country outline the admin cannot have meant.
 */
export function toPlace(feature: PhotonFeature): Place | null {
  const coords = feature.geometry?.coordinates;
  if (!Array.isArray(coords)) return null;
  // GeoJSON is [lon, lat] — the opposite order to how everyone says it.
  const [lon, lat] = coords;
  if (!isFinite2(lat) || !isFinite2(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;

  const p = feature.properties ?? {};
  // "Calle Mayor 12", not "12 Calle Mayor". Wrong for anglophone addresses,
  // right for the ones this app has — and it is what the admin sees before
  // they pick, so a bad order is visible rather than silent.
  const street = [p.street, p.housenumber].filter(Boolean).join(" ");
  const address = street || p.name || "";
  const city = p.city || p.town || p.village || p.county || p.state || "";
  if (!address && !city) return null;

  return {
    address,
    city,
    country: /^[a-z]{2}$/i.test(p.countrycode ?? "")
      ? p.countrycode!.toUpperCase()
      : "",
    lat,
    lon,
  };
}

/**
 * The one line a suggestion shows, and the one a club's page shows.
 *
 * The country is rendered from its code in the reader's language rather than
 * stored as text — `Intl.DisplayNames` is in every browser this app supports,
 * so "ES" is "España", "Spain" or "Espagne" depending on who is looking.
 */
export function placeLabel(place: Place, locale: string): string {
  return [place.address, place.city, countryName(place.country, locale)]
    .filter(Boolean)
    .join(", ");
}

export function countryName(code: string, locale: string): string {
  if (!/^[A-Z]{2}$/.test(code)) return "";
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
  } catch {
    // An unknown-but-well-formed code throws rather than returning undefined.
    return code;
  }
}
