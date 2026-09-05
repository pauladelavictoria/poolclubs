/**
 * A club's slug: the club's name, made safe to put in a URL.
 *
 * `/app/paulas-pool/ranking` rather than `/app/12/ranking`. The slug is the
 * club's identity in every link, so it is generated once by the database (see
 * the trigger in sql/schema.sql) and never derived on the fly — renaming a
 * club must not break the URLs people have bookmarked.
 *
 * This file exists so the app can predict and validate what the database will
 * produce. The two implementations have to agree character for character, so
 * the accent map and the reserved list below are the same ones the SQL uses.
 * src/libs/slug.test.ts is what keeps them honest.
 */

/**
 * Accented letters folded to ASCII, so "Peña Billar" reads "pena-billar" and
 * not "pe-a-billar". A `translate()`-style 1:1 map rather than the `unaccent`
 * extension, which is not enabled on the project — and a fixed table is
 * something the SQL can mirror exactly.
 */
const ACCENTED = "àáäâãåāèéëêēìíïîīòóöôõøōùúüûūñçÿýž";
const PLAIN = "aaaaaaaeeeeeiiiiiooooooouuuuuncyyz";

/**
 * Path segments that are already routes, so a club can never own them:
 * /app/login, /app/join/$slug and /app/clubs/none are static siblings of
 * /app/$clubSlug, and a static segment wins. A club slugged "login" would be
 * permanently unreachable. "join" doubles as the invite route's own prefix,
 * since a club's slug is now what addresses /app/join/<slug>, and "new" is the
 * public /clubs/new sitting in front of /clubs/$slug.
 */
export const RESERVED_SLUGS = [
  "login",
  "logout",
  "join",
  "clubs",
  "me",
  "auth",
  "api",
  "new",
] as const;

/** What the database will store for a club called `name`, before the id suffix
 *  that collisions and reserved words get. */
export function slugify(name: string): string {
  const folded = name
    .toLowerCase()
    // ß is the one letter that widens rather than folds, so it goes first.
    .replace(/ß/g, "ss")
    .replace(/./g, (ch) => {
      const i = ACCENTED.indexOf(ch);
      return i === -1 ? ch : PLAIN[i];
    });

  const slug = folded
    // Apostrophes vanish rather than separating: "Paula's" is one word, so
    // "paulas-pool" and not "paula-s-pool".
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  // A name of nothing but punctuation still needs a slug, and it still has to
  // start with an alphanumeric. The id suffix makes it unique.
  return slug || "club";
}

/** True when the database would have to append an id to keep this usable. */
export function needsIdSuffix(slug: string): boolean {
  return (RESERVED_SLUGS as readonly string[]).includes(slug);
}

/** The shape the `clubs_slug_shape` CHECK constraint enforces. */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]*$/.test(slug) && !needsIdSuffix(slug);
}
