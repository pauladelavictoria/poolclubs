/**
 * Self-check for club slugs. No test runner in this project:
 *   node src/libs/slug.check.ts
 *
 * The point of these assertions is the SQL: every case below is also what
 * public.slugify() in sql/club-slug.sql must return. If you change one, change
 * both.
 */
import assert from "node:assert/strict";
import { RESERVED_SLUGS, isValidSlug, needsIdSuffix, slugify } from "./slug.ts";

// The ordinary case
assert.equal(slugify("Paula's Pool"), "paulas-pool");
assert.equal(slugify("Billar Union Club"), "billar-union-club");

// Accents fold to ASCII rather than turning into separators
assert.equal(slugify("Peña Billar"), "pena-billar");
assert.equal(slugify("Café Français"), "cafe-francais");
assert.equal(slugify("Åre Biljard"), "are-biljard");
assert.equal(slugify("Straße 8"), "strasse-8");

// Runs of punctuation collapse to one hyphen, and the ends are trimmed
assert.equal(slugify("  --Pool--  Hall!!  "), "pool-hall");
assert.equal(slugify("8-Ball / 9-Ball"), "8-ball-9-ball");

// A name with nothing usable in it still produces a valid slug, because the
// CHECK constraint requires a leading alphanumeric
assert.equal(slugify("!!!"), "club");
assert.equal(slugify(""), "club");

// Everything slugify produces satisfies the shape the database enforces
for (const name of ["Paula's Pool", "Peña", "!!!", "8-Ball / 9-Ball"]) {
  assert.equal(isValidSlug(slugify(name)), true, name);
}

// Reserved segments are the ones that would be shadowed by a static route
assert.equal(needsIdSuffix("login"), true);
assert.equal(needsIdSuffix("clubs"), true);
assert.equal(needsIdSuffix("paulas-pool"), false);
assert.equal(isValidSlug("login"), false);

// Shape rules
assert.equal(isValidSlug("-leading-hyphen"), false);
assert.equal(isValidSlug("Upper"), false);
assert.equal(isValidSlug("has space"), false);
assert.equal(isValidSlug("acentué"), false);
assert.equal(isValidSlug("1"), true);

// A club named after a reserved word slugifies onto it, which is exactly the
// case the id suffix exists for.
assert.equal(slugify("Clubs"), "clubs");
assert.equal(needsIdSuffix(slugify("Clubs")), true);

assert.ok(RESERVED_SLUGS.length > 0);

console.log("slug: ok");
