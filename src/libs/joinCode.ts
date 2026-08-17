/**
 * A fresh invite code.
 *
 * Same shape as the column default in sql/schema.sql — `encode(gen_random_bytes(6),
 * 'hex')` — because rotating a code is an UPDATE, and PostgREST has no way to say
 * "set this back to the default". The two have to agree: a code of a different
 * length would still work, but the ones on the wall and the ones in the database
 * would stop looking like the same thing.
 *
 * crypto.getRandomValues, not Math.random: this is the revocation half of a
 * printed QR poster, and a guessable code is not a revocation.
 */
export const newJoinCode = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
