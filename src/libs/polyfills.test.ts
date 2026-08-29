/**
 * Node/jsdom has all four natives, so the module under test would no-op and
 * assert nothing about its own code. The natives are deleted first and the
 * import is dynamic — a static one hoists above the deletions and the shims
 * never install.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

let nativeArrayAt: typeof Array.prototype.at;
let nativeStringAt: typeof String.prototype.at;
let nativeHasOwn: typeof Object.hasOwn;
let nativeClone: typeof globalThis.structuredClone;

beforeAll(async () => {
  nativeArrayAt = Array.prototype.at;
  nativeStringAt = String.prototype.at;
  nativeHasOwn = Object.hasOwn;
  nativeClone = globalThis.structuredClone;

  // @ts-expect-error — removing a lib.dom/lib.es2022 member on purpose
  delete Array.prototype.at;
  // @ts-expect-error — same
  delete String.prototype.at;
  // @ts-expect-error — same
  delete Object.hasOwn;
  // @ts-expect-error — same
  delete globalThis.structuredClone;

  await import("./polyfills");
});

afterAll(() => {
  Array.prototype.at = nativeArrayAt;
  String.prototype.at = nativeStringAt;
  Object.hasOwn = nativeHasOwn;
  globalThis.structuredClone = nativeClone;
});

it("installs the shim once the natives are gone", () => {
  expect(Array.prototype.at).not.toBe(nativeArrayAt);
});

describe("Array/String.prototype.at shim", () => {
  it("is the reason the shim exists: .at(-1) on the breadcrumb trail", () => {
    expect([1, 2, 3].at(-1)).toBe(3);
    expect([1, 2, 3].at(0)).toBe(1);
    expect([1, 2, 3].at(-3)).toBe(1);
  });

  it("returns undefined out of range both ways, not a throw — every call site leans on this, since crumbs.at(-1) on an empty trail has to be falsy", () => {
    expect([].at(-1)).toBeUndefined();
    expect([1, 2, 3].at(3)).toBeUndefined();
    expect([1, 2, 3].at(-4)).toBeUndefined();
  });

  it("truncates and coerces its argument, matching the native", () => {
    expect([1, 2, 3].at(1.7)).toBe(2);
    expect([1, 2, 3].at(-1.7)).toBe(3);
    expect([1, 2, 3].at(NaN)).toBe(1);
    expect(
      ([1, 2, 3] as unknown as { at(i?: unknown): number }).at(),
    ).toBe(1);
  });

  it("works on strings too", () => {
    expect("abc".at(-1)).toBe("c");
    expect("abc".at(9)).toBeUndefined();
  });

  it("is enumerable:false — the whole reason defineProperty is used, since a plain assignment would put 'at' into every for...in over an array", () => {
    expect(Object.keys([1, 2, 3])).toEqual(["0", "1", "2"]);
    for (const key in [1, 2, 3]) expect(key).not.toBe("at");
  });
});

describe("Object.hasOwn shim", () => {
  it("checks own properties only, and survives a null-prototype object, which is the case that makes obj.hasOwnProperty(k) throw", () => {
    expect(Object.hasOwn({ a: 1 }, "a")).toBe(true);
    expect(Object.hasOwn({ a: undefined }, "a")).toBe(true);
    expect(Object.hasOwn({}, "toString")).toBe(false);
    expect(
      Object.hasOwn(Object.assign(Object.create(null), { a: 1 }), "a"),
    ).toBe(true);
  });
});

describe("structuredClone shim", () => {
  it("makes a real copy, not the same reference", () => {
    const source = { a: 1, nested: { b: [1, 2] } };
    const copy = structuredClone(source);
    expect(copy).toEqual(source);
    expect(copy.nested).not.toBe(source.nested);
  });

  it("special-cases Error, since maplibre's worker sends failures across this path and JSON.stringify(new Error('x')) is '{}'", () => {
    const cloned = structuredClone(new TypeError("boom"));
    expect(cloned.message).toBe("boom");
    expect(cloned.name).toBe("TypeError");
    expect(cloned).toBeInstanceOf(TypeError);
  });

  it("passes through undefined and null", () => {
    expect(structuredClone(undefined)).toBeUndefined();
    expect(structuredClone(null)).toBeNull();
  });

  // ponytail: the documented ceiling, asserted so it fails loudly if a call
  // site ever starts passing one of these rather than silently losing data.
  it("has a documented ceiling: Map does not survive the round trip", () => {
    expect(structuredClone(new Date(0)) as unknown).not.toBe(0);
    expect(structuredClone(new Map([["a", 1]]))).toEqual({});
  });
});
