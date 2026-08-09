import { createContext, useContext, useEffect, useState } from "react";
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
// eslint-disable-next-line react-refresh/only-export-components
export const LANGS = [
  { code: "es", name: "Español", locale: "es-ES" },
  { code: "en", name: "English", locale: "en-GB" },
  { code: "fr", name: "Français", locale: "fr-FR" },
] as const;

export type Lang = (typeof LANGS)[number]["code"];

const DICTS: Record<Lang, Record<Key, string>> = { es, en, fr };
const FALLBACK: Lang = "es";
const STORAGE_KEY = "lang";

const isLang = (value: string | null | undefined): value is Lang =>
  LANGS.some((l) => l.code === value);

/**
 * A stored language is a choice and always wins. Otherwise walk the browser's
 * preference list in order — someone set to ["ca-ES", "fr", "es"] gets French,
 * not the fallback, which reading `navigator.language` alone would miss.
 */
function detect(): Lang {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (isLang(saved)) return saved;
  for (const tag of navigator.languages ?? [navigator.language]) {
    const code = tag.slice(0, 2);
    if (isLang(code)) return code;
  }
  return FALLBACK;
}

type Vars = Record<string, string | number>;

/** `{name}` placeholders. An unknown name is left as-is rather than blanked. */
const fill = (text: string, vars?: Vars) =>
  vars
    ? text.replace(/\{(\w+)\}/g, (match, name) => String(vars[name] ?? match))
    : text;

type I18n = {
  lang: Lang;
  /** BCP 47 tag for Intl / toLocaleString */
  locale: string;
  setLang: (lang: Lang) => void;
  t: (key: Key, vars?: Vars) => string;
};

const I18nContext = createContext<I18n>({
  lang: FALLBACK,
  locale: "es-ES",
  setLang: () => {},
  t: (key, vars) => fill(es[key], vars),
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>(detect);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // Only an explicit pick is stored. Writing the detected value here too would
  // pin the first visit's guess forever, even after the browser's own
  // preferences change.
  const chooseLang = (next: Lang) => {
    localStorage.setItem(STORAGE_KEY, next);
    setLang(next);
  };

  const dict = DICTS[lang];

  return (
    <I18nContext.Provider
      value={{
        lang,
        locale: LANGS.find((l) => l.code === lang)!.locale,
        setLang: chooseLang,
        // Fall back to Spanish for a key a translation hasn't caught up with
        t: (key, vars) => fill(dict[key] ?? es[key] ?? key, vars),
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useT = () => useContext(I18nContext);
