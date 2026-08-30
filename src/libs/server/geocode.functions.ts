import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { toPlace, type Place, type PhotonFeature } from "@/libs/algorithms/geocode";

/**
 * Address search, on the server.
 *
 * Server-side rather than fetched from the browser: Photon is a free community
 * service and asks callers to identify themselves and behave, which is a
 * promise only one origin can keep — a thousand browsers calling it directly
 * are a thousand anonymous clients we cannot rate-limit or fix.
 *
 * Every input is validated: a server function is a public HTTP endpoint
 * whatever it looks like from the call site.
 */

const PHOTON = "https://photon.komoot.io/api";

/** Photon is a suggestion box, not a search engine: five is what fits. */
const LIMIT = 5;

export const searchPlaces = createServerFn({ method: "GET" })
  .validator(z.object({ q: z.string().trim().min(3).max(120) }))
  .handler(async ({ data }): Promise<Place[]> => {
    const url = new URL(PHOTON);
    url.searchParams.set("q", data.q);
    url.searchParams.set("limit", String(LIMIT));

    try {
      const res = await fetch(url, {
        headers: {
          // Photon's usage policy: say who you are. No key to send.
          "User-Agent": "PoolClubs (https://github.com/pauladelavictoria)",
        },
        // A third party being slow must not hold a keystroke's request open.
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return [];

      const body: unknown = await res.json();
      const features = (body as { features?: PhotonFeature[] })?.features ?? [];
      // An empty list is the honest answer to "we could not geocode that", and
      // it is what the picker already renders as "no results" — there is
      // nothing the admin could do with an error message about a geocoder.
      return features.flatMap((f) => {
        const place = toPlace(f);
        return place ? [place] : [];
      });
    } catch {
      return [];
    }
  });
