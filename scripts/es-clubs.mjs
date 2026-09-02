/**
 * The Spanish club directory seed: real billiards clubs, from sources that can
 * be checked, never written from memory.
 *
 * Clubs come from scripts/es-clubs.sources.json — hand-transcribed off the
 * federation rosters named in it, one `url` per roster. Those pages carry
 * addresses but no coordinates, so each address is geocoded through Photon: the
 * same geocoder the app itself uses (libs/server/geocode.functions).
 *
 * There used to be an OpenStreetMap pass here as well, sweeping Overpass for
 * sport=billiards and for venues named "billar". It is gone on purpose. What it
 * returned was bars, bowling alleys and — through leisure=adult_gaming_centre —
 * a long list of slot arcades and bingo halls, and the tiles it had to walk
 * spilled into France and Portugal. A federated club is a club; a bar with a
 * table in the corner is not, and telling them apart automatically turned out to
 * be the whole problem. `git log` has it if it is ever wanted back.
 *
 * Output is sql/clubs-seed-es.sql plus sql/clubs-seed-es.sources.json, which
 * says where every single row came from. Nothing here writes to a database —
 * apply the SQL by hand with `npm run db:sql`, and read the header there first.
 *
 * Usage: `npm run clubs:es`, or `node scripts/es-clubs.mjs --selftest` for the
 * assertions on the two bits of real logic (slugging, proximity de-duping).
 */
import { readFile, writeFile } from "node:fs/promises";

const PHOTON = "https://photon.komoot.io/api";
const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const OUT_SQL = "sql/clubs-seed-es.sql";
const OUT_SOURCES = "sql/clubs-seed-es.sources.json";
const ROSTERS = "scripts/es-clubs.sources.json";
/** The Cuescore mining's output, if it has been run. Same shape, generated
 *  rather than hand-written — see scripts/es-clubs-cuescore.mjs. */
const MINED = "scripts/es-clubs.cuescore.json";
/** Everything the geocoders have already answered. Two free services get one
 *  request a second each, so a re-run to change a comment must not ask them
 *  again. Delete it to re-geocode; it is scratch, not source. */
const CACHE = process.env.ES_CLUBS_GEOCODE_CACHE ?? ".geocode-cache.json";
/** The account every imported club is owned by; see the SQL header. */
const OWNER_EMAIL = process.env.ES_CLUBS_OWNER ?? "admin@poolclubs.app";

/** Photon is one person's server. One request at a time, with a pause, is the
 *  price of using it. */
const PHOTON_PAUSE_MS = 1000;
/** Nominatim's usage policy is one request a second, absolute. */
const NOMINATIM_PAUSE_MS = 1100;

// ---------------------------------------------------------------- geography

/** The islands need their own timezone; everything else is peninsular. */
const CANARIES = { south: 27.5, west: -18.3, north: 29.6, east: -13.2 };

const inCanaries = (lat, lon) =>
  lat >= CANARIES.south &&
  lat <= CANARIES.north &&
  lon >= CANARIES.west &&
  lon <= CANARIES.east;

/** Metres between two points. Equirectangular rather than haversine: at the
 *  200m this is asked about, the difference is centimetres. */
export function metresApart(a, b) {
  const R = 6371000;
  const rad = Math.PI / 180;
  const x = (b.lon - a.lon) * rad * Math.cos(((a.lat + b.lat) / 2) * rad);
  const y = (b.lat - a.lat) * rad;
  return Math.sqrt(x * x + y * y) * R;
}

// -------------------------------------------------------------------- slugs

/** The accent map from src/libs/algorithms/slug.ts. The two have to agree, or
 *  a slug computed here fails the clubs_slug_shape CHECK on insert. */
const ACCENTED = "àáäâãåāèéëêēìíïîīòóöôõøōùúüûūñçÿýž";
const PLAIN = "aaaaaaaeeeeeiiiiiooooooouuuuuncyyz";
const RESERVED = ["login", "logout", "join", "clubs", "me", "auth", "api"];

