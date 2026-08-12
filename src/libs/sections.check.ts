/**
 * Self-check for the section marks. No test runner in this project:
 *   node src/libs/sections.check.ts
 *
 * The failure this guards against is silent: a mark class that names a colour
 * token which doesn't exist still compiles, still ships, and renders in
 * default ink. So the check reads index.css and holds every class string in
 * SECTIONS against the tokens actually declared there.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SECTIONS, type SectionId } from "./sections.ts";

const css = readFileSync(new URL("../index.css", import.meta.url), "utf8");

/** Every `--color-*` in the @theme block, which is what Tailwind turns into utilities. */
const tokens = new Set(
  [...css.matchAll(/--color-([a-z0-9-]+)\s*:/g)].map((m) => m[1]),
);

assert.ok(tokens.size > 10, "no colour tokens found — did index.css move?");

/** `text-mark-games` -> `mark-games`, `border-l-ink` -> `ink`. */
const tokenOf = (className: string) =>
  className.replace(/^(text|bg|border-l)-/, "");

for (const [id, section] of Object.entries(SECTIONS) as [
  SectionId,
  (typeof SECTIONS)[SectionId],
][]) {
  assert.equal(section.id, id, `${id}: id does not match its key`);

  for (const [field, className] of [
    ["mark", section.mark],
    ["markBg", section.markBg],
    ["markBorder", section.markBorder],
  ] as const) {
    // A template literal would already have been interpolated by now, so this
    // catches only the honest typo — but that is the one that happens.
    assert.match(
      className,
      /^(text|bg|border-l)-[a-z0-9-]+$/,
      `${id}.${field}: "${className}" is not a plain utility class`,
    );
    assert.ok(
      tokens.has(tokenOf(className)),
      `${id}.${field}: "${className}" needs --color-${tokenOf(className)} in index.css`,
    );
  }

  // The prefixes have to differ or two of the three fields are the same class.
  assert.ok(
    section.mark.startsWith("text-") &&
      section.markBg.startsWith("bg-") &&
      section.markBorder.startsWith("border-l-"),
    `${id}: mark/markBg/markBorder prefixes are crossed`,
  );
}

/** The four sections are meant to be told apart, so no two may share a hue. */
const hues = Object.values(SECTIONS)
  .filter((s) => s.id !== "home")
  .map((s) => s.mark);
assert.equal(new Set(hues).size, hues.length, "two sections share a mark hue");

console.log("sections.check.ts ok");
