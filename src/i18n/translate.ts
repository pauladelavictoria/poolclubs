/**
 * The dictionaries and the lookup, with no React in them — so a route's head,
 * an OG card and a push (all of which run where there is no provider) read the
 * same strings, with the same placeholders and plurals, as the app does.
 * useT in ./index.tsx is this plus the reader's language.
 */
import es from "./es.json";
import en from "./en.json";
import fr from "./fr.json";

/**
 * Keys are flat and dotted ("games.add"), not nested. A flat file gives
 * `keyof typeof es` for free, so a typo in a key is a build error and every
 * other dictionary is checked for missing keys — no recursive types, no
 * runtime lookup helper, no i18n dependency.
 *
 * Add a language: drop in <code>.json with the same keys, list it in LANGS.
 * Drill names, descriptions and ball labels are player-written data and stay
 * in whatever language they were entered.
 */
export type Key = keyof typeof es;

/** Native names — a language picker is read by people who can't read the current one. */
export const LANGS = [
  { code: "es", name: "Español", locale: "es-ES" },
  { code: "en", name: "English", locale: "en-GB" },
  { code: "fr", name: "Français", locale: "fr-FR" },
] as const;

export type Lang = (typeof LANGS)[number]["code"];

export const DICTS: Record<Lang, Record<Key, string>> = { es, en, fr };
export const FALLBACK: Lang = "es";

export type Vars = Record<string, string | number>;

/** `{name}` placeholders. An unknown name is left as-is rather than blanked. */
const fill = (text: string, vars?: Vars) =>
  vars
    ? text.replace(/\{(\w+)\}/g, (match, name) => String(vars[name] ?? match))
    : text;

/**
 * Plural forms. A key may ship siblings named for the CLDR categories the
 * language actually has — `key_one`, and `key_many` or `key_few` where a
 * language has them — and an `n` in the vars picks between them. The bare key
 * is the "other" form and the fallback for any category a translation did not
 * spell out, so adding a variant is additive and no existing key moves.
 *
 * Intl.PluralRules rather than `n === 1`, because the three languages disagree
 * about which numbers are singular: French counts zero as one ("0 joueur"),
 * Spanish and English do not ("0 jugadores", "0 players"). Hard-coding the
 * English rule is what produced "1 players" on every directory card.
 */
const RULES: Partial<Record<Lang, Intl.PluralRules>> = {};
const rules = (lang: Lang) =>
  (RULES[lang] ??= new Intl.PluralRules(
    LANGS.find((l) => l.code === lang)!.locale,
  ));

/**
 * The string for a key in one dictionary, plural variant applied.
 * `undefined` when the dictionary has neither, so the caller can fall through
 * to Spanish exactly as it did before.
 */
export const pick = (
  dict: Record<Key, string>,
  key: Key,
  lang: Lang,
  vars?: Vars,
): string | undefined => {
  if (typeof vars?.n === "number") {
    // The variant name is not a Key unless a dictionary declares it, which is
    // the whole point of looking it up rather than requiring it.
    const variant = (dict as Record<string, string | undefined>)[
      `${key}_${rules(lang).select(vars.n)}`
    ];
    if (variant !== undefined) return variant;
  }
  return dict[key];
};

/**
 * A key in one language: its plural variant when `n` is given, Spanish for a
 * key a translation has not caught up with, the key itself as a last resort.
 * An unknown `lang` (a stored value from an older build) reads as Spanish.
 */
export const translate = (lang: string, key: Key, vars?: Vars): string => {
  const known = (LANGS.some((l) => l.code === lang) ? lang : FALLBACK) as Lang;
  return fill(
    pick(DICTS[known], key, known, vars) ??
      pick(es, key, FALLBACK, vars) ??
      key,
    vars,
  );
};