export function slugify(name) {
  const folded = name
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/./g, (ch) => {
      const i = ACCENTED.indexOf(ch);
      return i === -1 ? ch : PLAIN[i];
    });
  const slug = folded
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "club";
}

/**
 * A slug nothing else in this run has taken.
 *
 * Computed here rather than left to the clubs_set_slug trigger, whose `-<id>`
 * suffix comes from a sequence and so differs on every re-run — and the slug is
 * what makes this seed idempotent. The town is the first tiebreaker because
 * "C.B. Sant Feliu" in two towns is two clubs, not one club and a number.
 */
export function uniqueSlug(name, city, taken) {
  const base = slugify(name);
  const candidates = [base, city ? `${base}-${slugify(city)}` : null];
  for (let n = 2; n <= 50; n++) candidates.push(`${base}-${n}`);
  for (const slug of candidates) {
    if (!slug || RESERVED.includes(slug) || taken.has(slug)) continue;
    taken.add(slug);
    return slug;
  }
  throw new Error(`no free slug for ${name}`);
}

/** Ball colours in the order src/types/index.ts lists them. Spread over the
 *  slug so the map is not a hundred yellow pins. */
const BALL_COLORS = [
  "yellow",
  "blue",
  "red",
  "purple",
  "orange",
  "green",
  "maroon",
  "black",
];
const themeColor = (slug) =>
  BALL_COLORS[
    [...slug].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 1024, 7) %
      BALL_COLORS.length
  ];

// -------------------------------------------------------------------- names

const fold = (s) => slugify(s).replace(/-/g, " ");

/**
 * Federation rosters shout and Cuescore mumbles: "C.B.MATARÓ", "DENIA",
 * "elx billar club", "vitoria". Both are unreadable in a directory, so a name
 * written in one case throughout is title cased. A name that mixes the two has a
 * shape of its own — "Break&Run", "TILT Billiard Club", "OrpesaPool" — and that
 * is how its club writes it, so it stays as written.
 */
export function prettyName(raw) {
  const name = raw.trim().replace(/\s+/g, " ");
  if (/\p{Ll}/u.test(name) && /\p{Lu}/u.test(name)) return name;
  const small = new Set(["de", "del", "la", "las", "el", "los", "i", "y", "d"]);
  const cap = (word) =>
    word.toLowerCase().replace(/^\p{L}/u, (c) => c.toUpperCase());
  return name
    .split(" ")
    .map((word, i) => {
      // A dotted initialism keeps its capitals, and comes unstuck from the word
      // the rosters glue to it: "C.B.MATARÓ" is "C.B. Mataró".
      const initialism = word.match(/^((?:\p{L}\.)+)(\p{L}.*)?$/u);
      if (initialism)
        return initialism[2]
          ? `${initialism[1]} ${cap(initialism[2])}`
          : initialism[1];
      const lower = word.toLowerCase();
      if (i > 0 && small.has(lower)) return lower;
      return cap(word);
    })
    .join(" ");
}

/** Spanish numbers, as +34 followed by nine digits. Anything else — a foreign
 *  number, a truncated one, two numbers in one field — is dropped rather than
 *  half-fixed: a wrong phone number on a real business is worse than none. */
export function normalisePhone(raw) {
  if (!raw) return null;
  const digits = raw
    .replace(/[^\d+]/g, "")
    .replace(/^\+?0034/, "")
    .replace(/^\+34/, "");
  return /^[6-9]\d{8}$/.test(digits) ? `+34${digits}` : null;
}

// ------------------------------------------------------------------- photon

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let lastPhoton = 0;
let lastNominatim = 0;

