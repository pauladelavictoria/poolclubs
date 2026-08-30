/**
 * Missing keys are already a build error (each dictionary is typed
 * Record<Key, string>); this catches what the types can't: stray keys a
 * translation gained and Spanish never had, and placeholders that don't line
 * up between languages — a `{name}` dropped in translation renders nothing.
 */
import { describe, expect, it } from "vitest";
import es from "./es.json" with { type: "json" };
import en from "./en.json" with { type: "json" };
import fr from "./fr.json" with { type: "json" };

const dicts = { en, fr } as Record<string, Record<string, string>>;
const base = es as Record<string, string>;
const placeholders = (text: string) =>
  (text.match(/\{(\w+)\}/g) ?? []).sort().join(",");

describe.each(Object.entries(dicts))("%s.json", (lang, dict) => {
  it(`${lang}.json has no keys es.json doesn't`, () => {
    expect(Object.keys(dict).filter((k) => !(k in base))).toEqual([]);
  });

  it(`${lang}.json is missing no keys es.json has`, () => {
    expect(Object.keys(base).filter((k) => !(k in dict))).toEqual([]);
  });

  it(`${lang}.json agrees with es.json on every placeholder`, () => {
    const mismatches = Object.keys(base).filter(
      (key) => placeholders(dict[key]) !== placeholders(base[key]),
    );
    expect(mismatches).toEqual([]);
  });
});
