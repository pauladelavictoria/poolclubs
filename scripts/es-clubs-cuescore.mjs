/**
 * Cuescore mining: the clubs no federation publishes.
 *
 * Four of Spain's billiards federations put a club list on the web (see
 * scripts/es-clubs.sources.json). The rest put nothing — but they all run their
 * competitions on Cuescore, and a tournament record names the venue it was
 * played at, with a street address. That is how Galicia, Asturias and Castilla y
 * León get into the directory at all.
 *
 * The walk is organization -> tournaments -> venues, then the venues' owning
 * organizations -> their tournaments -> more venues. It starts from the
 * federations' own public Cuescore pages and never guesses an id.
 *
 * Two limits are deliberate and should stay:
 *
 *   - Only api.cuescore.com, their published API. The website's own data calls
 *     live under /ajax/, which cuescore.com/robots.txt disallows.
 *   - No id enumeration. There is no search endpoint, and walking ids from 1
 *     would be copying their database rather than using their API.
 *
 * Output is scripts/es-clubs.cuescore.json, in the same shape as the
 * hand-written rosters, which es-clubs.mjs reads alongside them. Slow and
 * occasional: run it when you want to refresh, commit the result, and let the
 * fast SQL generation read the committed file.
 *
 * Usage: `npm run clubs:es:mine`.
 */
import { readFile, writeFile } from "node:fs/promises";

const API = "https://api.cuescore.com";
const OUT = "scripts/es-clubs.cuescore.json";
/** The raw venues from the last walk, so that changing how they are parsed
 *  costs nothing. Delete it to walk again; it is scratch, not source. */
const CACHE = process.env.ES_CLUBS_CUESCORE_CACHE ?? ".cuescore-cache.json";

/** Their server, their bandwidth. */
const PAUSE_MS = 1500;
/** A ceiling on the walk, so a mistake upstream cannot turn into thousands of
 *  requests. Raise it deliberately, having watched a run finish. */
const MAX_TOURNAMENTS = 800;

/**
 * The federations, by the organization id on their own public Cuescore page
 * (view-source, `organizationId`). Baleares is here with no tournaments of its
 * own today; it costs one request to keep checking.
 */
const FEDERATIONS = [
  { id: 29127022, name: "Real Federación Española de Billar" },
  { id: 8273167, name: "Federació de Billar de la Comunitat Valenciana" },
  { id: 51207841, name: "Federación Madrileña de Billar" },
  { id: 19046977, name: "Federación Andaluza de Billar" },
  { id: 52223809, name: "Federación Balear de Billar" },
];

/**
 * Venues that are not clubs.
 *
 * A federation's own office is a venue on Cuescore — it is where the committee
 * meets and sometimes where a final is played — and it turns up in the walk
 * looking exactly like a club. Matched as a folded prefix: capitalisation on
 * their side does not matter, and neither does the initialism they append
 * ("Federació Billar Comunitat Valenciana (F.B.C.V.)").
 */
