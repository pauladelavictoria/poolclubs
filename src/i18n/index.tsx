import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
} from "react";
import {
  LANG_COOKIE,
  readPreferredLangs,
  readPref,
  writePref,
} from "@/libs/prefs";
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

const isLang = (value: string | null | undefined): value is Lang =>
  LANGS.some((l) => l.code === value);

const EVENT = "langchange";

/**
 * A stored language is a choice and always wins, and it is in a cookie so the
 * server picks the same dictionary the client will — otherwise every translated
 * string on the page would be a hydration mismatch.
 *
 * Without a cookie, walk the browser's preference list in order: someone set to
 * ["ca-ES", "fr", "es"] gets French, not the fallback, which reading
 * `navigator.language` alone would miss.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function detectLang(): Lang {
  const saved = readPref(LANG_COOKIE);
  if (isLang(saved)) return saved;
  for (const tag of readPreferredLangs()) {
    const code = tag.slice(0, 2);
    if (isLang(code)) return code;
  }
  return FALLBACK;
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
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
  // A store rather than state, the same shape libs/theme.ts uses: the language
  // can change under us (the picker below) and the server needs its own snapshot.
  // Both snapshots are the same function now that the server reads
  // Accept-Language — so there is nothing for React to reconcile.
  const lang = useSyncExternalStore(subscribe, detectLang, detectLang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // Only an explicit pick is stored. Writing the detected value here too would
  // pin the first visit's guess forever, even after the browser's own
  // preferences change.
  const chooseLang = (next: Lang) => {
    writePref(LANG_COOKIE, next);
    window.dispatchEvent(new Event(EVENT));
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