/** Spanish hits for a free-text place query, or null when the call failed. */
async function photon(q) {
  const wait = PHOTON_PAUSE_MS - (Date.now() - lastPhoton);
  if (wait > 0) await sleep(wait);
  lastPhoton = Date.now();
  // No `lang`: Photon speaks default/de/en/fr and answers an unsupported one
  // with an error object rather than results.
  const url = `${PHOTON}?q=${encodeURIComponent(q)}&limit=5`;
  try {
    const res = await fetch(url, {
      // Photon's usage policy, the same identification libs/server/geocode
      // sends from the app.
      headers: {
        "User-Agent": "PoolClubs (https://github.com/pauladelavictoria)",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const { features = [] } = await res.json();
    return features.filter((f) => f.properties?.countrycode === "ES");
  } catch {
    return null;
  }
}

/**
 * Street-type words, which say nothing about which street it is. Everything
 * else in an address line is a chance to recognise the answer.
 */
const STREET_WORDS = new Set([
  "calle", "carrer", "rua", "avenida", "avinguda", "avda", "plaza", "placa",
  "plaça", "passeig", "paseo", "rambla", "ronda", "camino", "cami", "carretera",
  "travessera", "poligono", "poligon", "industrial", "nave", "bajo", "baixos",
  "planta", "local", "esquina", "junto", "frente", "numero",
]);

/**
 * True when a geocoder's answer is on a street the address line names.
 *
 * Compares the words that carry meaning — "Girona" out of "Carrer Girona, 222"
 * — against the street and name the result came back with. One shared word is
 * enough: the answer has already been checked to be in the right town, so this
 * only has to rule out the wrong street in the right place.
 */
export function mentions(address, properties) {
  const words = fold(address)
    .split(" ")
    .filter((w) => w.length >= 4 && !STREET_WORDS.has(w) && !/^\d+$/.test(w));
  if (!words.length) return false;
  const haystack = fold(
    [properties?.street, properties?.name, properties?.district]
      .filter(Boolean)
      .join(" "),
  );
  return words.some((w) => haystack.includes(w));
}

const point = (feature) => ({
  // GeoJSON is lon-first.
  lat: feature.geometry.coordinates[1],
  lon: feature.geometry.coordinates[0],
});

/** How far from the middle of its town a club is still in that town. Generous:
 *  a municipality can be twenty kilometres across, and the alternative to a
 *  loose radius is no pin at all. */
const TOWN_RADIUS_M = 20000;

const townCentres = new Map();

/**
 * The middle of a town, once per town.
 *
 * This exists because matching the town by name does not work. Photon answers in
 * the local language and in the official long form — Alicante comes back as
 * Alacant, Castellón de la Plana as Castelló, Bollullos del Condado as Bollullos
 * Par del Condado — so comparing strings threw away fifteen perfectly good
 * addresses. Comparing distances does not care what the town is called.
 */
async function townCentre(city) {
  if (townCentres.has(city)) return townCentres.get(city);
  const features = await photon(`${city}, España`);
  const hit =
    features?.find((f) => f.properties.osm_key === "place") ?? features?.[0];
  const centre = hit ? point(hit) : null;
  townCentres.set(city, centre);
  return centre;
}

/**
 * One structured address, through Nominatim.
 *
 * Photon is a free-text box: given "Calle Doctor Fleming 12, Mislata" it looks
 * for that street anywhere in Spain and answers with Burgos. Nominatim takes the
 * street and the town as separate fields, which is the question actually being
 * asked, and it gets these right where Photon does not.
 *
 * It does not enforce the town, though — a street that does not exist in the
 * town named comes back from wherever it does exist, 150km away. That is what
 * the distance check at the call site is for.
 */
async function nominatim(street, city) {
  const wait = NOMINATIM_PAUSE_MS - (Date.now() - lastNominatim);
  if (wait > 0) await sleep(wait);
  lastNominatim = Date.now();
  const url = new URL(NOMINATIM);
  url.searchParams.set("street", street);
  url.searchParams.set("city", city);
  url.searchParams.set("country", "Spain");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  try {
    const res = await fetch(url, {
      // Nominatim's usage policy asks for an identifiable agent, and refuses
      // requests without one.
      headers: {
        "User-Agent": "PoolClubs directory (https://github.com/pauladelavictoria)",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const [hit] = await res.json();
    return hit ? { lat: Number(hit.lat), lon: Number(hit.lon) } : null;
  } catch {
    return null;
  }
}

/**
 * Where a club is, as coordinates.
 *
 * The roster's own address text is authoritative and is kept whatever this
 * returns — all that is wanted here is the pin. A wrong pin is worse than no
 * pin, so nothing is accepted on trust:
 *
 *   - an address has to come back near the town the roster names, which is what
 *     catches a street that only exists in another province;
 *   - a club looked up by name has to come back as something actually called
 *     that. Without this check the fallback quietly returned the same unrelated
 *     feature for two different Valencian clubs, and both got the same pin.
 *
 * A club that fails both still goes in the directory. It lists; it does not pin.
 */
/**
 * The geocoders' answers, keyed by the question. A null answer is cached too:
 * "we asked and there is nothing" is worth remembering, and re-asking a free
 * service the same unanswerable question every run is the rude version.
 */
let cache = new Map();

async function loadCache() {
  try {
    cache = new Map(Object.entries(JSON.parse(await readFile(CACHE, "utf8"))));
    console.log(`  ${cache.size} geocodes cached (delete ${CACHE} to redo)`);
  } catch {
    // No cache yet.
  }
}

const saveCache = () =>
  writeFile(CACHE, JSON.stringify(Object.fromEntries(cache), null, 0));

async function locate(club) {
  const key = [club.name, club.address ?? "", club.city ?? ""].join("|");
  if (cache.has(key)) return cache.get(key);
  const found = await geocode(club);
  cache.set(key, found);
  return found;
}

async function geocode(club) {
  if (!club.city) return null;
  const centre = await townCentre(club.city);
  if (!centre) return null;
  const near = (p) => p && metresApart(centre, p) < TOWN_RADIUS_M;

  if (club.address) {
    // The raw line, then the same line with the parenthetical asides that
    // rosters like to append ("(Edificio Ateneo Mar)") taken out.
    const variants = [
      club.address,
      club.address.replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim(),
    ];
    for (const street of [...new Set(variants)].filter(Boolean)) {
      const hit = await nominatim(street, club.city);
      if (near(hit)) return hit;
    }

    // Nominatim wants the street named the way OSM names it, and half these
    // rosters do not: "Camp d'Esports", "Casa Cabanes-Las Fuentes", a
    // polideportivo with no street at all. Photon's free-text index is looser
    // and finds those — but loose is how two clubs ended up sharing one wrong
    // pin, so a hit has to be on a street this address actually mentions.
    const features = await photon(`${club.address}, ${club.city}`);
    const onStreet = features?.find(
      (f) => near(point(f)) && mentions(club.address, f.properties),
    );
    if (onStreet) return point(onStreet);
  }

  // No usable address, or none that resolved. Ask for the club by name, and
  // only take an answer that names it back.
  const wanted = fold(club.name);
  const features = await photon(`${club.name}, ${club.city}`);
  const named = features?.find((f) => {
    const name = f.properties?.name;
    if (!name) return false;
    const got = fold(name);
    return (got.includes(wanted) || wanted.includes(got)) && near(point(f));
  });
  return named ? point(named) : null;
}

// -------------------------------------------------------------------- merge

/**
 * One row per club, dropping the same club listed by two federations — the same
 * name within 200 m. The national roster repeats clubs the regional ones list,
 * which is where this earns its keep.
 */
/**
 * The same club under two rosters' spellings.
 *
 * Exact equality is not enough: one roster writes "C.D. OrpesaPool" and the
 * other "OrpesaPool", 58 metres apart. Containment catches that pair without
 * merging "Club Billar Alcántara" and "Madrid Escuela Nacional", which really
 * are two clubs at one address.
 */
const sameClub = (a, b) => {
  const x = fold(a);
  const y = fold(b);
  return x === y || x.includes(y) || y.includes(x);
};

export function merge(rows) {
  const kept = [];
  const taken = new Set();
  let duplicates = 0;
  for (const row of rows) {
    const twin = kept.find(
      (k) =>
        sameClub(k.name, row.name) &&
        // Both placed: the same club if they are on top of each other. Only one
        // placed: the same club if the rosters agree on the town — which is how
        // a second listing that would not geocode gets folded into the first
        // rather than sitting in the directory as a twin with no pin.
        (k.lat != null && row.lat != null
          ? metresApart(k, row) < 200
          : fold(k.city ?? "") === fold(row.city ?? "")),
    );
    if (twin) {
      duplicates++;
      continue;
    }
    const slug = uniqueSlug(row.name, row.city, taken);
    kept.push({
      ...row,
      slug,
      theme_color: themeColor(slug),
      timezone:
        row.lat != null && inCanaries(row.lat, row.lon)
          ? "Atlantic/Canary"
          : "Europe/Madrid",
    });
  }
  return { kept, duplicates };
}

// ---------------------------------------------------------------------- sql

const lit = (v) =>
  v == null || v === "" ? "NULL" : `'${String(v).replace(/'/g, "''")}'`;
const num = (v) => (v == null ? "NULL" : String(Number(v.toFixed(6))));

function toSql(rows, rosters) {
  const values = rows
    .map(
      (r) =>
        `    (${lit(r.name)}, ${lit(r.slug)}, ${lit(r.address)}, ${lit(r.city)}, ` +
        `${num(r.lat)}, ${num(r.lon)}, ${lit(r.phone)}, ${lit(r.theme_color)}, ${lit(r.timezone)})`,
    )
    .join(",\n");

  const provenance = rosters
    .map((r) => `--   ${r.name}\n--     ${r.url}`)
    .join("\n");

  return `-- =============================================
-- Spanish club directory seed
-- =============================================
--
-- ${rows.length} federated billiards clubs, so that /clubs and its map are a
-- directory rather than an empty page. Generated by scripts/es-clubs.mjs on
-- ${new Date().toISOString().slice(0, 10)} — do not hand-edit this file, edit the script and re-run it.
--
-- Every club here is either on a federation's own published roster, or is a
-- venue that hosted a tournament one of them ran:
${provenance}
--
-- Names, addresses and phone numbers are transcribed from those pages; nothing
-- is invented. Coordinates are geocoded from the address through Photon, which
-- is OpenStreetMap data under ODbL — the directory page carries the credit. A
-- club whose address would not geocode is present without coordinates rather
-- than with guessed ones, so it lists but does not pin.
--
-- Two things the rosters publish are deliberately not here: officers' mobile
-- numbers and the home addresses some small clubs use as their contact address.
-- Those are personal data about named individuals, and a public directory is
-- the wrong place for them. See scripts/es-clubs.sources.json.
--
-- Ownership: every club belongs to ${OWNER_EMAIL}, which must have
-- signed in to the app at least once so that it has an auth.users row —
-- clubs.owner_id is NOT NULL and FK'd there. That account is also the marker
-- for "imported": DELETE FROM clubs WHERE owner_id = <that account> undoes the
-- whole seed, and the ON CONFLICT below refuses to touch a club owned by
-- anybody else, so a re-run can never overwrite a real club that has taken one
-- of these slugs.
--
-- The clubs have no members, no games and no logo. They are directory entries
-- waiting to be claimed, and they sort below any club with members.
--
-- The owner does get a players row in each, flagged is_caretaker: owning a club
-- is not enough to open it in the app, and the flag keeps that row out of
-- member_count and out of the roster. Apply sql/players-caretaker.sql first —
-- without that column this seed will not run.
--
-- Apply with \`npm run db:sql sql/clubs-seed-es.sql\`. That runs against the
-- LINKED project. To rehearse it, copy the file with the final COMMIT changed
-- to ROLLBACK and run that first: every CHECK and trigger fires and nothing
-- persists.
-- =============================================

BEGIN;

DO $seed$
DECLARE
  v_owner_email text := ${lit(OWNER_EMAIL)};
  v_owner_uuid  uuid;
  v_person_id   bigint;
  v_inserted    integer;
  v_joined      integer;
BEGIN
  SELECT id INTO v_owner_uuid FROM auth.users WHERE email = v_owner_email;
  IF v_owner_uuid IS NULL THEN
    RAISE EXCEPTION 'No auth.users row for %. Sign that account in to the app once, then re-run.', v_owner_email;
  END IF;

  -- One person per account, shared across every club — the same rule create_club
  -- follows. The owner has signed in, so this row almost always exists already.
  SELECT id INTO v_person_id FROM people WHERE user_id = v_owner_uuid;
  IF v_person_id IS NULL THEN
    INSERT INTO people (name, user_id) VALUES ('Admin', v_owner_uuid)
    RETURNING id INTO v_person_id;
  END IF;

  WITH seed(name, slug, address, city, lat, lon, phone, theme_color, timezone) AS (
    VALUES
${values}
  ), upserted AS (
    INSERT INTO clubs (name, slug, owner_id, is_public, address, city, country, lat, lon, phone, theme_color, timezone)
    SELECT s.name, s.slug, v_owner_uuid, true, s.address, s.city, 'ES',
           s.lat::double precision, s.lon::double precision, s.phone,
           s.theme_color::"BallColor", s.timezone
    FROM seed s
    ON CONFLICT (slug) DO UPDATE SET
      name = EXCLUDED.name,
      address = EXCLUDED.address,
      city = EXCLUDED.city,
      lat = EXCLUDED.lat,
      lon = EXCLUDED.lon,
      phone = EXCLUDED.phone
    -- Only ever updates a row this seed owns. A club somebody has since made
    -- their own keeps its slug and everything else.
    WHERE clubs.owner_id = v_owner_uuid
    RETURNING id
  ), joined AS (
    -- Owning a club does not open it: the app resolves a club from your
    -- memberships, so without this row the owner cannot reach a single one of
    -- these clubs in the app, nor see them in the club switcher.
    --
    -- is_caretaker is what keeps that honest — the row grants the keys without
    -- counting as a member, so a club nobody has joined still reads as empty in
    -- the directory. See sql/players-caretaker.sql.
    INSERT INTO players (club_id, person_id, category, status, is_caretaker)
    SELECT u.id, v_person_id, 3, 'active', true
    FROM upserted u
    ON CONFLICT (club_id, person_id) DO UPDATE
      SET status = 'active', is_caretaker = true
    RETURNING 1
  )
  SELECT
    (SELECT count(*) FROM upserted),
    (SELECT count(*) FROM joined)
  INTO v_inserted, v_joined;

  RAISE NOTICE 'Spanish club seed: % of % clubs written, % caretaker memberships, owner %',
    v_inserted, ${rows.length}, v_joined, v_owner_email;
END
$seed$;

COMMIT;
`;
}

/**
 * The generated SQL says what it contains; this checks that it does.
 *
 * A seed file went to the database with 124 rows, a trailing comma after the
 * last one, and a header claiming 127. Postgres answered "syntax error at or
 * near )" from inside a 200-line statement, which is a long way from the cause.
 * The file is generated, so the cheapest place to catch that is before it is
 * written — one comma is the difference between a seed and a puzzle.
 */
export function verify(sql, rows) {
  const values = sql.slice(
    sql.indexOf("    VALUES\n") + "    VALUES\n".length,
    sql.indexOf("\n  ), upserted AS ("),
  );
  const lines = values.split("\n");
  if (lines.length !== rows.length)
    throw new Error(
      `${rows.length} clubs but ${lines.length} VALUES rows written`,
    );
  const bad = lines.findIndex((line, i) => {
    const last = i === lines.length - 1;
    return !line.startsWith("    (") || !line.endsWith(last ? ")" : "),");
  });
  if (bad !== -1)
    throw new Error(`malformed VALUES row ${bad + 1}: ${lines[bad].slice(0, 80)}`);
  return sql;
}

// --------------------------------------------------------------------- main

async function selftest() {
  const { strict: assert } = await import("node:assert");
  assert.equal(slugify("Peña Billar"), "pena-billar");
  assert.equal(slugify("C.B. Lliçà d'Amunt"), "c-b-llica-damunt");
  assert.equal(slugify("!!!"), "club");

  const taken = new Set();
  assert.equal(
    uniqueSlug("C.B. Sant Feliu", "Sant Feliu de Codines", taken),
    "c-b-sant-feliu",
  );
  // Same name, another town: the town separates them, no counter needed.
  assert.equal(
    uniqueSlug("C.B. Sant Feliu", "Sant Feliu de Llobregat", taken),
    "c-b-sant-feliu-sant-feliu-de-llobregat",
  );
  assert.equal(uniqueSlug("C.B. Sant Feliu", null, taken), "c-b-sant-feliu-2");
  // Reserved words are unreachable routes, never a slug.
  assert.equal(uniqueSlug("Clubs", null, new Set()), "clubs-2");

  assert.equal(prettyName("C.B.MATARÓ"), "C.B. Mataró");
  assert.equal(prettyName("S.B.P.E.CENTELLES"), "S.B.P.E. Centelles");
  assert.equal(prettyName("BILLARES DE LA UNIÓN"), "Billares de la Unión");
  assert.equal(prettyName("CLUB DE BILLAR SEVILLA"), "Club de Billar Sevilla");
  // Anything with a shape of its own is the club's own spelling.
  assert.equal(prettyName("Break & Run"), "Break & Run");
  assert.equal(prettyName("TILT Billiard Club"), "TILT Billiard Club");
  // Towns arrive shouted and whispered; both read as one thing in a directory.
  assert.equal(prettyName("DENIA"), "Denia");
  assert.equal(prettyName("vitoria"), "Vitoria");
  assert.equal(prettyName("elx billar club"), "Elx Billar Club");
  assert.equal(prettyName("Oropesa del Mar"), "Oropesa del Mar");

  assert.equal(normalisePhone("93 540 37 54"), "+34935403754");
  assert.equal(normalisePhone("+34 628.327.993"), "+34628327993");
  assert.equal(normalisePhone("0034935403754"), "+34935403754");
  assert.equal(normalisePhone("+33 1 23 45 67 89"), null);
  assert.equal(normalisePhone("935403754 / 628327993"), null);

  // 200m apart is one club listed twice; 2km apart is two clubs.
  const bcn = { lat: 41.3851, lon: 2.1734, name: "C.B. Barcelona" };
  const next = { lat: 41.386, lon: 2.174, name: "C.B. Barcelona" };
  const far = { lat: 41.4051, lon: 2.1934, name: "C.B. Barcelona" };
  assert.ok(metresApart(bcn, next) < 200);
  assert.ok(metresApart(bcn, far) > 200);
  assert.equal(merge([bcn, next]).kept.length, 1);
  assert.equal(merge([bcn, far]).kept.length, 2);
  // Same address, different clubs — two sections of one sports centre.
  assert.equal(
    merge([bcn, { ...next, name: "S.B. Coral Colón" }]).kept.length,
    2,
  );
  // One roster's prefix, another's bare name, the same 58 metres apart.
  const orpesa = { lat: 40.0918, lon: 0.1436, name: "C.D. OrpesaPool" };
  assert.equal(
    merge([orpesa, { lat: 40.0923, lon: 0.1438, name: "OrpesaPool" }]).kept
      .length,
    1,
  );
  // The same club listed twice where only one listing would geocode.
  const vigo = { name: "Val Miñor Pool", city: "Gondomar", lat: 42.1, lon: -8.75 };
  assert.equal(
    merge([vigo, { name: "Val Miñor Pool", city: "Gondomar", lat: null }]).kept
      .length,
    1,
  );
  // Same name, different towns, neither placed: two clubs, not one.
  assert.equal(
    merge([
      { name: "C.B. Sant Feliu", city: "Sant Feliu de Codines", lat: null },
      { name: "C.B. Sant Feliu", city: "Sant Feliu de Llobregat", lat: null },
    ]).kept.length,
    2,
  );

  // The street word carries the match; the street-type word must not.
  assert.equal(
    mentions("Carrer Girona, 222", { street: "Carrer de Girona" }),
    true,
  );
  assert.equal(
    mentions("Calle Doctor Fleming, 12", { street: "Carrer del Doctor Flèming" }),
    true,
  );
  // Same town, wrong street: this is the check that stopped two Valencian clubs
  // sharing one pin.
  assert.equal(
    mentions("Carrer Riu Vinalopó 50", { street: "Carrer de la Reina" }),
    false,
  );
  // "Calle" alone says nothing, so nothing matches on it.
  assert.equal(mentions("Calle", { street: "Calle Mayor" }), false);
  assert.equal(mentions("Casino de Osuna", { name: "Casino de Osuna" }), true);

  // The generated file has to agree with itself: one row per club, a comma
  // between them and none after the last.
  const three = [{ name: "a" }, { name: "b" }, { name: "c" }];
  const wrap = (body) =>
    `WITH seed AS (\n    VALUES\n${body}\n  ), upserted AS (\nINSERT`;
  const good = wrap("    ('a'),\n    ('b'),\n    ('c')");
  assert.equal(verify(good, three), good);
  assert.throws(
    () => verify(wrap("    ('a'),\n    ('b'),\n    ('c'),"), three),
    /malformed VALUES row 3/,
  );
  assert.throws(
    () => verify(wrap("    ('a'),\n    ('b')"), three),
    /3 clubs but 2 VALUES rows/,
  );

  assert.equal(inCanaries(28.1, -15.4), true);
  assert.equal(inCanaries(39.47, -0.38), false);

  console.log("selftest ok");
}

/** Every roster: the hand-written ones, then whatever the mining found. Order
 *  matters — the hand-written entries are richer (they have phone numbers) and
 *  merge keeps the first of a duplicate pair. */
async function allRosters() {
  const rosters = JSON.parse(await readFile(ROSTERS, "utf8")).rosters;
  try {
    rosters.push(...JSON.parse(await readFile(MINED, "utf8")).rosters);
  } catch {
    console.warn(`  (no ${MINED} — run \`npm run clubs:es:mine\` for it)`);
  }
  return rosters;
}

async function main() {
  const rosters = await allRosters();
  const rows = [];
  await loadCache();

  for (const roster of rosters) {
    let located = 0;
    for (const club of roster.clubs) {
      const where = await locate(club);
      if (where) located++;
      rows.push({
        name: prettyName(club.name).slice(0, 60),
        address: club.address ?? null,
        city: club.city ? prettyName(club.city) : null,
        lat: where?.lat ?? null,
        lon: where?.lon ?? null,
        phone: normalisePhone(club.phone),
        source: {
          source: roster.source,
          url: roster.url,
          ...(roster.dated ? { dated: roster.dated } : {}),
          ...(club.city_from ? { city_from: club.city_from } : {}),
          ...(club.venueId ? { venueId: club.venueId } : {}),
          located: Boolean(where),
        },
      });
    }
    console.log(
      `  ${roster.source}: ${roster.clubs.length} clubs, ${located} geocoded`,
    );
  }

  const { kept, duplicates } = merge(rows);
  const noCoords = kept.filter((r) => r.lat == null).length;

  await saveCache();
  await writeFile(OUT_SQL, verify(toSql(kept, rosters), kept));
  await writeFile(
    OUT_SOURCES,
    JSON.stringify(
      Object.fromEntries(kept.map((r) => [r.slug, r.source])),
      null,
      2,
    ) + "\n",
  );

  console.log(
    `\n${kept.length} clubs from ${rosters.length} rosters, ` +
      `${duplicates} duplicates dropped, ${noCoords} without coordinates.`,
  );
  console.log(`Wrote ${OUT_SQL} and ${OUT_SOURCES}.`);
}

if (process.argv.includes("--selftest")) await selftest();
else await main();
