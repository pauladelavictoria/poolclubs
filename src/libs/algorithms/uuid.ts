/**
 * A v4 uuid, on a tablet that is not on https.
 *
 * `crypto.randomUUID` is secure-context only, so it is simply missing on a
 * device opening the dev server at http://192.168.x.x — which is exactly how a
 * tablet on a rail gets tested. It throws a TypeError before any request is
 * made, which surfaces as a failure with no database error behind it.
 *
 * `crypto.getRandomValues` carries no such restriction, so the fallback is the
 * same sixteen random bytes with the version and variant bits set by hand.
 * Same shape, same collision odds, one less requirement.
 */
export function uuid(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10xx

  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}
