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
import {
  FALLBACK,
  LANGS,
  translate,
  type Key,
  type Lang,
  type Vars,
} from "./translate";

// eslint-disable-next-line react-refresh/only-export-components
export { LANGS, pick, translate } from "./translate";
export type { Key, Lang } from "./translate";

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
  t: (key, vars) => translate(FALLBACK, key, vars),
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // A store rather than state, the same shape libs/theme/theme.ts uses: the language
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

  return (
    <I18nContext.Provider
      value={{
        lang,
        locale: LANGS.find((l) => l.code === lang)!.locale,
        setLang: chooseLang,
        t: (key, vars) => translate(lang, key, vars),
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useT = () => useContext(I18nContext);
