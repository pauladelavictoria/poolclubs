/**
 * Self-check for the invite code and the poster's QR. No test runner in this
 * project:
 *   node src/libs/joinCode.check.ts
 *
 * Both halves of the poster are here because both fail silently. A code of the
 * wrong shape is accepted by the column and only breaks the join link; a QR that
 * encodes the wrong string prints, scans, and takes forty members nowhere.
 */
import assert from "node:assert/strict";
import { encode, renderSVG } from "uqr";
import { newJoinCode } from "./joinCode.ts";

const code = newJoinCode();
assert.match(code, /^[0-9a-f]{12}$/, "12 hex chars, like the column default");

// Not a distribution test — just that this is not returning a constant, which is
// the way a broken CSPRNG call would show up.
const codes = new Set(Array.from({ length: 200 }, newJoinCode));
assert.equal(codes.size, 200, "every code differs");

const link = `https://poolclubs.app/app/join/${code}`;
const svg = renderSVG(link, { ecc: "M", border: 4, pixelSize: 1 });
assert.match(svg, /^<svg /, "renderSVG returns markup, not a data URI");
const openTag = svg.slice(0, svg.indexOf(">") + 1);
assert.ok(
  !openTag.includes("width="),
  `no intrinsic width on <svg>, so the poster can scale it: ${openTag}`,
);
// The quiet zone is the thing that breaks scanning silently: with too little
// white around it, a phone reads the symbol, decodes garbage, and offers to copy
// text instead of to open a link. viewBox = symbol + 4 modules a side.
//
// `border: 0` for the reference measurement: uqr's own `size` counts the border
// in, and its default is 1 — which is what shipped first and is exactly the bug
// this asserts against.
const size = Number(svg.match(/viewBox="0 0 (\d+)/)?.[1]);
const symbol = encode(link, { ecc: "M", border: 0 }).size;
assert.equal(size, symbol + 8, "four modules of quiet zone on every side");
// A URL this long cannot fit in a version-1 (21×21) symbol; if it ever renders
// that small, something is encoding a different string.
assert.ok(symbol >= 29, `symbol looks too small for the link: ${symbol}`);

console.log("joinCode: ok");
