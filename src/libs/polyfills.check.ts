/**
 * Self-check for the old-tablet shims. No test runner in this project:
 *   node src/libs/polyfills.check.ts
 *
 * Node has all four natives, so the module under test would no-op and assert
 * nothing about its own code. The natives are deleted first and the import is
 * dynamic — a static one hoists above the deletions and the shims never install.
 */
import assert from "node:assert/strict";

const nativeArrayAt = Array.prototype.at;
const nativeStringAt = String.prototype.at;
const nativeHasOwn = Object.hasOwn;
const nativeClone = globalThis.structuredClone;

// @ts-expect-error — removing a lib.dom/lib.es2022 member on purpose
delete Array.prototype.at;
// @ts-expect-error — same
delete String.prototype.at;
// @ts-expect-error — same
delete Object.hasOwn;
// @ts-expect-error — same
delete globalThis.structuredClone;

await import("./polyfills.ts");

assert.notEqual(Array.prototype.at, nativeArrayAt, "the shim did not install");

// The reason the shim exists: .at(-1) on the breadcrumb trail
assert.equal([1, 2, 3].at(-1), 3);
assert.equal([1, 2, 3].at(0), 1);
assert.equal([1, 2, 3].at(-3), 1);

// Out of range both ways is undefined, not a throw — every call site leans on
// this, since `crumbs.at(-1)` on an empty trail has to be falsy
assert.equal([].at(-1), undefined);
assert.equal([1, 2, 3].at(3), undefined);
assert.equal([1, 2, 3].at(-4), undefined);

// Truncation and coercion, matching the native
assert.equal([1, 2, 3].at(1.7), 2);
assert.equal([1, 2, 3].at(-1.7), 3);
assert.equal([1, 2, 3].at(NaN), 1);
assert.equal(([1, 2, 3] as unknown as { at(i?: unknown): number }).at(), 1);

assert.equal("abc".at(-1), "c");
assert.equal("abc".at(9), undefined);

// Enumerable:false is the whole reason defineProperty is used — a plain
// assignment would put "at" into every for...in over an array
assert.deepEqual(Object.keys([1, 2, 3]), ["0", "1", "2"]);
for (const key in [1, 2, 3]) assert.notEqual(key, "at");

// Object.hasOwn: own properties only, and it survives a null-prototype object,
// which is the case that makes `obj.hasOwnProperty(k)` throw
assert.equal(Object.hasOwn({ a: 1 }, "a"), true);
assert.equal(Object.hasOwn({ a: undefined }, "a"), true);
assert.equal(Object.hasOwn({}, "toString"), false);
assert.equal(Object.hasOwn(Object.assign(Object.create(null), { a: 1 }), "a"), true);

// structuredClone: a real copy, not the same reference
const source = { a: 1, nested: { b: [1, 2] } };
const copy = structuredClone(source);
assert.deepEqual(copy, source);
assert.notEqual(copy.nested, source.nested);

// The Error branch — maplibre's worker sends failures across this path, and
// JSON.stringify(new Error("x")) is "{}", which is why it is special-cased
const cloned = structuredClone(new TypeError("boom"));
assert.equal(cloned.message, "boom");
assert.equal(cloned.name, "TypeError");
assert.ok(cloned instanceof TypeError);

assert.equal(structuredClone(undefined), undefined);
assert.equal(structuredClone(null), null);

// ponytail: the documented ceiling, asserted so it fails loudly if a call site
// ever starts passing one of these rather than silently losing data.
assert.notEqual(structuredClone(new Date(0)) as unknown, 0);
assert.deepEqual(structuredClone(new Map([["a", 1]])), {});

Array.prototype.at = nativeArrayAt;
String.prototype.at = nativeStringAt;
Object.hasOwn = nativeHasOwn;
globalThis.structuredClone = nativeClone;

console.log("polyfills: ok");
