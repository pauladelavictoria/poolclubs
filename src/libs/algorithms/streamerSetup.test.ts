import { describe, expect, it } from "vitest";
import { streamerFiles } from "./streamerSetup";

const tables = ["Mesa 1", "Pepe's & Co", "100%"];
const file = (os: Parameters<typeof streamerFiles>[0], i = 0) =>
  streamerFiles(os, tables)[i].content;

describe("streamerFiles", () => {
  it("windows: one start line per table, % escaped, CRLF", () => {
    const all = file("windows", 1);
    expect(all).toContain(
      'start "Mesa 1" /min "C:\\PoolClubs\\start-table.bat" "Mesa 1"',
    );
    expect(all).toContain('"100%%"');
    expect(all.split("\r\n").every((line) => !line.includes("\n"))).toBe(true);
    expect(file("windows")).toContain('--collection "PoolClubs"');
  });

  it("mac: a LaunchAgent per table, names quoted for the shell and escaped for XML", () => {
    const script = file("mac");
    expect(script).toContain("add 'app.poolclubs.obs.mesa-1' 'Mesa 1'");
    expect(script).toContain(
      "add 'app.poolclubs.obs.pepe-s-co' 'Pepe'\\''s &amp; Co'",
    );
  });

  it("linux: every table enabled as an obs@ instance", () => {
    expect(file("linux")).toContain(
      "for t in 'Mesa 1' 'Pepe'\\''s & Co' '100%'; do",
    );
  });
});
