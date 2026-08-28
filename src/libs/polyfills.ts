/**
 * Runtime APIs an old Android tablet's Chrome does not have.
 *
 * Distinct from Vite's `build.target` (see vite.config.ts), which only rewrites
 * *syntax* — it will happily ship a call to a method the browser never had. That
 * is the "X is not a function" the tablet reported, and only a shim fixes it.
 *
 * Most of the calls are not ours. Scanning a production build turned these up in
 * maplibre-gl, recharts, zod, supabase-js and react-hook-form, which is why
 * removing our own uses would not have been enough on its own.
 *
 * Imported first in router.tsx, so it runs once per page load in the browser and
 * once per request on the server, where every guard below is already satisfied
 * and the whole file is a no-op.
 *
 * crypto.randomUUID is deliberately absent: libs/uuid.ts already falls back to
 * crypto.getRandomValues, which keeps real entropy. A shim here would be worse.
 */

// Array.prototype.at / String.prototype.at — Chrome 92.
// defineProperty rather than assignment: a plain `Array.prototype.at = ...` is
// enumerable, and then every `for...in` over an array in the app yields "at".
function defineAt(proto: object) {
  Object.defineProperty(proto, "at", {
    value: function at(this: { length: number }, index: number) {
      const i = Math.trunc(index) || 0;
      return (this as never)[i < 0 ? this.length + i : i];
    },
    writable: true,
    configurable: true,
    enumerable: false,
  });
}

if (!Array.prototype.at) defineAt(Array.prototype);
if (!String.prototype.at) defineAt(String.prototype);

// Object.hasOwn — Chrome 93.
if (!Object.hasOwn) {
  Object.defineProperty(Object, "hasOwn", {
    value: (target: object, key: PropertyKey) =>
      Object.prototype.hasOwnProperty.call(target, key),
    writable: true,
    configurable: true,
    enumerable: false,
  });
}

// structuredClone — Chrome 98. Reached through recharts and maplibre, both of
// which pass plain data, plus an Error on maplibre's worker error path.
//
// ponytail: JSON round-trip. Ceiling is real — it drops cycles, Map, Set, Date
// (becomes a string), typed arrays and Blobs, and throws on a cycle where the
// native one would not. Nothing in this app's clone paths carries those today.
// Upgrade path if that stops being true: @ungap/structured-clone.
if (typeof globalThis.structuredClone !== "function") {
  globalThis.structuredClone = ((value: unknown) => {
    if (value instanceof Error) {
      const copy = new (value.constructor as ErrorConstructor)(value.message);
      copy.name = value.name;
      copy.stack = value.stack;
      return copy;
    }
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }) as typeof structuredClone;
}
