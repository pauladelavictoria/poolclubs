/**
 * Self-check for the dictionaries. No test runner in this project:
 *   node src/i18n/i18n.check.ts
 *
 * Missing keys are already a build error (each dictionary is typed
 * Record<Key, string>); this catches what the types can't: stray keys a
 * translation gained and Spanish never had, and placeholders that don't line
 * up between languages — a `{name}` dropped in translation renders nothing.
 */
import assert from "node:assert/strict";
import es from "./es.json" with { type: "json" };
import en from "./en.json" with { type: "json" };
import fr from "./fr.json" with { type: "json" };

const dicts = { en, fr } as Record<string, Record<string, string>>;
const base = es as Record<string, string>;
const placeholders = (text: string) =>
  (text.match(/\{(\w+)\}/g) ?? []).sort().join(",");

for (const [lang, dict] of Object.entries(dicts)) {
  assert.deepEqual(
    Object.keys(dict).filter((k) => !(k in base)),
    [],
    `${lang}.json has keys es.json doesn't`,
  );
  assert.deepEqual(
    Object.keys(base).filter((k) => !(k in dict)),
    [],
    `${lang}.json is missing keys`,
  );
  for (const key of Object.keys(base)) {
    assert.equal(
      placeholders(dict[key]),
      placeholders(base[key]),
      `${lang}.json "${key}" has different placeholders than es.json`,
    );
  }
}

console.log("i18n dictionaries agree");