const NOT_A_CLUB = new Set([
  // The Valencian federation's office on Carrer de Miramar, Gandia.
  "federacio billar comunitat valenciana",
  // The Castilla y León federation's office, Calle Alondras 50.
  "sala organizadora de eventos",
]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let calls = 0;

async function api(path) {
  if (calls) await sleep(PAUSE_MS);
  calls++;
  try {
    const res = await fetch(`${API}${path}`, {
      headers: {
        "User-Agent": "PoolClubs directory (https://github.com/pauladelavictoria)",
      },
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;
    const text = await res.text();
    // A missing id answers with a plain-text message, not JSON.
    return text.startsWith("{") || text.startsWith("[") ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

/** Loose name comparison: case, accents and punctuation all ignored. */
const fold = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * The town, from Cuescore's free-text `placename`.
 *
 * Two shapes show up: a parenthesised province ("Villares de la Reina
 * (Salamanca)") and a village-then-municipality pair ("Granda, Siero"). Both
 * want the same answer, which is the last administrative name in the string.
 */
export function town(placename) {
  const cleaned = (placename ?? "")
    // The same country tail the address carries, because this is also used as
    // the fallback when `placename` is empty — without it four venues came out
    // of the walk living in a town called "- Spain".
    .replace(/\s*-\s*Spain\s*$/i, "")
    .replace(/\([^)]*\)/g, "")
    .trim();
  if (!cleaned) return null;
  const parts = cleaned
    .split(",")
    // "28013 Madrid" is the town with a postcode stuck to the front of it.
    .map((p) => p.trim().replace(/^\d{5}\s+/, ""))
    // A bare postcode is not a town name, and neither is the country.
    .filter((p) => p && !/^\d{5}$/.test(p) && !/^spain$/i.test(p));
  return parts.at(-1) ?? null;
}

/**
 * The street, from Cuescore's one-line address.
 *
 * They store it as "<street>, <postcode> <town> - Spain", give or take: the
 * country tail is dropped, and so is the trailing chunk that is just a postcode
 * and the town, since the town is a column of its own. Anything that does not
 * match that shape is returned as-is rather than mangled.
 */
export function street(address) {
  if (!address) return null;
  const body = address
    .replace(/\s*-\s*Spain\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  const parts = body.split(",").map((p) => p.trim()).filter(Boolean);
  // Drop trailing "28013 Madrid" / "Madrid" chunks; keep at least one.
  while (parts.length > 1 && /^\d{5}\b/.test(parts.at(-1))) parts.pop();
  const out = parts.join(", ").trim();
  return out || null;
}

/** The walk, or the last walk's answer. */
async function walk() {
  try {
    const cached = JSON.parse(await readFile(CACHE, "utf8"));
    console.log(`${cached.length} venues from ${CACHE} (delete it to walk again)`);
    return cached;
  } catch {
    // No cache. Walk.
  }
  const venues = await crawl();
  await writeFile(CACHE, JSON.stringify(venues));
  return venues;
}

async function crawl() {
  const venues = new Map();
  const seenOrgs = new Set();
  const seenTournaments = new Set();
  // Federations first, then the organizations that own the venues they played
  // at — a club that hosts its own league is how the next layer is found.
  const queue = FEDERATIONS.map((f) => ({ ...f, depth: 0 }));

  while (queue.length) {
    const org = queue.shift();
    if (seenOrgs.has(org.id)) continue;
    seenOrgs.add(org.id);

    const tournaments = await api(`/organization/?id=${org.id}`);
    if (!Array.isArray(tournaments)) continue;
    console.log(`${org.name} (${org.id}): ${tournaments.length} tournaments`);

    for (const id of tournaments) {
      if (seenTournaments.has(id)) continue;
      if (seenTournaments.size >= MAX_TOURNAMENTS) {
        console.warn(`  stopping at the ${MAX_TOURNAMENTS}-tournament ceiling`);
        queue.length = 0;
        break;
      }
      seenTournaments.add(id);

      const t = await api(`/tournament/?id=${id}`);
      for (const v of t?.venues ?? []) {
        if (v.country?.alpha3 !== "ESP") continue;
        if (!venues.has(v.venueId)) venues.set(v.venueId, v);
        const owner = v.owner;
        if (
          org.depth < 1 &&
          owner?.organizationId &&
          owner.country?.alpha3 === "ESP" &&
          !seenOrgs.has(owner.organizationId)
        )
          queue.push({
            id: owner.organizationId,
            name: owner.name,
            depth: org.depth + 1,
          });
      }
      process.stdout.write(
        `\r  ${seenTournaments.size} tournaments, ${venues.size} venues, ${queue.length} orgs queued   `,
      );
    }
    process.stdout.write("\n");
  }

  return [...venues.values()];
}

async function main() {
  const venues = await walk();

  // A venue with no town cannot be placed on a map or meaningfully told apart
  // from another of the same name. The federation rosters already carry most of
  // those by name.
  const clubs = venues
    .map((v) => ({
      name: v.name.trim().slice(0, 60),
      address: street(v.address),
      city: town(v.placename) ?? town(v.address),
      venueId: v.venueId,
      // Recorded, not imported: the licence on a venue's own uploaded logo is
      // Cuescore's business and has not been read. It is here so the decision
      // can be made later without re-mining.
      ...(v.image ? { image: v.image } : {}),
      tables: (v.tables ?? []).length,
    }))
    .filter(
      (c) =>
        c.city && ![...NOT_A_CLUB].some((x) => fold(c.name).startsWith(x)),
    )
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  const dropped = venues.length - clubs.length;
  await writeFile(
    OUT,
    JSON.stringify(
      {
        _note:
          "Generated by scripts/es-clubs-cuescore.mjs — do not hand-edit. " +
          "Venues that hosted a tournament run by a Spanish billiards " +
          "federation, or by a club that hosts its own, read from Cuescore's " +
          "published API. `image` and `tables` are recorded but not imported.",
        rosters: [
          {
            source: "cuescore",
            name: "Cuescore — venues of Spanish federation tournaments",
            url: "https://api.cuescore.com/",
            fetched: new Date().toISOString().slice(0, 10),
            clubs,
          },
        ],
      },
      null,
      2,
    ) + "\n",
  );

  console.log(
    `\n${clubs.length} clubs (${dropped} dropped: no town, or not a club), ` +
      `${calls} API calls.`,
  );
  console.log(`Wrote ${OUT}.`);
}

async function selftest() {
  const { strict: assert } = await import("node:assert");
  assert.equal(town("Villares de la Reina (Salamanca)"), "Villares de la Reina");
  assert.equal(town("Granda, Siero"), "Siero");
  assert.equal(town("Pontevedra"), "Pontevedra");
  assert.equal(town(""), null);
  assert.equal(town(null), null);
  // The address fallback used to leak the country tail through as a town.
  assert.equal(town(" - Spain"), null);
  assert.equal(town("Calle Mayor 4, 28013 Madrid - Spain"), "Madrid");

  assert.equal(
    street("Avinguda Pla de Messell  2, 03560 Campello - Spain"),
    "Avinguda Pla de Messell 2",
  );
  // Two postcode chunks, both stripped: what is left is the parish, and the
  // town comes from `placename` anyway.
  assert.equal(street("Adai, 27162 Corgo, 27162 Lugo - Spain"), "Adai");
  assert.equal(street(" Estepona - Spain"), "Estepona");
  assert.equal(street(""), null);
  // No postcode to strip: the whole line is the street.
  assert.equal(street("Federico Olmeda 15 - Spain"), "Federico Olmeda 15");
  console.log("selftest ok");
}

if (process.argv.includes("--selftest")) await selftest();
else await main();
